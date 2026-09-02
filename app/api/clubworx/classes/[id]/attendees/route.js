import { NextResponse } from "next/server";
import {
  fetchAllClubWorxPages,
  isClubWorxConfigured,
} from "@/lib/clubworx/client.server";
import { bookingContactKey } from "@/lib/clubworx/classes";

export async function GET(_request, { params }) {
  if (!isClubWorxConfigured()) {
    return NextResponse.json(
      { error: "ClubWorx is not configured. Set CLUBWORX_ACCOUNT_KEY." },
      { status: 503 }
    );
  }

  const { id } = await params;
  const eventId = String(id || "").trim();
  if (!eventId) {
    return NextResponse.json({ error: "Missing class id" }, { status: 400 });
  }

  try {
    const bookings = await fetchAllClubWorxPages("bookings", {
      event_id: eventId,
    });
    const contactKeys = Array.from(
      new Set(bookings.map(bookingContactKey).filter(Boolean))
    );

    return NextResponse.json({
      ok: true,
      eventId,
      attendeeContactKeys: contactKeys,
      attendeesCount: contactKeys.length,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not load class attendees from ClubWorx";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

