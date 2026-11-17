"use client";

import { useCallback, useEffect, useState } from "react";
import {
  dayKeyInTimeZone,
  filterClassesForDay,
  pickDisplayedClass,
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

  return {
    classes,
    currentClass,
    nextClass,
    status: selection.status,
    statusLabel,
    attendees: shownAttendees,
    attendeesClassId,
    attendeesCount: shownAttendees.length,
    scheduleLoading,
    scheduleError,
    attendeesLoading,
    attendeesError,
    lastAttendeesAt,
    formatTimeLabel: formatClassTimeLabel,
  };
}
