import { describe, expect, it } from "vitest";
import {
  buildClubWorxScheduleWindowParamCandidates,
  buildClubWorxScheduleWindowParams,
  bookingContactKey,
  normaliseClubWorxClassFromBooking,
  normaliseClubWorxEvent,
} from "./classes";

describe("normaliseClubWorxEvent", () => {
  it("maps event id, title, and start time label", () => {
    const event = normaliseClubWorxEvent({
      id: 42,
      name: "Kids BJJ",
      starts_at: "2026-09-03T08:30:00Z",
    });

    expect(event.id).toBe("42");
    expect(event.title).toBe("Kids BJJ");
    expect(event.startsAt).toBe("2026-09-03T08:30:00.000Z");
    expect(event.startsAtLabel).not.toBe("Time TBA");
  });

  it("uses event_id when id is missing", () => {
    const event = normaliseClubWorxEvent({
      event_id: 108,
      event_name: "Adults BJJ",
      start_time: "2026-09-03T18:30:00Z",
    });

    expect(event.id).toBe("108");
    expect(event.title).toBe("Adults BJJ");
    expect(event.startsAt).toBe("2026-09-03T18:30:00.000Z");
  });
});

describe("bookingContactKey", () => {
  it("reads direct booking contact key", () => {
    expect(bookingContactKey({ contact_key: "abc-1" })).toBe("abc-1");
  });

  it("falls back to nested booking contact key", () => {
    expect(bookingContactKey({ contact: { contact_key: "abc-2" } })).toBe("abc-2");
  });

  it("returns null when no key exists", () => {
    expect(bookingContactKey({})).toBe(null);
  });
});

describe("normaliseClubWorxClassFromBooking", () => {
  it("maps class details from booking-level fields", () => {
    const event = normaliseClubWorxClassFromBooking({
      event_id: 22,
      event_name: "Adults BJJ",
      event_starts_at: "2026-09-03T09:30:00Z",
    });

    expect(event.id).toBe("22");
    expect(event.title).toBe("Adults BJJ");
    expect(event.startsAt).toBe("2026-09-03T09:30:00.000Z");
  });

  it("maps class details from nested booking.event", () => {
    const event = normaliseClubWorxClassFromBooking({
      event: {
        id: 23,
        title: "Kids BJJ",
        start_time: "2026-09-03T10:00:00Z",
      },
    });

    expect(event.id).toBe("23");
    expect(event.title).toBe("Kids BJJ");
    expect(event.startsAt).toBe("2026-09-03T10:00:00.000Z");
  });
});

describe("buildClubWorxScheduleWindowParams", () => {
  it("builds required event range params with defaults", () => {
    const params = buildClubWorxScheduleWindowParams(
      new Date("2026-09-15T00:00:00Z")
    );
    expect(params).toEqual({
      event_starts_after: "2026-09-08",
      event_ends_before: "2026-12-14",
    });
  });
});

describe("buildClubWorxScheduleWindowParamCandidates", () => {
  it("returns parameter-name and datetime-format variants", () => {
    const candidates = buildClubWorxScheduleWindowParamCandidates(
      new Date("2026-09-15T00:00:00Z")
    );

    expect(candidates[0]).toEqual({
      event_starts_after: "2026-09-08",
      event_ends_before: "2026-12-14",
    });
    expect(candidates.some((c) => "starts_after" in c)).toBe(true);
    expect(
      candidates.some((c) => String(c.event_starts_after || "").includes("T"))
    ).toBe(true);
  });
});

