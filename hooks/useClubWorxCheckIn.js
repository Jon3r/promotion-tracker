"use client";

import { useCallback, useEffect, useState } from "react";
import {
  dayKeyInTimeZone,
  filterClassesForDay,
  pickDisplayedClasses,
} from "@/lib/clubworx/classes";
import {
  fetchClubWorxClassAttendees,
  fetchClubWorxClasses,
} from "@/lib/rosterClient";
import { formatClockTime, GYM_TIME_ZONE } from "@/lib/timer/engine";

const SCHEDULE_POLL_MS = 60_000;
const ATTENDEES_POLL_MS = 5_000;

/**
 * @param {string|null|undefined} iso
 * @returns {string}
 */
export function formatClassTimeLabel(iso) {
  if (!iso) return "";
  return formatClockTime(iso, GYM_TIME_ZONE);
}

export function useClubWorxCheckIn() {
  const [classes, setClasses] = useState([]);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [attendeesById, setAttendeesById] = useState({});
  const [loadedClassKey, setLoadedClassKey] = useState("");
  const [attendeesError, setAttendeesError] = useState("");
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [lastAttendeesAt, setLastAttendeesAt] = useState(null);

  const day = dayKeyInTimeZone(now);
  const selection = pickDisplayedClasses(classes, now);
  const currentClasses = selection.classes || [];
  const currentClass = selection.class;
  const nextClass = selection.nextClass;
  const activeKey = currentClasses
    .map((entry) => `${entry.id}::${entry.startsAt || ""}`)
    .join("|");
  const classBoards = currentClasses.map((entry) => ({
    classInfo: entry,
    attendees:
      loadedClassKey === activeKey ? attendeesById[entry.id] || [] : [],
    status:
      entry.startsAt && new Date(entry.startsAt).getTime() > now.getTime()
        ? "upcoming"
        : "live",
  }));
  const shownAttendees = classBoards[0]?.attendees || [];

  const loadSchedule = useCallback(async () => {
    const gymDay = dayKeyInTimeZone(new Date());
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
    const keys = new Set(activeKey.split("|").filter(Boolean));
    const targets = classes
      .filter((entry) => keys.has(`${entry.id}::${entry.startsAt || ""}`))
      .map((entry) => ({
        id: entry.id,
        day: entry.dayKey || day,
      }));
    if (!targets.length) return undefined;

    let cancelled = false;

    async function loadAttendees() {
      if (!cancelled) setAttendeesLoading(true);
      const results = await Promise.all(
        targets.map(async (target) => {
          const result = await fetchClubWorxClassAttendees(target.id, target.day, {
            state: "attended",
          });
          return { id: target.id, result };
        })
      );
      if (cancelled) return;

      const failed = results.find((entry) => !entry.result.ok);
      setAttendeesById((prev) => {
        const nextById = {};
        for (const { id, result } of results) {
          nextById[id] = result.ok
            ? result.attendees || []
            : prev[id] || [];
        }
        return nextById;
      });
      setLoadedClassKey(activeKey);
      setAttendeesError(
        failed ? failed.result.error || "Could not load check-ins" : ""
      );
      setLastAttendeesAt(new Date());
      setAttendeesLoading(false);
    }

    loadAttendees();
    const id = setInterval(loadAttendees, ATTENDEES_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activeKey, day, classes]);

  const statusLabel =
    selection.status === "live"
      ? "Live now"
      : selection.status === "upcoming"
        ? "Starting soon"
        : selection.status === "empty"
          ? "No classes scheduled"
          : "No class right now";

  return {
    classes,
    currentClass,
    currentClasses,
    classBoards,
    nextClass,
    status: selection.status,
    statusLabel,
    attendees: shownAttendees,
    attendeesClassId: currentClass?.id || null,
    attendeesCount: classBoards.reduce(
      (total, board) => total + board.attendees.length,
      0
    ),
    scheduleLoading,
    scheduleError,
    attendeesLoading,
    attendeesError,
    lastAttendeesAt,
    formatTimeLabel: formatClassTimeLabel,
  };
}
