"use client";

import { useCallback, useEffect, useState } from "react";
import { parseExcelFile } from "@/lib/parseExcel";
import { deduplicateStudents } from "@/lib/deduplicate";
import {
  saveDataset,
  loadDataset,
  clearSavedDataset,
  clearAllSavedData,
} from "@/lib/storage";
import { deserializeDataset } from "@/lib/datasetSerialize";
import {
  fetchRoster,
  saveRosterToCloud,
  mergeDataset,
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

export default function Home() {
  const [adults, setAdults] = useState(emptyDataset);
  const [kids, setKids] = useState(emptyDataset);
  const [hydrated, setHydrated] = useState(false);
  const [uploadPassword, setUploadPassword] = useState("");
  const [cloudStatus, setCloudStatus] = useState("loading");
  const [cloudError, setCloudError] = useState("");

  const syncToCloud = useCallback(
    async (adultsData, kidsData) => {
      setCloudError("");
      const result = await saveRosterToCloud({
        adults: adultsData,
        kids: kidsData,
        password: uploadPassword || undefined,
      });
      if (result.ok) {
        setCloudStatus("synced");
        return true;
      }
      setCloudStatus("error");
      setCloudError(result.error || "Could not save to cloud");
      return false;
    },
    [uploadPassword]
  );

  useEffect(() => {
    async function load() {
      const localAdults = loadDataset("adults");
      const localKids = loadDataset("kids");

      let nextAdults = localAdults?.students?.length
        ? normalizeLoaded(localAdults)
        : emptyDataset();
      let nextKids = localKids?.students?.length
        ? normalizeLoaded(localKids)
        : emptyDataset();

      const remote = await fetchRoster();
      if (remote.ok && remote.configured) {
        const remoteAdults = normalizeLoaded(deserializeDataset(remote.adults));
        const remoteKids = normalizeLoaded(deserializeDataset(remote.kids));
        nextAdults = mergeDataset(nextAdults, remoteAdults);
        nextKids = mergeDataset(nextKids, remoteKids);
        setCloudStatus("synced");
      } else if (remote.ok && !remote.configured) {
        setCloudStatus("local-only");
      } else if (!remote.ok && remote.configured === false) {
        setCloudStatus("local-only");
      } else {
        setCloudStatus("local-only");
        if (remote.error) setCloudError(remote.error);
      }

      setAdults(nextAdults);
      setKids(nextKids);
      setHydrated(true);
    }

    load();
  }, []);

  async function handleUpload(category, file) {
    const setDataset = category === "adults" ? setAdults : setKids;
    setDataset({
      students: [],
      fileName: file.name,
      error: null,
      savedAt: null,
      duplicatesRemoved: 0,
    });

    const { students, error, duplicatesRemoved = 0 } = await parseExcelFile(file);
    if (error) {
      setDataset({
        students: [],
        fileName: null,
        error,
        savedAt: null,
        duplicatesRemoved: 0,
      });
      clearSavedDataset(category);
      return;
    }

    const dataset = {
      students,
      fileName: file.name,
      error: null,
      savedAt: new Date().toISOString(),
      duplicatesRemoved,
    };

    const nextAdults = category === "adults" ? dataset : adults;
    const nextKids = category === "kids" ? dataset : kids;

    setAdults(category === "adults" ? dataset : adults);
    setKids(category === "kids" ? dataset : kids);
    saveDataset(category, dataset);

    await syncToCloud(nextAdults, nextKids);
  }

  async function clearDataset(category) {
    const setDataset = category === "adults" ? setAdults : setKids;
    const empty = emptyDataset();
    setDataset(empty);
    clearSavedDataset(category);

    const nextAdults = category === "adults" ? empty : adults;
    const nextKids = category === "kids" ? empty : kids;
    await syncToCloud(nextAdults, nextKids);
  }

  async function clearAllData() {
    const empty = emptyDataset();
    setAdults(empty);
    setKids(empty);
    clearAllSavedData();
    await syncToCloud(empty, empty);
  }

  const hasAnyData = adults.students.length > 0 || kids.students.length > 0;

  const lastSavedLabel = (() => {
    const times = [adults.savedAt, kids.savedAt]
      .map((t) => (t ? parseDate(t) : null))
      .filter(Boolean);
    if (!times.length) return null;
    const latest = new Date(Math.max(...times.map((d) => d.getTime())));
    return formatDate(latest);
  })();

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <p className="text-center text-zinc-500">Loading roster…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <PageHeader title="BJJ grading report">
        <p className="mt-2 max-w-2xl text-zinc-600">
          Upload spreadsheets to update the gym roster. When the database is
          connected, every coach sees the latest data on any device.
        </p>
        {cloudStatus === "synced" && (
          <p className="mt-2 text-sm text-green-800">
            Roster saved to the cloud — all coaches see the latest data.
          </p>
        )}
        {cloudStatus === "local-only" && (
          <p className="mt-2 text-sm text-amber-800">
            Cloud database not configured — data is only on this browser. Add
            Vercel Postgres and run scripts/init-db.sql to sync across devices.
          </p>
        )}
        {cloudStatus === "error" && cloudError && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {cloudError}
          </p>
        )}
        {lastSavedLabel && (
          <p className="mt-2 text-sm text-zinc-500">
            Last updated: {lastSavedLabel}
          </p>
        )}
      </PageHeader>

      <section className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
        <label className="block text-sm">
          <span className="font-medium text-zinc-800">
            Upload password (if your admin set one)
          </span>
          <span className="mt-0.5 block text-zinc-500">
            Required to save uploads to the cloud when configured.
          </span>
          <input
            type="password"
            value={uploadPassword}
            onChange={(e) => setUploadPassword(e.target.value)}
            placeholder="Optional"
            className="mt-2 w-full max-w-sm rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            autoComplete="off"
          />
        </label>
      </section>

      {hasAnyData && (
        <SharePanel
          adults={adults}
          kids={kids}
          disabled={!hasAnyData}
          password={uploadPassword}
          onPasswordChange={setUploadPassword}
        />
      )}

      <GradingDashboard
        adults={adults}
        kids={kids}
        adultsUploadInfo={
          adults.duplicatesRemoved > 0
            ? `${adults.duplicatesRemoved} duplicate row(s) removed`
            : null
        }
        kidsUploadInfo={
          kids.duplicatesRemoved > 0
            ? `${kids.duplicatesRemoved} duplicate row(s) removed`
            : null
        }
        onAdultsUpload={(file) => handleUpload("adults", file)}
        onKidsUpload={(file) => handleUpload("kids", file)}
        onClearAdults={() => clearDataset("adults")}
        onClearKids={() => clearDataset("kids")}
        onClearAll={clearAllData}
      />
    </main>
  );
}
