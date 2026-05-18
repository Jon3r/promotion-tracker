import { describe, it, expect } from "vitest";
import { parseDate, daysUntil } from "./dates";

describe("parseDate", () => {
  it("parses ISO dates", () => {
    const d = parseDate("2026-03-27");
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(2);
    expect(d?.getDate()).toBe(27);
  });

  it("parses AU dates", () => {
    const d = parseDate("22/11/2025");
    expect(d?.getFullYear()).toBe(2025);
    expect(d?.getMonth()).toBe(10);
    expect(d?.getDate()).toBe(22);
  });
});

describe("daysUntil", () => {
  it("returns null for missing date", () => {
    expect(daysUntil(null)).toBeNull();
  });
});
