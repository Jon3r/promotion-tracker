"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { pickDisplayedClass } from "@/lib/clubworx/classes";
import {
  fetchClubWorxClasses,
  fetchClubWorxClassAttendees,
} from "@/lib/rosterClient";

const SCHEDULE_POLL_MS = 60_000;
const ATTENDEES_POLL_MS = 5_000;

/**
 * @param {Date} [date]
 * @returns {string}
 */
function localDayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * @param {string|null|undefined} iso
 * @returns {string}
 */
function formatTimeLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CheckInPage() {
  const [classes, setClasses] = useState([]);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [attendees, setAttendees] = useState([]);
  const [attendeesClassId, setAttendeesClassId] = useState(null);
  const [attendeesError, setAttendeesError] = useState("");
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [lastAttendeesAt, setLastAttendeesAt] = useState(null);

  const day = localDayKey(now);
  const selection = pickDisplayedClass(classes, now);
  const currentClass = selection.class;
  const nextClass = selection.nextClass;
  const shownAttendees =
    currentClass && attendeesClassId === currentClass.id ? attendees : [];

  const loadSchedule = useCallback(async () => {
    const result = await fetchClubWorxClasses(localDayKey());
    if (!result.ok) {
      setScheduleError(result.error || "Could not load today’s classes");
      setClasses([]);
      setScheduleLoading(false);
      return;
    }
    setScheduleError("");
    setClasses(result.classes || []);
    setScheduleLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadSchedule();
    })();
    const id = setInterval(() => {
      if (!cancelled) loadSchedule();
    }, SCHEDULE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [loadSchedule]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const classId = currentClass?.id;
    const classDay = currentClass?.dayKey || day;
    if (!classId) return undefined;

    let cancelled = false;

    async function loadAttendees() {
      if (!cancelled) setAttendeesLoading(true);
      const result = await fetchClubWorxClassAttendees(classId, classDay, {
        state: "attended",
      });
      if (cancelled) return;
      if (!result.ok) {
        setAttendeesError(result.error || "Could not load check-ins");
        setAttendeesLoading(false);
        return;
      }
      setAttendeesError("");
      setAttendees(result.attendees || []);
      setAttendeesClassId(classId);
      setLastAttendeesAt(new Date());
      setAttendeesLoading(false);
    }

    loadAttendees();
    const id = setInterval(loadAttendees, ATTENDEES_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [currentClass?.id, currentClass?.dayKey, day]);

  const statusLabel =
    selection.status === "live"
      ? "Live now"
      : selection.status === "upcoming"
        ? "Starting soon"
        : "No class right now";

  return (
    <main className="mx-auto flex min-h-screen w-full min-w-0 max-w-[90rem] flex-1 flex-col overflow-x-clip px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="Check in"
        action={
          <Link
            href="/"
            className="btn-ghost text-sm"
          >
            Grading report
          </Link>
        }
      >
        <p className="mt-2 max-w-2xl text-zinc-600">
          Live class check-ins from ClubWorx. Updates every few seconds.
        </p>
      </PageHeader>

      <section className="mb-6 min-w-0 border-b border-zinc-200 pb-6">
        {scheduleLoading && (
          <p className="text-zinc-500">Loading today’s schedule…</p>
        )}
        {scheduleError && (
          <p className="text-red-600" role="alert">
            {scheduleError}
          </p>
        )}
        {!scheduleLoading && !scheduleError && currentClass && (
          <div className="min-w-0">
            <p className="text-sm font-medium uppercase tracking-wide text-brand-blue">
              {statusLabel}
            </p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
              {currentClass.title}
            </h2>
            <p className="mt-2 text-lg text-zinc-600 sm:text-xl">
              {formatTimeLabel(currentClass.startsAt)}
              {currentClass.endsAt
                ? ` – ${formatTimeLabel(currentClass.endsAt)}`
                : ""}
              {currentClass.organisation
                ? ` · ${currentClass.organisation}`
                : ""}
            </p>
            <p className="mt-3 text-2xl font-semibold text-brand-blue sm:text-3xl">
              {shownAttendees.length} checked in
            </p>
          </div>
        )}
        {!scheduleLoading && !scheduleError && !currentClass && (
          <div className="min-w-0">
            <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              {statusLabel}
            </p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              {nextClass
                ? `Next class at ${formatTimeLabel(nextClass.startsAt)}`
                : "No more classes today"}
            </h2>
            {nextClass && (
              <p className="mt-2 text-lg text-zinc-600">{nextClass.title}</p>
            )}
          </div>
        )}
      </section>

      {currentClass && (
        <section className="min-w-0 flex-1">
          {attendeesError && (
            <p className="mb-4 text-red-600" role="alert">
              {attendeesError}
            </p>
          )}
          {!attendeesError && shownAttendees.length === 0 && (
            <p className="text-xl text-zinc-500 sm:text-2xl">
              {attendeesLoading
                ? "Loading check-ins…"
                : "Waiting for the first check-in…"}
            </p>
          )}
          {shownAttendees.length > 0 && (
            <ul className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {shownAttendees.map((person) => (
                <li
                  key={person.contactKey}
                  className="min-w-0 border-b border-zinc-100 py-3 text-2xl font-medium text-zinc-900 sm:text-3xl"
                >
                  {person.fullName}
                </li>
              ))}
            </ul>
          )}
          {lastAttendeesAt && attendeesClassId === currentClass.id && (
            <p className="mt-8 text-sm text-zinc-400">
              Last updated {lastAttendeesAt.toLocaleTimeString()}
            </p>
          )}
        </section>
      )}
    </main>
  );
}
