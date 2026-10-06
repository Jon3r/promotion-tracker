import { describe, it, expect } from "vitest";
import {
  nextBeltInSequence,
  nextBeltColor,
  displayNextRank,
  effectiveGradingBelt,
  mergeGradingOverrides,
  pdfGroupOptions,
  kidsNextBeltKey,
  kidsNextBeltPromotion,
  solidBeltForWhiteVariant,
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
  it("shows next colour label for stripe-only promotion (adults)", () => {
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

  it("shows ClubWorx next rank for kids", () => {
    expect(
      displayNextRank(
        student({
          currentParsed: { belt: "grey", stripes: 2 },
          nextParsed: { belt: "grey", stripes: 3 },
          nextRank: "Grey Belt 3 stripe",
        }),
        "kids"
      )
    ).toBe("Grey Belt 3 stripe");
  });

  it("shows green/white when ClubWorx lists green after orange black", () => {
    expect(
      displayNextRank(
        student({
          currentParsed: { belt: "orangeblack", stripes: null },
          nextParsed: { belt: "green", stripes: null },
          nextRank: "Green Belt",
        }),
        "kids"
      )
    ).toBe("Green/White Belt");
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

describe("kidsNextBeltKey", () => {
  it("maps ClubWorx Green Belt to greenwhite after orange black", () => {
    expect(
      kidsNextBeltKey(
        student({
          currentParsed: { belt: "orangeblack", stripes: null },
          nextParsed: { belt: "green", stripes: null },
          nextRank: "Green Belt",
        })
      )
    ).toBe("greenwhite");
  });

  it("keeps stripe promotion on the same colour", () => {
    expect(
      kidsNextBeltKey(
        student({
          currentParsed: { belt: "grey", stripes: 2 },
          nextParsed: { belt: "grey", stripes: 3 },
          nextRank: "Grey Belt 3 stripe",
        })
      )
    ).toBe("grey");
  });
});

describe("kids next belt list", () => {
  const greyWhite3 = student({
    currentParsed: { belt: "greywhite", stripes: 3 },
    nextParsed: { belt: "greywhite", stripes: 4 },
    nextRank: "Grey/White Belt 4 stripe",
  });

  it("offers the next belt colour for a stripe promotion", () => {
    expect(kidsNextBeltPromotion(greyWhite3)).toBe("grey");
  });

  it("does not offer a move when ClubWorx already has the next belt", () => {
    expect(
      kidsNextBeltPromotion(
        student({
          currentParsed: { belt: "greywhite", stripes: 4 },
          nextParsed: { belt: "grey", stripes: null },
          nextRank: "Grey Belt",
        })
      )
    ).toBe(null);
  });

  it("groups and labels a moved kid under the next belt", () => {
    const moved = { ...greyWhite3, gradingBeltOverride: "grey" };
    expect(kidsNextBeltKey(moved)).toBe("grey");
    expect(displayNextRank(moved, "kids")).toBe("Grey Belt");
    expect(kidsNextBeltPromotion(moved)).toBe("grey");
  });

  it("ignores a stale move once ClubWorx has promoted them", () => {
    const promoted = student({
      currentParsed: { belt: "grey", stripes: null },
      nextParsed: { belt: "grey", stripes: 1 },
      nextRank: "Grey Belt 1 stripe",
      gradingBeltOverride: "grey",
    });
    expect(kidsNextBeltKey(promoted)).toBe("grey");
    expect(displayNextRank(promoted, "kids")).toBe("Grey Belt 1 stripe");
    expect(kidsNextBeltPromotion(promoted)).toBe("greyblack");
  });
});

describe("solidBeltForWhiteVariant", () => {
  it("returns solid colour for slash belts", () => {
    expect(solidBeltForWhiteVariant("greenwhite")).toBe("green");
    expect(solidBeltForWhiteVariant("white")).toBe(null);
  });
});

describe("pdfGroupOptions", () => {
  it("groups kids PDF by next belt from ClubWorx", () => {
    expect(pdfGroupOptions("kids")).toEqual({ groupByNext: true });
  });

  it("groups adults PDF by next belt colour (grading belt)", () => {
    expect(pdfGroupOptions("adults")).toEqual({ groupByGrading: true });
  });
});

describe("mergeGradingOverrides", () => {
  it("applies overrides by contact key", () => {
    const merged = mergeGradingOverrides([student()], { ck1: "brown" });
    expect(merged[0].gradingBeltOverride).toBe("brown");
  });
});
