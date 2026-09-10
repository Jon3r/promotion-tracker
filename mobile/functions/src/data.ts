import {
  buildDayParamCandidates,
  normaliseClubWorxClassFromBooking,
  normaliseClubWorxEvent,
  resolveClubWorxDayKey,
  type ClassSession,
} from "./clubworx/classes";
import {
  fetchAllClubWorxPages,
  fetchClubWorxPagesWithParamCandidates,
  isClubWorxConfigured,
} from "./clubworx/client";
import { attachDueCounts, candidatesFromBookings } from "./clubworx/roster";
import type { StripeCandidate } from "./eligibility/stripeDue";
import {
  MOCK_BOOKINGS,
  MOCK_MEMBER_STYLES,
  MOCK_STYLES,
  mockClassesForDay,
} from "./mock/clubworx";

function dedupeClasses(classes: ClassSession[]): ClassSession[] {
  const byKey = new Map<string, ClassSession>();
  for (const entry of classes) {
    if (!entry.id && !entry.title) continue;
    const key = entry.startsAt
      ? `${entry.id}::${entry.startsAt}`
      : `${entry.id}::${entry.dayKey || ""}::${entry.title}`;
    const prev = byKey.get(key);
    if (!prev || (!prev.startsAt && entry.startsAt)) {
      byKey.set(key, entry);
    }
  }
  return [...byKey.values()].sort((a, b) => {
    const at = a.startsAt ? new Date(a.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bt = b.startsAt ? new Date(b.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
    return at - bt;
  });
}

export async function loadDaySchedule(day: string): Promise<{
  classes: ClassSession[];
  bookings: Record<string, unknown>[];
  memberStyles: Record<string, unknown>[];
  styles: unknown;
  mock: boolean;
}> {
  if (!isClubWorxConfigured()) {
    const classes = mockClassesForDay(day);
    return {
      classes: attachDueCounts(classes, MOCK_BOOKINGS, MOCK_MEMBER_STYLES),
      bookings: MOCK_BOOKINGS,
      memberStyles: MOCK_MEMBER_STYLES,
      styles: MOCK_STYLES,
      mock: true,
    };
  }

  const candidates = buildDayParamCandidates(day);
  const bookingsResult = await fetchClubWorxPagesWithParamCandidates("bookings", candidates);
  let bookings: Record<string, unknown>[] = [];
  if (bookingsResult.ok) {
    bookings = bookingsResult.rows.filter((row) => {
      const bookingDay = resolveClubWorxDayKey(row);
      return !bookingDay || bookingDay === day;
    });
  } else {
    try {
      bookings = (await fetchAllClubWorxPages("bookings")).filter((row) => {
        const bookingDay = resolveClubWorxDayKey(row);
        return !bookingDay || bookingDay === day;
      });
    } catch {
      bookings = [];
    }
  }

  let classes: ClassSession[] = [];
  const byId = new Map<string, ClassSession>();
  for (const booking of bookings) {
    const normalized = normaliseClubWorxClassFromBooking(booking);
    if (!normalized.id) continue;
    const key = normalized.startsAt
      ? `${normalized.id}::${normalized.startsAt}`
      : `${normalized.id}::${normalized.dayKey || ""}`;
    const previous = byId.get(key);
    if (!previous || (!previous.startsAt && normalized.startsAt)) {
      byId.set(key, normalized);
    }
  }
  classes = [...byId.values()];

  if (!classes.length) {
    const eventsResult = await fetchClubWorxPagesWithParamCandidates("events", candidates);
    if (eventsResult.ok) {
      classes = eventsResult.rows
        .filter((row) => {
          const eventDay = resolveClubWorxDayKey(row);
          return !eventDay || eventDay === day;
        })
        .map(normaliseClubWorxEvent)
        .filter((event) => event.id);
    }
  }

  const [memberStyles, styles] = await Promise.all([
    fetchAllClubWorxPages("member_styles"),
    fetchAllClubWorxPages("styles").catch(() => []),
  ]);

  return {
    classes: attachDueCounts(dedupeClasses(classes), bookings, memberStyles),
    bookings,
    memberStyles,
    styles,
    mock: false,
  };
}

export function classCandidates(
  eventId: string,
  bookings: Record<string, unknown>[],
  memberStyles: Record<string, unknown>[]
): StripeCandidate[] {
  return candidatesFromBookings({ bookings, memberStyles, eventId });
}
