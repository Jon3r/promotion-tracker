import { describe, expect, it, vi } from "vitest";
import { parseRetryAfterMs, clubWorxRetryDelayMs } from "./retry";

describe("parseRetryAfterMs", () => {
  it("parses retry-after seconds header", () => {
    expect(parseRetryAfterMs("2")).toBe(2000);
  });

  it("parses retry-after date header", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const retryAt = "Thu, 01 Jan 2026 00:00:05 GMT";
    expect(parseRetryAfterMs(retryAt)).toBe(5000);

    vi.useRealTimers();
  });

  it("returns null for invalid values", () => {
    expect(parseRetryAfterMs("not-a-date")).toBe(null);
    expect(parseRetryAfterMs("")).toBe(null);
    expect(parseRetryAfterMs(null)).toBe(null);
  });
});

describe("clubWorxRetryDelayMs", () => {
  it("uses exponential backoff when retry-after is missing", () => {
    expect(clubWorxRetryDelayMs(0, null, null)).toBe(1000);
    expect(clubWorxRetryDelayMs(1, null, null)).toBe(2000);
  });

  it("uses retry-after when provided", () => {
    expect(clubWorxRetryDelayMs(0, "3", null)).toBe(3000);
  });

  it("uses longer backoff for 429 rate limit errors", () => {
    expect(clubWorxRetryDelayMs(0, null, 429)).toBe(2000);
    expect(clubWorxRetryDelayMs(1, null, 429)).toBe(4000);
    expect(clubWorxRetryDelayMs(2, null, 429)).toBe(8000);
  });

  it("caps 429 retry delay", () => {
    expect(clubWorxRetryDelayMs(10, null, 429)).toBe(15000);
  });

  it("respects retry-after header for 429 errors", () => {
    expect(clubWorxRetryDelayMs(0, "5", 429)).toBe(5000);
  });
});

