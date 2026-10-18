import { describe, expect, it, vi } from "vitest";
import {
  parseRetryAfterMs,
  clubWorxRetryDelayMs,
  isClubWorxRateLimitError,
} from "./retry";

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
    expect(clubWorxRetryDelayMs(0, null)).toBe(1500);
    expect(clubWorxRetryDelayMs(1, null)).toBe(3000);
  });

  it("uses longer backoff for 429", () => {
    expect(clubWorxRetryDelayMs(0, null, { status: 429 })).toBe(5000);
    expect(clubWorxRetryDelayMs(1, null, { status: 429 })).toBe(10000);
  });

  it("uses retry-after when provided", () => {
    expect(clubWorxRetryDelayMs(0, "3")).toBe(3000);
  });
});

describe("isClubWorxRateLimitError", () => {
  it("detects 429 messages", () => {
    expect(
      isClubWorxRateLimitError(
        new Error('ClubWorx member_styles request failed (429): {"status":429}')
      )
    ).toBe(true);
    expect(isClubWorxRateLimitError(new Error("Too Many Requests"))).toBe(true);
    expect(isClubWorxRateLimitError(new Error("other"))).toBe(false);
  });
});
