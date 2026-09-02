import { describe, expect, it } from "vitest";
import { isReadyToPromote } from "./readyToPromote";

describe("isReadyToPromote", () => {
  it("returns true from explicit readyToPromote flag", () => {
    expect(isReadyToPromote({ readyToPromote: true, nextRank: "" })).toBe(true);
  });

  it("returns true when next rank text says ready to promote", () => {
    expect(isReadyToPromote({ readyToPromote: false, nextRank: "Ready to Promote" })).toBe(true);
  });

  it("returns true when next rank text says ready for promotion", () => {
    expect(isReadyToPromote({ readyToPromote: false, nextRank: "Ready for Promotion" })).toBe(true);
  });

  it("returns true when next parsed belt differs from current", () => {
    expect(
      isReadyToPromote({
        readyToPromote: false,
        nextRank: "Blue Belt",
        currentParsed: { belt: "white", stripes: 0 },
        nextParsed: { belt: "blue", stripes: null },
      })
    ).toBe(true);
  });

  it("returns true when next parsed stripes are higher", () => {
    expect(
      isReadyToPromote({
        readyToPromote: false,
        nextRank: "White Belt 2 stripe",
        currentParsed: { belt: "white", stripes: 1 },
        nextParsed: { belt: "white", stripes: 2 },
      })
    ).toBe(true);
  });

  it("returns false when current and next parsed ranks are equal", () => {
    expect(
      isReadyToPromote({
        readyToPromote: false,
        nextRank: "White Belt",
        currentParsed: { belt: "white", stripes: 0 },
        nextParsed: { belt: "white", stripes: 0 },
      })
    ).toBe(false);
  });

  it("returns false for normal next rank values", () => {
    expect(isReadyToPromote({ readyToPromote: false, nextRank: "Blue Belt" })).toBe(false);
  });
});

