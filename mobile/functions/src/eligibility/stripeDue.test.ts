import { describe, expect, it } from "vitest";
import { isDueForStripe, isSnoozed } from "./stripeDue";

describe("isDueForStripe", () => {
  it("includes same-belt stripe increases", () => {
    expect(isDueForStripe("White Belt 1 stripe", "White Belt 2 stripe")).toBe(true);
    expect(isDueForStripe("Purple Belt 3 stripe", "Purple Belt 4 stripe")).toBe(true);
    expect(isDueForStripe("Grey Belt 2 stripe", "Grey Belt 3 stripe")).toBe(true);
  });

  it("treats missing current stripe count as 0", () => {
    expect(isDueForStripe("White Belt", "White Belt 1 stripe")).toBe(true);
  });

  it("excludes belt-ups", () => {
    expect(isDueForStripe("White Belt 4 stripe", "Blue Belt")).toBe(false);
    expect(isDueForStripe("Grey Belt 4 stripe", "Yellow/White Belt")).toBe(false);
    expect(isDueForStripe("White Belt", "Blue Belt")).toBe(false);
  });

  it("excludes ready-to-promote text without a stripe increase", () => {
    expect(isDueForStripe("White Belt 4 stripe", "Ready to Promote")).toBe(false);
    expect(isDueForStripe("Blue Belt", "Ready for Promotion")).toBe(false);
  });

  it("excludes equal ranks", () => {
    expect(isDueForStripe("White Belt", "White Belt")).toBe(false);
    expect(isDueForStripe("White Belt 2 stripe", "White Belt 2 stripe")).toBe(false);
  });

  it("excludes unknown or empty ranks", () => {
    expect(isDueForStripe("", "White Belt 1 stripe")).toBe(false);
    expect(isDueForStripe("White Belt", "")).toBe(false);
  });
});

describe("isSnoozed", () => {
  const now = new Date("2026-09-10T00:00:00.000Z");

  it("is true before snoozeUntil", () => {
    expect(isSnoozed(new Date("2026-09-17T00:00:00.000Z"), now)).toBe(true);
  });

  it("is false once snooze expires", () => {
    expect(isSnoozed(new Date("2026-09-09T00:00:00.000Z"), now)).toBe(false);
  });

  it("is false when missing", () => {
    expect(isSnoozed(null, now)).toBe(false);
  });
});
