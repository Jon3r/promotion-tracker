import { describe, it, expect } from "vitest";
import {
  defaultEventDates,
  formatEventDateForPdf,
  eventDatesForCategory,
} from "./eventDates";

describe("eventDates", () => {
  it("formats ISO dates for PDF", () => {
    expect(formatEventDateForPdf("2026-06-21")).toMatch(/21 Jun(e)? 2026/);
    expect(formatEventDateForPdf("")).toBe(null);
  });

  it("picks category dates", () => {
    const dates = defaultEventDates();
    dates.adults.gradingDate = "2026-01-01";
    expect(eventDatesForCategory(dates, "adults").gradingDate).toBe("2026-01-01");
    expect(eventDatesForCategory(dates, "kids").gradingDate).toBe("");
  });
});
