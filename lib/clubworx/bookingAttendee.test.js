import { describe, expect, it } from "vitest";
import {
  bookingCheckedInAt,
  bookingDisplayName,
  bookingsToAttendees,
} from "./bookingAttendee";

describe("bookingDisplayName", () => {
  it("reads contact first/last name fields", () => {
    expect(
      bookingDisplayName({
        contact_first_name: "Alex",
        contact_last_name: "Rivera",
      })
    ).toEqual({
      firstName: "Alex",
      lastName: "Rivera",
      fullName: "Alex Rivera",
    });
  });

  it("falls back to nested contact", () => {
    expect(
      bookingDisplayName({
        contact: { first_name: "Sam", last_name: "Lee" },
      })
    ).toEqual({
      firstName: "Sam",
      lastName: "Lee",
      fullName: "Sam Lee",
    });
  });
});

describe("bookingCheckedInAt", () => {
  it("parses ISO timestamps", () => {
    expect(bookingCheckedInAt({ attended_at: "2026-09-03T18:05:00Z" })).toBe(
      "2026-09-03T18:05:00.000Z"
    );
  });
});

describe("bookingsToAttendees", () => {
  it("dedupes by contact key and prefers roster names when booking lacks them", () => {
    const roster = new Map([
      [
        "ck-1",
        { firstName: "Alex", lastName: "Rivera", fullName: "Alex Rivera" },
      ],
    ]);
    const attendees = bookingsToAttendees(
      [
        { contact_key: "ck-1", attended_at: "2026-09-03T18:05:00Z" },
        {
          contact_key: "ck-2",
          contact_first_name: "Sam",
          contact_last_name: "Lee",
          attended_at: "2026-09-03T18:02:00Z",
        },
      ],
      roster
    );

    expect(attendees).toHaveLength(2);
    expect(attendees[0].fullName).toBe("Alex Rivera");
    expect(attendees[1].fullName).toBe("Sam Lee");
  });
});
