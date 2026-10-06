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
import { cached, envTtlMs, invalidateCache } from "./clubworx/cache";
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

const MEMBER_STYLES_KEY = "member_styles";
const STYLES_KEY = "styles";

export function loadMemberStyles(): Promise<Record<string, unknown>[]> {
  if (!isClubWorxConfigured()) return Promise.resolve(MOCK_MEMBER_STYLES);
  return cached(
    MEMBER_STYLES_KEY,
    envTtlMs("CLUBWORX_MEMBER_STYLES_TTL_MS", 15 * 60 * 1000),
    () => fetchAllClubWorxPages("member_styles")
  );
}

export function loadStyles(): Promise<unknown> {
  if (!isClubWorxConfigured()) return Promise.resolve(MOCK_STYLES);
  return cached(STYLES_KEY, envTtlMs("CLUBWORX_STYLES_TTL_MS", 6 * 60 * 60 * 1000), () =>
    fetchAllClubWorxPages("styles").catch(() => [])
  );
}

/** Call after writing a rank to ClubWorx so the next read sees it. */
export function invalidateMemberStyles(): void {
  invalidateCache(MEMBER_STYLES_KEY);
}

export async function loadDayClasses(day: string): Promise<{
  classes: ClassSession[];
  bookings: Record<string, unknown>[];
}> {
  if (!isClubWorxConfigured()) {
    return { classes: mockClassesForDay(day), bookings: MOCK_BOOKINGS };
  }
  return cached(`day:${day}`, envTtlMs("CLUBWORX_BOOKINGS_TTL_MS", 90 * 1000), () =>
    fetchDayClasses(day)
  );
}

export async function loadDaySchedule(day: string): Promise<{
  classes: ClassSession[];
  bookings: Record<string, unknown>[];
  memberStyles: Record<string, unknown>[];
  mock: boolean;
}> {
  const { classes, bookings } = await loadDayClasses(day);
  const memberStyles = await loadMemberStyles();
  return {
    classes: attachDueCounts(classes, bookings, memberStyles),
    bookings,
    memberStyles,
    mock: !isClubWorxConfigured(),
  };
}

async function fetchDayClasses(day: string): Promise<{
  classes: ClassSession[];
  bookings: Record<string, unknown>[];
}> {
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

  return { classes: dedupeClasses(classes), bookings };
}

export function classCandidates(
  eventId: string,
  bookings: Record<string, unknown>[],
  memberStyles: Record<string, unknown>[]
): StripeCandidate[] {
  return candidatesFromBookings({ bookings, memberStyles, eventId });
}
