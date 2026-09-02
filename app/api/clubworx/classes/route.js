import { NextResponse } from "next/server";
import {
  fetchAllClubWorxPages,
  isClubWorxConfigured,
} from "@/lib/clubworx/client.server";
import {
  buildClubWorxClassSelectorParamCandidates,
  normaliseClubWorxClassFromBooking,
  normaliseClubWorxEvent,
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

function dedupeClasses(classes) {
  const byKey = new Map();
  for (const entry of classes) {
    if (!entry?.id && !entry?.title) continue;
    const key = entry.startsAt
      ? `${entry.title}::${entry.startsAt}`
      : `${entry.id}::${entry.title}`;
    const prev = byKey.get(key);
    if (!prev || (!prev.startsAt && entry.startsAt)) {
      byKey.set(key, entry);
    }
  }
  return [...byKey.values()];
}

export async function GET() {
  if (!isClubWorxConfigured()) {
    return NextResponse.json(
      { error: "ClubWorx is not configured. Set CLUBWORX_ACCOUNT_KEY." },
      { status: 503 }
    );
  }

  try {
    const windowCandidates = buildClubWorxClassSelectorParamCandidates();
    const bookingsResult = await fetchClubWorxPagesWithParamCandidates(
      "bookings",
      windowCandidates
    );
    let classes = [];

    if (bookingsResult.ok && bookingsResult.rows.length) {
      const byId = new Map();
      for (const booking of bookingsResult.rows) {
        const normalized = normaliseClubWorxClassFromBooking(booking);
        if (!normalized.id) continue;
        const previous = byId.get(normalized.id);
        if (!previous || (!previous.startsAt && normalized.startsAt)) {
          byId.set(normalized.id, normalized);
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

