import { NextResponse } from "next/server";
import {
  fetchAllClubWorxPages,
  isClubWorxConfigured,
} from "@/lib/clubworx/client.server";
import {
  bookingContactKey,
  buildClubWorxDayParamCandidates,
  resolveClubWorxDayKey,
} from "@/lib/clubworx/classes";

async function fetchBookingsForClass(eventId, day) {
  if (!day) {
    return fetchAllClubWorxPages("bookings", { event_id: eventId });
  }
  const candidates = buildClubWorxDayParamCandidates(day);
  if (!candidates.length) {
    throw new Error("Invalid day format. Use yyyy-mm-dd.");
  }
  const errors = [];
  for (const candidate of candidates) {
    try {
      return await fetchAllClubWorxPages("bookings", {
        event_id: eventId,
        ...candidate,
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Unknown ClubWorx error");
    }
  }
  throw new Error(errors.filter(Boolean).join(" | "));
}

export async function GET(request, { params }) {
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
    const day = new URL(request.url).searchParams.get("day")?.trim() || "";
    const bookings = await fetchBookingsForClass(eventId, day);
    const scopedBookings = day
      ? bookings.filter((booking) => {
          const bookingDay = resolveClubWorxDayKey(booking);
          return !bookingDay || bookingDay === day;
        })
      : bookings;
    const contactKeys = Array.from(
      new Set(scopedBookings.map(bookingContactKey).filter(Boolean))
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

