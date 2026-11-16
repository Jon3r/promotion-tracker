import { NextResponse } from "next/server";
import {
  fetchAllClubWorxPages,
  isClubWorxConfigured,
} from "@/lib/clubworx/client.server";
import {
  buildClubWorxDayParamCandidates,
  buildClubWorxClassSelectorParamCandidates,
  mergeClassTiming,
  normaliseClubWorxClassFromBooking,
  normaliseClubWorxEvent,
  resolveClubWorxDayKey,
} from "@/lib/clubworx/classes";

async function fetchClubWorxPagesWithParamCandidates(endpoint, candidates) {
  const errors = [];
  for (const params of candidates) {
    try {
      const rows = await fetchAllClubWorxPages(endpoint, params);
      return { ok: true, rows, params };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown ClubWorx error";
      errors.push(message);
    }
  }
  return { ok: false, rows: [], params: null, errors };
}

async function fetchBookingsForDay(candidates) {
  const scoped = await fetchClubWorxPagesWithParamCandidates("bookings", candidates);
  if (scoped.ok && scoped.rows.length) return scoped;

  // Fallback for accounts where date window filters on bookings are ignored
  // or interpreted differently; we filter by dayKey in this route after fetch.
  try {
    const rows = await fetchAllClubWorxPages("bookings");
    return { ok: true, rows, params: null, fallbackUnfiltered: true, errors: scoped.errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ClubWorx error";
    return { ...scoped, errors: [...(scoped.errors || []), message] };
  }
}

function dedupeClasses(classes) {
  const byKey = new Map();
  for (const entry of classes) {
    if (!entry?.id && !entry?.title) continue;
    const key = entry.startsAt
      ? `${entry.id}::${entry.startsAt}`
      : `${entry.id}::${entry.dayKey || ""}::${entry.title}`;
    const prev = byKey.get(key);
    if (!prev || (!prev.startsAt && entry.startsAt)) {
      byKey.set(key, entry);
    }
  }
  return [...byKey.values()];
}

/**
 * Collect likely timing-related keys from a raw ClubWorx row for diagnostics.
 * @param {Record<string, unknown>|null|undefined} row
 */
function timingProbe(row) {
  if (!row || typeof row !== "object") return null;
  /** @type {Record<string, unknown>} */
  const probe = { keys: Object.keys(row) };
  for (const [key, value] of Object.entries(row)) {
    if (/start|end|date|time|occur|sched|begin|duration/i.test(key)) {
      probe[key] = value;
    }
  }
  const nested = row.event || row.schedule_event || row.class;
  if (nested && typeof nested === "object") {
    probe.nestedKeys = Object.keys(/** @type {object} */ (nested));
    for (const [key, value] of Object.entries(/** @type {object} */ (nested))) {
      if (/start|end|date|time|occur|sched|begin|duration/i.test(key)) {
        probe[`event.${key}`] = value;
      }
    }
  }
  return probe;
}

export async function GET(request) {
  if (!isClubWorxConfigured()) {
    return NextResponse.json(
      { error: "ClubWorx is not configured. Set CLUBWORX_ACCOUNT_KEY." },
      { status: 503 }
    );
  }

  try {
    const search = new URL(request.url).searchParams;
    const day = search.get("day")?.trim() || "";
    const debug = search.get("debug") === "1";
    const windowCandidates = day
      ? buildClubWorxDayParamCandidates(day)
      : buildClubWorxClassSelectorParamCandidates();
    if (!windowCandidates.length) {
      return NextResponse.json({ error: "Invalid day format. Use yyyy-mm-dd." }, { status: 400 });
    }
    const bookingsResult = day
      ? await fetchBookingsForDay(windowCandidates)
      : await fetchClubWorxPagesWithParamCandidates("bookings", windowCandidates);
    let classes = [];
    /** @type {Record<string, unknown>|null} */
    let firstBooking = null;

    if (bookingsResult.ok && bookingsResult.rows.length) {
      const byId = new Map();
      for (const booking of bookingsResult.rows) {
        if (!firstBooking) firstBooking = booking;
        if (day) {
          const bookingDay = resolveClubWorxDayKey(booking);
          if (bookingDay && bookingDay !== day) continue;
        }
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
    }

    const eventsResult = await fetchClubWorxPagesWithParamCandidates(
      "events",
      windowCandidates
    );
    const eventClasses = eventsResult.ok
      ? eventsResult.rows
          .filter((row) => {
            if (!day) return true;
            const eventDay = resolveClubWorxDayKey(row);
            return !eventDay || eventDay === day;
          })
          .map(normaliseClubWorxEvent)
          .filter((event) => event.id)
      : [];

    if (!classes.length) {
      classes = eventClasses;
    } else if (eventClasses.length) {
      // Bookings often omit schedule fields; enrich from the events endpoint.
      const eventsById = new Map(eventClasses.map((event) => [event.id, event]));
      classes = classes.map((entry) =>
        mergeClassTiming(entry, eventsById.get(entry.id))
      );
      for (const event of eventClasses) {
        if (!classes.some((entry) => entry.id === event.id)) {
          classes.push(event);
        }
      }
    }

    if (!classes.length && !bookingsResult.ok) {
      if (!eventsResult.ok) {
        const details = [...(eventsResult.errors || []), ...(bookingsResult.errors || [])]
          .filter(Boolean)
          .join(" | ");
        throw new Error(
          details || "Could not load class schedule from ClubWorx events or bookings"
        );
      }
    }

    classes = dedupeClasses(classes);
    classes.sort((a, b) => {
      const at = a.startsAt ? new Date(a.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bt = b.startsAt ? new Date(b.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
      return at - bt;
    });

    /** @type {Record<string, unknown>} */
    const payload = { ok: true, classes };
    if (debug) {
      payload.debug = {
        bookingsCount: bookingsResult.rows?.length || 0,
        eventsCount: eventsResult.rows?.length || 0,
        firstBookingTiming: timingProbe(firstBooking),
        firstEventTiming: timingProbe(eventsResult.rows?.[0]),
      };
    }

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load ClubWorx classes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
