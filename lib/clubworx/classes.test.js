import { describe, expect, it } from "vitest";
import { bookingContactKey, normaliseClubWorxEvent } from "./classes";

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

