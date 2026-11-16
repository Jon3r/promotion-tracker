import { describe, expect, it } from "vitest";
import {
  CLASS_ADVANCE_MS,
  DEFAULT_CLASS_DURATION_MS,
  buildClubWorxClassSelectorParamCandidates,
  buildClubWorxCurrentWeekParamCandidates,
  buildClubWorxCurrentWeekWindowParams,
  buildClubWorxDayParamCandidates,
  buildClubWorxScheduleWindowParamCandidates,
  buildClubWorxScheduleWindowParams,
  bookingContactKey,
  normaliseClubWorxClassFromBooking,
  normaliseClubWorxEvent,
  pickDisplayedClass,
  resolveClubWorxDayKey,
} from "./classes";

describe("normaliseClubWorxEvent", () => {
  it("maps event id, title, and start time label", () => {
    const event = normaliseClubWorxEvent({
      id: 42,
      name: "Kids BJJ",
      starts_at: "2026-09-03T08:30:00Z",
      location_name: "PJA HQ",
    });

    expect(event.id).toBe("42");
    expect(event.title).toBe("Kids BJJ");
    expect(event.startsAt).toBe("2026-09-03T08:30:00.000Z");
    expect(event.startsAtLabel).not.toBe("Time TBA");
    expect(event.organisation).toBe("PJA HQ");
    expect(event.audience).toBe("kids");
    expect(event.dayKey).toBe("2026-09-03");
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
    expect(event.audience).toBe("adults");
  });

  it("combines split date and time fields", () => {
    const event = normaliseClubWorxEvent({
      event_id: 220,
      event_name: "No Gi",
      event_starts_on: "2026-09-18",
      event_start_time: "18:15",
    });

    expect(event.id).toBe("220");
    expect(event.startsAt?.startsWith("2026-09-18T18:15")).toBe(true);
  });

  it("shows date label when only class date is known", () => {
    const event = normaliseClubWorxEvent({
      event_id: 221,
      event_name: "General Gi Class",
      event_starts_on: "2026-09-18",
    });

    expect(event.startsAt).toBe("2026-09-18T00:00:00.000Z");
    expect(event.startsAtLabel.includes("2026")).toBe(true);
  });

  it("parses epoch timestamp starts_at values", () => {
    const expected = new Date(1799980800 * 1000).toISOString();
    const event = normaliseClubWorxEvent({
      id: 300,
      name: "AM Class",
      starts_at: 1799980800,
    });

    expect(event.startsAt).toBe(expected);
  });

  it("defaults endsAt to one hour after startsAt", () => {
    const event = normaliseClubWorxEvent({
      id: 42,
      name: "Kids BJJ",
      starts_at: "2026-09-03T08:30:00Z",
    });

    expect(event.endsAt).toBe(
      new Date(
        new Date("2026-09-03T08:30:00Z").getTime() + DEFAULT_CLASS_DURATION_MS
      ).toISOString()
    );
  });

  it("uses explicit ends_at when provided", () => {
    const event = normaliseClubWorxEvent({
      id: 42,
      name: "Kids BJJ",
      starts_at: "2026-09-03T08:30:00Z",
      ends_at: "2026-09-03T09:45:00Z",
    });

    expect(event.endsAt).toBe("2026-09-03T09:45:00.000Z");
  });
});

describe("pickDisplayedClass", () => {
  const adults = {
    id: "1",
    title: "Adults BJJ",
    startsAt: "2026-09-03T18:00:00.000Z",
    endsAt: "2026-09-03T19:00:00.000Z",
  };
  const kids = {
    id: "2",
    title: "Kids BJJ",
    startsAt: "2026-09-03T19:00:00.000Z",
    endsAt: "2026-09-03T20:00:00.000Z",
  };

  it("is idle before the first class advance window", () => {
    const result = pickDisplayedClass(
      [adults, kids],
      new Date("2026-09-03T17:40:00.000Z")
    );
    expect(result.status).toBe("idle");
    expect(result.class).toBe(null);
    expect(result.nextClass?.id).toBe("1");
  });

  it("shows the first class as upcoming at T-10", () => {
    const result = pickDisplayedClass(
      [adults, kids],
      new Date(new Date(adults.startsAt).getTime() - CLASS_ADVANCE_MS)
    );
    expect(result.status).toBe("upcoming");
    expect(result.class?.id).toBe("1");
  });

  it("shows the live class mid-session", () => {
    const result = pickDisplayedClass(
      [adults, kids],
      new Date("2026-09-03T18:30:00.000Z")
    );
    expect(result.status).toBe("live");
    expect(result.class?.id).toBe("1");
  });

  it("hands off to the next class exactly 10 minutes before it starts", () => {
    const handoff = new Date(
      new Date(kids.startsAt).getTime() - CLASS_ADVANCE_MS
    );
    const result = pickDisplayedClass([adults, kids], handoff);
    expect(result.status).toBe("upcoming");
    expect(result.class?.id).toBe("2");
  });

  it("keeps the last class until it ends", () => {
    const result = pickDisplayedClass(
      [adults, kids],
      new Date("2026-09-03T19:30:00.000Z")
    );
    expect(result.status).toBe("live");
    expect(result.class?.id).toBe("2");
  });

  it("is idle after the last class ends", () => {
    const result = pickDisplayedClass(
      [adults, kids],
      new Date("2026-09-03T20:00:00.000Z")
    );
    expect(result.status).toBe("idle");
    expect(result.class).toBe(null);
    expect(result.nextClass).toBe(null);
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
      location_name: "West End",
    });

    expect(event.id).toBe("22");
    expect(event.title).toBe("Adults BJJ");
    expect(event.startsAt).toBe("2026-09-03T09:30:00.000Z");
    expect(event.organisation).toBe("West End");
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
    expect(event.dayKey).toBe("2026-09-03");
  });
});

describe("resolveClubWorxDayKey", () => {
  it("returns day key from starts_at value", () => {
    expect(resolveClubWorxDayKey({ starts_at: "2026-09-22T18:15:00Z" })).toBe(
      "2026-09-22"
    );
  });

  it("returns day key from date-only fields", () => {
    expect(resolveClubWorxDayKey({ event_starts_on: "2026-09-23" })).toBe(
      "2026-09-23"
    );
  });

  it("keeps day from raw datetime text with timezone offset", () => {
    expect(
      resolveClubWorxDayKey({ starts_at: "2026-09-02T06:00:00+10:00" })
    ).toBe("2026-09-02");
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

describe("buildClubWorxCurrentWeekWindowParams", () => {
  it("uses Monday-to-next-Monday date window", () => {
    const params = buildClubWorxCurrentWeekWindowParams(
      new Date("2026-09-16T10:00:00Z")
    );
    expect(params).toEqual({
      event_starts_after: "2026-09-14",
      event_ends_before: "2026-09-21",
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

describe("buildClubWorxCurrentWeekParamCandidates", () => {
  it("builds variants from current-week date window", () => {
    const candidates = buildClubWorxCurrentWeekParamCandidates(
      new Date("2026-09-16T10:00:00Z")
    );
    expect(candidates[0]).toEqual({
      event_starts_after: "2026-09-14",
      event_ends_before: "2026-09-21",
    });
  });
});

describe("buildClubWorxClassSelectorParamCandidates", () => {
  it("defaults class selector to current week", () => {
    delete process.env.CLUBWORX_CLASS_SELECTOR_WINDOW;
    const candidates = buildClubWorxClassSelectorParamCandidates(
      new Date("2026-09-16T10:00:00Z")
    );
    expect(candidates[0]).toEqual({
      event_starts_after: "2026-09-14",
      event_ends_before: "2026-09-21",
    });
  });

  it("uses rolling mode when configured", () => {
    process.env.CLUBWORX_CLASS_SELECTOR_WINDOW = "rolling";
    const candidates = buildClubWorxClassSelectorParamCandidates(
      new Date("2026-09-16T10:00:00Z")
    );
    delete process.env.CLUBWORX_CLASS_SELECTOR_WINDOW;
    expect(candidates[0]).toEqual({
      event_starts_after: "2026-09-09",
      event_ends_before: "2026-12-15",
    });
  });
});

describe("buildClubWorxDayParamCandidates", () => {
  it("builds one-day candidates from selected yyyy-mm-dd", () => {
    const candidates = buildClubWorxDayParamCandidates("2026-09-18");
    expect(candidates[0]).toEqual({
      event_starts_after: "2026-09-18",
      event_ends_before: "2026-09-19",
    });
  });

  it("returns empty list for invalid day values", () => {
    expect(buildClubWorxDayParamCandidates("09/18/2026")).toEqual([]);
    expect(buildClubWorxDayParamCandidates("")).toEqual([]);
  });
});

