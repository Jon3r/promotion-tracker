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
import { bookingsToAttendees } from "@/lib/clubworx/bookingAttendee";
import { getRoster } from "@/lib/rosterDb.server";
import { deserializeDataset } from "@/lib/datasetSerialize";

const ALLOWED_STATES = new Set(["attended", "absent", "not_attended"]);

/**
 * @param {string} eventId
 * @param {string} day
 * @param {string} state
 */
async function fetchBookingsForClass(eventId, day, state) {
  /** @type {Record<string, string>} */
  const base = { event_id: eventId };
  if (state) base.state = state;

  if (!day) {
    return fetchAllClubWorxPages("bookings", base);
  }
  const candidates = buildClubWorxDayParamCandidates(day);
  if (!candidates.length) {
    throw new Error("Invalid day format. Use yyyy-mm-dd.");
  }
  const errors = [];
  for (const candidate of candidates) {
    try {
      return await fetchAllClubWorxPages("bookings", {
        ...base,
        ...candidate,
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Unknown ClubWorx error");
    }
  }
  try {
    return await fetchAllClubWorxPages("bookings", base);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Unknown ClubWorx error");
    throw new Error(errors.filter(Boolean).join(" | "));
  }
}

/**
 * @returns {Promise<Map<string, { firstName: string, lastName: string, fullName: string }>>}
 */
async function loadRosterNameMap() {
  /** @type {Map<string, { firstName: string, lastName: string, fullName: string }>} */
  const map = new Map();
  try {
    const roster = await getRoster();
    if (!roster) return map;
    for (const blob of [roster.adults, roster.kids]) {
      const { students } = deserializeDataset(blob);
      for (const student of students) {
        const key = String(student.contactKey || "").trim();
        if (!key || map.has(key)) continue;
        map.set(key, {
          firstName: String(student.firstName || "").trim(),
          lastName: String(student.lastName || "").trim(),
          fullName:
            String(student.fullName || "").trim() ||
            [student.firstName, student.lastName].filter(Boolean).join(" "),
        });
      }
    }
  } catch {
    // Roster is optional enrichment; bookings alone still work.
  }
  return map;
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
    const search = new URL(request.url).searchParams;
    const day = search.get("day")?.trim() || "";
    const stateRaw = search.get("state")?.trim().toLowerCase() || "";
    if (stateRaw && !ALLOWED_STATES.has(stateRaw)) {
      return NextResponse.json(
        {
          error:
            "Invalid state. Use attended, absent, or not_attended.",
        },
        { status: 400 }
      );
    }

    const bookings = await fetchBookingsForClass(eventId, day, stateRaw);
    const scopedBookings = day
      ? bookings.filter((booking) => {
          const bookingDay = resolveClubWorxDayKey(booking);
          return !bookingDay || bookingDay === day;
        })
      : bookings;

    const rosterByKey = await loadRosterNameMap();
    const attendees = bookingsToAttendees(scopedBookings, rosterByKey);
    const contactKeys = attendees.map((a) => a.contactKey);

    // Backward-compatible keys list for grading dashboard class filter.
    if (!attendees.length) {
      const fallbackKeys = Array.from(
        new Set(scopedBookings.map(bookingContactKey).filter(Boolean))
      );
      return NextResponse.json({
        ok: true,
        eventId,
        state: stateRaw || null,
        attendeeContactKeys: fallbackKeys,
        attendees: fallbackKeys.map((contactKey) => {
          const roster = rosterByKey.get(contactKey);
          return {
            contactKey,
            firstName: roster?.firstName || "",
            lastName: roster?.lastName || "",
            fullName: roster?.fullName || "Member",
            checkedInAt: null,
          };
        }),
        attendeesCount: fallbackKeys.length,
      });
    }

    return NextResponse.json({
      ok: true,
      eventId,
      state: stateRaw || null,
      attendeeContactKeys: contactKeys,
      attendees,
      attendeesCount: attendees.length,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not load class attendees from ClubWorx";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
