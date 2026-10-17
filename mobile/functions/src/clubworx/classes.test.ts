import { describe, expect, it } from "vitest";
import {
  classHasEndedForConfirm,
  classInNotificationWindow,
  classIsAboutToFinish,
  classIsRunning,
  inferClassAudience,
  normaliseClubWorxEvent,
  resolveClubWorxEndsAt,
  resolveClubWorxStartsAt,
} from "./classes";

describe("normaliseClubWorxEvent", () => {
  it("uses start time and defaults end to 60 minutes", () => {
    const session = normaliseClubWorxEvent({
      id: "1",
      name: "Adults Gi",
      starts_at: "2026-09-10T08:00:00.000Z",
      location_name: "Main Mats",
    });
    expect(session.audience).toBe("adults");
    expect(session.startsAt).toBe("2026-09-10T08:00:00.000Z");
    expect(session.endsAt).toBe("2026-09-10T09:00:00.000Z");
    expect(session.dayKey).toBe("2026-09-10");
  });

  it("uses explicit ends_at and duration when present", () => {
    const withEnd = normaliseClubWorxEvent({
      id: "2",
      name: "Kids BJJ",
      starts_at: "2026-09-10T06:30:00.000Z",
      ends_at: "2026-09-10T07:15:00.000Z",
    });
    expect(withEnd.audience).toBe("kids");
    expect(withEnd.endsAt).toBe("2026-09-10T07:15:00.000Z");

    const withDuration = resolveClubWorxEndsAt(
      { duration_minutes: 45 },
      resolveClubWorxStartsAt({ starts_at: "2026-09-10T06:30:00.000Z" })
    );
    expect(withDuration?.toISOString()).toBe("2026-09-10T07:15:00.000Z");
  });
});

describe("class windows", () => {
  const session = normaliseClubWorxEvent({
    id: "1",
    name: "Adults Gi",
    starts_at: "2026-09-10T08:00:00.000Z",
    ends_at: "2026-09-10T09:00:00.000Z",
  });

  it("is running between start and end", () => {
    expect(classIsRunning(session, new Date("2026-09-10T08:30:00.000Z"))).toBe(true);
    expect(classIsRunning(session, new Date("2026-09-10T07:59:00.000Z"))).toBe(false);
  });

  it("is about to finish in the last 10 minutes", () => {
    expect(classIsAboutToFinish(session, new Date("2026-09-10T08:55:00.000Z"))).toBe(true);
    expect(classIsAboutToFinish(session, new Date("2026-09-10T08:30:00.000Z"))).toBe(false);
  });

  it("is ready for confirm 2 minutes after end", () => {
    expect(classHasEndedForConfirm(session, new Date("2026-09-10T09:01:00.000Z"))).toBe(false);
    expect(classHasEndedForConfirm(session, new Date("2026-09-10T09:02:00.000Z"))).toBe(true);
  });

  it("is in the notification window from start until 30 minutes after end", () => {
    expect(classInNotificationWindow(session, new Date("2026-09-10T07:59:00.000Z"))).toBe(false);
    expect(classInNotificationWindow(session, new Date("2026-09-10T08:00:00.000Z"))).toBe(true);
    expect(classInNotificationWindow(session, new Date("2026-09-10T09:29:00.000Z"))).toBe(true);
    expect(classInNotificationWindow(session, new Date("2026-09-10T09:30:00.000Z"))).toBe(false);
  });
});

describe("inferClassAudience", () => {
  it("detects kids from the title", () => {
    expect(inferClassAudience("Little Kids", "Main")).toBe("kids");
    expect(inferClassAudience("Adults NoGi", "Main")).toBe("adults");
  });
});
