import { NextResponse } from "next/server";
import {
  fetchAllClubWorxPages,
  isClubWorxConfigured,
} from "@/lib/clubworx/client.server";
import {
  buildClubWorxDayParamCandidates,
  buildClubWorxClassSelectorParamCandidates,
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

export async function GET(request) {
  if (!isClubWorxConfigured()) {
    return NextResponse.json(
      { error: "ClubWorx is not configured. Set CLUBWORX_ACCOUNT_KEY." },
      { status: 503 }
    );
  }

  try {
    const day = new URL(request.url).searchParams.get("day")?.trim() || "";
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

    if (bookingsResult.ok && bookingsResult.rows.length) {
      const byId = new Map();
      for (const booking of bookingsResult.rows) {
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
    if (!classes.length) {
      classes = eventsResult.rows
        .filter((row) => {
          if (!day) return true;
          const eventDay = resolveClubWorxDayKey(row);
          return !eventDay || eventDay === day;
        })
        .map(normaliseClubWorxEvent)
        .filter((event) => event.id);
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

    return NextResponse.json({ ok: true, classes });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load ClubWorx classes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

