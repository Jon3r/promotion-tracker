import { describe, it, expect } from "vitest";
import {
  nextBeltInSequence,
  effectiveGradingBelt,
  mergeGradingOverrides,
} from "./gradingBelt";

const student = (overrides = {}) => ({
  contactKey: "ck1",
  nextParsed: { belt: "white", stripes: null },
  currentParsed: { belt: "white", stripes: null },
  gradingBeltOverride: null,
  ...overrides,
});

describe("nextBeltInSequence", () => {
  it("returns next adult belt", () => {
    expect(nextBeltInSequence("white", "adults")).toBe("blue");
    expect(nextBeltInSequence("blue", "adults")).toBe("purple");
  });

  it("returns null at top belt", () => {
    expect(nextBeltInSequence("black", "adults")).toBe(null);
  });
});

describe("effectiveGradingBelt", () => {
  it("uses override when set", () => {
    expect(
      effectiveGradingBelt(student({ gradingBeltOverride: "blue" }))
    ).toBe("blue");
  });

  it("defaults to next belt", () => {
    expect(
      effectiveGradingBelt(student({ nextParsed: { belt: "purple" } }))
    ).toBe("purple");
  });
});

describe("mergeGradingOverrides", () => {
  it("applies overrides by contact key", () => {
    const merged = mergeGradingOverrides([student()], { ck1: "brown" });
    expect(merged[0].gradingBeltOverride).toBe("brown");
  });
});
