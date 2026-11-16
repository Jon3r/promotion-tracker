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
  dayKeyInTimeZone,
  filterClassesForDay,
  normaliseClubWorxClassFromBooking,
  normaliseClubWorxEvent,
  mergeClassTiming,
  pickDisplayedClass,
  resolveClubWorxDayKey,
  wallTimeToUtc,
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

  it("combines split date and time fields as Sydney wall time", () => {
    const event = normaliseClubWorxEvent({
      event_id: 220,
      event_name: "No Gi",
      event_starts_on: "2026-09-18",
      event_start_time: "18:15",
    });

    expect(event.id).toBe("220");
    // Sep is AEST (UTC+10): 18:15 Sydney → 08:15 UTC
    expect(event.startsAt).toBe("2026-09-18T08:15:00.000Z");
    expect(event.dayKey).toBe("2026-09-18");
  });

  it("treats date-only values as start of gym-local day", () => {
    const event = normaliseClubWorxEvent({
      event_id: 221,
      event_name: "General Gi Class",
      event_starts_on: "2026-09-18",
    });

    expect(event.startsAt).toBe(
      wallTimeToUtc(2026, 9, 18, 0, 0, 0).toISOString()
    );
    expect(event.dayKey).toBe("2026-09-18");
    expect(event.startsAtLabel.includes("2026")).toBe(true);
  });

  it("treats naive datetimes without offset as Sydney wall time", () => {
    const event = normaliseClubWorxEvent({
      id: 401,
      name: "Adults BJJ",
      starts_at: "2026-11-16 18:00:00",
    });
    // Nov is AEDT (UTC+11): 18:00 Sydney → 07:00 UTC
    expect(event.startsAt).toBe("2026-11-16T07:00:00.000Z");
    expect(event.dayKey).toBe("2026-11-16");
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

  it("leaves a finished class even when the next one is hours away", () => {
    const lunch = {
      id: "lunch",
      title: "Lunch Express Gi",
      startsAt: "2026-11-16T01:30:00.000Z", // 12:30 AEDT
      endsAt: "2026-11-16T02:15:00.000Z", // 13:15 AEDT
    };
    const evening = {
      id: "evening",
      title: "Adults BJJ",
      startsAt: "2026-11-16T07:00:00.000Z", // 18:00 AEDT
      endsAt: "2026-11-16T08:00:00.000Z",
    };
    const result = pickDisplayedClass(
      [lunch, evening],
      new Date("2026-11-16T02:54:00.000Z") // 13:54 AEDT — after lunch ended
    );
    expect(result.status).toBe("idle");
    expect(result.class).toBe(null);
    expect(result.nextClass?.id).toBe("evening");
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
  it("returns gym-local day key from absolute starts_at", () => {
    // 18:15 UTC is early morning next day in Sydney (AEST)
    expect(resolveClubWorxDayKey({ starts_at: "2026-09-22T18:15:00Z" })).toBe(
      "2026-09-23"
    );
  });

  it("returns day key from date-only fields", () => {
    expect(resolveClubWorxDayKey({ event_starts_on: "2026-09-23" })).toBe(
      "2026-09-23"
    );
  });

  it("keeps gym-local day from offset datetime", () => {
    expect(
      resolveClubWorxDayKey({ starts_at: "2026-09-02T06:00:00+10:00" })
    ).toBe("2026-09-02");
  });
});

describe("filterClassesForDay", () => {
  it("keeps classes whose gym-local day matches", () => {
    const classes = [
      {
        id: "1",
        dayKey: "2026-11-16",
        startsAt: "2026-11-16T07:00:00.000Z",
      },
      {
        id: "2",
        dayKey: "2026-11-15",
        startsAt: "2026-11-15T07:00:00.000Z",
      },
    ];
    expect(filterClassesForDay(classes, "2026-11-16").map((c) => c.id)).toEqual(
      ["1"]
    );
  });

  it("falls back to untimed classes when nothing matches the day", () => {
    const classes = [
      { id: "untimed", title: "Kids Comp", startsAt: null, dayKey: null },
    ];
    expect(filterClassesForDay(classes, "2026-11-16").map((c) => c.id)).toEqual(
      ["untimed"]
    );
  });
});

describe("mergeClassTiming", () => {
  it("fills missing startsAt from the source event", () => {
    const merged = mergeClassTiming(
      {
        id: "1",
        title: "Kids",
        startsAt: null,
        endsAt: null,
        startsAtLabel: "Date/Time TBA",
        organisation: "Mats",
        audience: "kids",
        dayKey: null,
      },
      {
        id: "1",
        title: "Kids",
        startsAt: "2026-11-16T07:00:00.000Z",
        endsAt: "2026-11-16T08:00:00.000Z",
        startsAtLabel: "label",
        organisation: "Mats",
        audience: "kids",
        dayKey: "2026-11-16",
      }
    );
    expect(merged.startsAt).toBe("2026-11-16T07:00:00.000Z");
    expect(merged.dayKey).toBe("2026-11-16");
  });
});

describe("pickDisplayedClass untimed", () => {
  it("shows untimed classes instead of empty", () => {
    const result = pickDisplayedClass(
      [{ id: "1", title: "Kids Comp", startsAt: null }],
      new Date("2026-11-16T02:00:00.000Z")
    );
    expect(result.status).toBe("live");
    expect(result.class?.id).toBe("1");
  });
});

describe("dayKeyInTimeZone", () => {
  it("formats Sydney calendar day from a UTC instant", () => {
    expect(
      dayKeyInTimeZone(
        new Date("2026-11-15T20:00:00.000Z"),
        "Australia/Sydney"
      )
    ).toBe("2026-11-16");
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

