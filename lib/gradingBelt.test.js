import { describe, it, expect } from "vitest";
import {
  nextBeltInSequence,
  nextBeltColor,
  displayNextRank,
  effectiveGradingBelt,
  mergeGradingOverrides,
} from "./gradingBelt";

const student = (overrides = {}) => ({
  contactKey: "ck1",
  nextRank: "",
  currentParsed: { belt: "white", stripes: null },
  nextParsed: { belt: "white", stripes: null },
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

describe("nextBeltColor", () => {
  it("skips stripe promotion to next colour", () => {
    expect(
      nextBeltColor(
        student({
          currentParsed: { belt: "purple", stripes: 3 },
          nextParsed: { belt: "purple", stripes: 4 },
          nextRank: "Purple Belt 4 stripe",
        }),
        "adults"
      )
    ).toBe("brown");
  });

  it("uses ClubWorx next when it is already the next colour", () => {
    expect(
      nextBeltColor(
        student({
          currentParsed: { belt: "purple", stripes: 4 },
          nextParsed: { belt: "brown", stripes: null },
          nextRank: "Brown Belt",
        }),
        "adults"
      )
    ).toBe("brown");
  });
});

describe("displayNextRank", () => {
  it("shows next colour label for stripe-only promotion", () => {
    expect(
      displayNextRank(
        student({
          currentParsed: { belt: "purple", stripes: 3 },
          nextParsed: { belt: "purple", stripes: 4 },
          nextRank: "Purple Belt 4 stripe",
        }),
        "adults"
      )
    ).toBe("Brown Belt");
  });
});

describe("effectiveGradingBelt", () => {
  it("uses override when set", () => {
    expect(
      effectiveGradingBelt(student({ gradingBeltOverride: "blue" }), "adults")
    ).toBe("blue");
  });

  it("defaults to next colour not stripe", () => {
    expect(
      effectiveGradingBelt(
        student({
          currentParsed: { belt: "purple", stripes: 3 },
          nextParsed: { belt: "purple", stripes: 4 },
        }),
        "adults"
      )
    ).toBe("brown");
  });
});

describe("mergeGradingOverrides", () => {
  it("applies overrides by contact key", () => {
    const merged = mergeGradingOverrides([student()], { ck1: "brown" });
    expect(merged[0].gradingBeltOverride).toBe("brown");
  });
});
