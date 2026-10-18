import { describe, expect, it } from "vitest";
import { MOCK_BOOKINGS, MOCK_MEMBER_STYLES } from "../mock/clubworx";
import { candidatesFromBookings } from "./roster";

describe("candidatesFromBookings", () => {
  it("returns only booked students due a stripe, never belt-ups", () => {
    const kids = candidatesFromBookings({
      bookings: MOCK_BOOKINGS,
      memberStyles: MOCK_MEMBER_STYLES,
      eventId: "kids-evening",
    });
    expect(kids.map((c) => c.contactKey).sort()).toEqual(["alice", "ben"]);

    const adults = candidatesFromBookings({
      bookings: MOCK_BOOKINGS,
      memberStyles: MOCK_MEMBER_STYLES,
      eventId: "adults-evening",
    });
    expect(adults.map((c) => c.contactKey)).toEqual(["carol"]);
  });
});
