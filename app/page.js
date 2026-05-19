"use client";

import { useCallback, useEffect, useState } from "react";
import { deduplicateStudents } from "@/lib/deduplicate";
import { deserializeDataset } from "@/lib/datasetSerialize";
import { isClubWorxRoster } from "@/lib/rosterSource";
import {
  fetchRoster,
  syncRosterFromClubWorx,
  fetchSyncStatus,
  fetchGradingOverrides,
  updateStudentGiSize,
} from "@/lib/rosterClient";
import { formatDate, parseDate } from "@/lib/dates";
import GradingDashboard from "@/components/GradingDashboard";
import SharePanel from "@/components/SharePanel";
import PageHeader from "@/components/PageHeader";

const emptyDataset = () => ({
  students: [],
  fileName: null,
  error: null,
  savedAt: null,
  duplicatesRemoved: 0,
});

function normalizeLoaded(loaded) {
  const { students, duplicatesRemoved } = deduplicateStudents(
    loaded.students || []
  );
  return {
    students,
    fileName: loaded.fileName,
    error: null,
    savedAt: loaded.savedAt ?? null,
    duplicatesRemoved,
  };
}

function rosterFromApiPayload(remote) {
  return {
    adults: normalizeLoaded(deserializeDataset(remote.adults)),
    kids: normalizeLoaded(deserializeDataset(remote.kids)),
  };
}

export default function Home() {
  const [adults, setAdults] = useState(emptyDataset);
  const [kids, setKids] = useState(emptyDataset);
  const [hydrated, setHydrated] = useState(false);
  const [syncPassword, setSyncPassword] = useState("");
  const [cloudStatus, setCloudStatus] = useState("loading");
  const [cloudError, setCloudError] = useState("");
  const [clubworxConfigured, setClubworxConfigured] = useState(false);
  const [postgresConfigured, setPostgresConfigured] = useState(false);
  const [clubworxSyncing, setClubworxSyncing] = useState(false);
  const [clubworxMessage, setClubworxMessage] = useState("");
  const [clubworxError, setClubworxError] = useState("");
  const [gradingOverrides, setGradingOverrides] = useState({
    adults: {},
    kids: {},
  });

  const applyRoster = useCallback((nextAdults, nextKids) => {
    setAdults(nextAdults);
    setKids(nextKids);
  }, []);

  const reloadFromDatabase = useCallback(async () => {
    const remote = await fetchRoster();
    if (!remote.ok || !remote.configured) {
      return { ok: false, error: remote.error || "Database not available" };
    }
    const { adults: nextAdults, kids: nextKids } = rosterFromApiPayload(remote);
    applyRoster(nextAdults, nextKids);
    setCloudStatus("synced");
    return { ok: true, adults: nextAdults, kids: nextKids };
  }, [applyRoster]);

  const runClubWorxSync = useCallback(
    async (options = {}) => {
      const { silent = false } = options;
      if (!silent) {
        setClubworxSyncing(true);
        setClubworxError("");
        setClubworxMessage("");
      }

      const sync = await syncRosterFromClubWorx({
        password: syncPassword || undefined,
      });

      if (!sync.ok) {
        if (!silent) {
          setClubworxError(sync.error || "ClubWorx sync failed");
          setClubworxSyncing(false);
        }
        return { ok: false, error: sync.error };
      }

      const reload = await reloadFromDatabase();
      if (!reload.ok) {
        if (!silent) {
          setClubworxError(
            reload.error || "Synced to database but could not reload roster"
          );
          setClubworxSyncing(false);
        }
        return { ok: false, error: reload.error };
      }

      if (!silent) {
        setClubworxMessage(
          `Synced ${sync.adultsCount} adults and ${sync.kidsCount} kids from ClubWorx.`
        );
        setClubworxSyncing(false);
      }

      return { ok: true, ...sync };
    },
    [syncPassword, reloadFromDatabase]
  );

  useEffect(() => {
    async function load() {
      setCloudError("");
      const syncStatus = await fetchSyncStatus();
      const hasClubworx = Boolean(syncStatus.clubworxConfigured);
      const hasPostgres = Boolean(syncStatus.postgresConfigured);
      setClubworxConfigured(hasClubworx);
      setPostgresConfigured(hasPostgres);

      if (!hasPostgres) {
        setCloudStatus("local-only");
        applyRoster(emptyDataset(), emptyDataset());
        setHydrated(true);
        return;
      }

      if (!hasClubworx) {
        setCloudStatus("error");
        setCloudError(
          "ClubWorx is not configured. Set CLUBWORX_ACCOUNT_KEY on the server."
        );
        applyRoster(emptyDataset(), emptyDataset());
        setHydrated(true);
        return;
      }

      const remote = await fetchRoster();
      if (!remote.ok) {
        setCloudStatus("error");
        setCloudError(remote.error || "Could not load roster");
        setHydrated(true);
        return;
      }

      const { adults: nextAdults, kids: nextKids } = rosterFromApiPayload(remote);
      const rosterEmpty =
        !nextAdults.students.length && !nextKids.students.length;

      if (rosterEmpty) {
        setClubworxSyncing(true);
        const sync = await syncRosterFromClubWorx();
        if (sync.ok) {
          const reload = await fetchRoster();
          if (reload.ok && reload.configured) {
            const loaded = rosterFromApiPayload(reload);
            applyRoster(loaded.adults, loaded.kids);
            setCloudStatus("synced");
            setClubworxMessage(
              `Loaded ${sync.adultsCount} adults and ${sync.kidsCount} kids from ClubWorx.`
            );
          }
        } else {
          setClubworxError(
            sync.error ||
              "No roster in the database yet. Use Sync from ClubWorx to load members."
          );
        }
        setClubworxSyncing(false);
      } else {
        applyRoster(nextAdults, nextKids);
        setCloudStatus("synced");
      }

      const overridesRes = await fetchGradingOverrides();
      if (overridesRes.ok) {
        setGradingOverrides({
          adults: overridesRes.adults || {},
          kids: overridesRes.kids || {},
        });
      }

      setHydrated(true);
    }

    load();
    // Initial load only — manual refresh uses runClubWorxSync
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyRoster]);

  const hasAnyData = adults.students.length > 0 || kids.students.length > 0;

  const lastSyncedLabel = (() => {
    const times = [adults.savedAt, kids.savedAt]
      .map((t) => (t ? parseDate(t) : null))
      .filter(Boolean);
    if (!times.length) return null;
    const latest = new Date(Math.max(...times.map((d) => d.getTime())));
    return formatDate(latest);
  })();

  const dataSourceLabel =
    isClubWorxRoster(adults.fileName) || isClubWorxRoster(kids.fileName)
      ? "ClubWorx member styles"
      : adults.fileName || kids.fileName;

  if (!hydrated) {
    return (
      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 overflow-x-clip px-4 py-8 sm:px-6">
        <p className="text-center text-zinc-500">Loading roster from ClubWorx…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full min-w-0 max-w-6xl flex-1 overflow-x-clip px-4 py-8 sm:px-6">
      <PageHeader title="BJJ grading report">
        <p className="mt-2 max-w-2xl text-zinc-600">
          Belt ranks are loaded from ClubWorx and stored in the cloud so every
          coach sees the same grading report on any device.
        </p>
        {cloudStatus === "synced" && hasAnyData && (
          <p className="mt-2 text-sm text-green-800">
            Showing synced ClubWorx data
            {lastSyncedLabel ? ` · last updated ${lastSyncedLabel}` : ""}.
          </p>
        )}
        {cloudStatus === "local-only" && (
          <p className="mt-2 text-sm text-amber-800">
            Database not configured. Add Vercel Postgres, run scripts/init-db.sql,
            and set CLUBWORX_ACCOUNT_KEY to use the grading report.
          </p>
        )}
        {(cloudStatus === "error" || clubworxError) && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {clubworxError || cloudError}
          </p>
        )}
        {dataSourceLabel && hasAnyData && cloudStatus === "synced" && (
          <p className="mt-2 text-sm text-zinc-500">Source: {dataSourceLabel}</p>
        )}
      </PageHeader>

      {clubworxConfigured && postgresConfigured && (
        <section className="mb-6 min-w-0 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-semibold text-zinc-900">
            Refresh from ClubWorx
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Pull the latest belt ranks for all active members into the Adults and
            Kids rosters.
          </p>
          <button
            type="button"
            onClick={() => runClubWorxSync()}
            disabled={clubworxSyncing || cloudStatus === "loading"}
            className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 sm:w-auto"
          >
            {clubworxSyncing ? "Syncing from ClubWorx…" : "Sync from ClubWorx"}
          </button>
          {clubworxMessage && (
            <p className="mt-2 text-sm text-green-800">{clubworxMessage}</p>
          )}
        </section>
      )}

      {postgresConfigured && (
        <section className="mb-6 min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
          <label className="block text-sm">
            <span className="font-medium text-zinc-800">
              Sync password (if your admin set one)
            </span>
            <span className="mt-0.5 block text-zinc-500">
              Required to refresh roster data from ClubWorx when configured.
            </span>
            <input
              type="password"
              value={syncPassword}
              onChange={(e) => setSyncPassword(e.target.value)}
              placeholder="Optional"
              className="mt-2 w-full max-w-sm rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              autoComplete="off"
            />
          </label>
        </section>
      )}

      {hasAnyData && (
        <SharePanel
          adults={adults}
          kids={kids}
          disabled={!hasAnyData}
          password={syncPassword}
          onPasswordChange={setSyncPassword}
        />
      )}

      <GradingDashboard
        adults={adults}
        kids={kids}
        dataSource="clubworx"
        syncPassword={syncPassword}
        gradingOverrides={gradingOverrides}
        onGradingOverridesChange={setGradingOverrides}
        onGiSizeSave={async (cat, student, beltSize) => {
          if (!student.memberStyleId) {
            return { ok: false, error: "Missing ClubWorx member style id" };
          }
          const result = await updateStudentGiSize({
            memberStyleId: student.memberStyleId,
            category: cat,
            contactKey: student.contactKey,
            beltSize,
            password: syncPassword || undefined,
          });
          if (result.ok) {
            const setDataset = cat === "adults" ? setAdults : setKids;
            setDataset((prev) => ({
              ...prev,
              students: prev.students.map((s) =>
                s.memberStyleId === student.memberStyleId ||
                s.contactKey === student.contactKey
                  ? { ...s, beltSize }
                  : s
              ),
            }));
          }
          return result;
        }}
        emptyMessage={
          clubworxConfigured && postgresConfigured
            ? "No members yet. Use Sync from ClubWorx above to load belt ranks."
            : "Configure the database and ClubWorx API to load the grading report."
        }
      />
    </main>
  );
}
