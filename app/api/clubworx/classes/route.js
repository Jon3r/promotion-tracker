import { NextResponse } from "next/server";
import {
  fetchAllClubWorxPages,
  isClubWorxConfigured,
} from "@/lib/clubworx/client.server";
import {
  normaliseClubWorxClassFromBooking,
  normaliseClubWorxEvent,
} from "@/lib/clubworx/classes";

export async function GET() {
  if (!isClubWorxConfigured()) {
    return NextResponse.json(
      { error: "ClubWorx is not configured. Set CLUBWORX_ACCOUNT_KEY." },
      { status: 503 }
    );
  }

  try {
    const events = await fetchAllClubWorxPages("events");
    let classes = events.map(normaliseClubWorxEvent).filter((event) => event.id);

    if (!classes.length) {
      const bookings = await fetchAllClubWorxPages("bookings");
      const byId = new Map();
      for (const booking of bookings) {
        const normalized = normaliseClubWorxClassFromBooking(booking);
        if (!normalized.id) continue;
        const previous = byId.get(normalized.id);
        if (!previous) {
          byId.set(normalized.id, normalized);
          continue;
        }
        if (previous.startsAt) continue;
        byId.set(normalized.id, normalized);
      }
      classes = [...byId.values()];
    }

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

