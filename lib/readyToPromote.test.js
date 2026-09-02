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

  it("returns false for normal next rank values", () => {
    expect(isReadyToPromote({ readyToPromote: false, nextRank: "Blue Belt" })).toBe(false);
  });
});

