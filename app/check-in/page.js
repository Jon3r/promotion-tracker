"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import CheckInBoard from "@/components/CheckInBoard";
import {
  dayKeyInTimeZone,
  filterClassesForDay,
  pickDisplayedClass,
} from "@/lib/clubworx/classes";
import {
  fetchClubWorxClasses,
  fetchClubWorxClassAttendees,
} from "@/lib/rosterClient";

const SCHEDULE_POLL_MS = 60_000;
const ATTENDEES_POLL_MS = 5_000;

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
    timeZone: "Australia/Sydney",
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

  const day = dayKeyInTimeZone(now);
  const selection = pickDisplayedClass(classes, now);
  const currentClass = selection.class;
  const nextClass = selection.nextClass;
  const shownAttendees =
    currentClass && attendeesClassId === currentClass.id ? attendees : [];

  const loadSchedule = useCallback(async () => {
    const gymDay = dayKeyInTimeZone(new Date());
    // Prefer the current-week schedule, then narrow to the gym-local day so
    // UTC boundary mismatches do not drop morning/evening classes.
    const week = await fetchClubWorxClasses();
    let list = [];
    if (week.ok) {
      list = filterClassesForDay(week.classes || [], gymDay);
    }
    if (!list.length) {
      const dayResult = await fetchClubWorxClasses(gymDay);
      if (dayResult.ok) {
        list = filterClassesForDay(dayResult.classes || [], gymDay);
      } else if (!week.ok) {
        setScheduleError(
          dayResult.error || week.error || "Could not load today’s classes"
        );
        setClasses([]);
        setScheduleLoading(false);
        return;
      }
    }
    setScheduleError("");
    setClasses(list);
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
        : selection.status === "empty"
          ? "No classes scheduled"
          : "No class right now";

  return (
    <main className="mx-auto flex min-h-screen w-full min-w-0 max-w-[90rem] flex-1 flex-col overflow-x-clip px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Check in" />

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
                : selection.status === "empty"
                  ? "No classes scheduled today"
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
            <CheckInBoard
              key={currentClass.id}
              attendees={shownAttendees}
            />
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
