import { describe, expect, it } from "vitest";
import { MOCK_STYLES } from "./mock/clubworx";
import { findMatchingRank, flattenStyleRanks, promoteMemberStyleRank } from "./promote";

describe("flattenStyleRanks / findMatchingRank", () => {
  it("finds the next stripe rank id", () => {
    const ranks = flattenStyleRanks(MOCK_STYLES);
    const match = findMatchingRank(ranks, "Grey Belt 3 stripe");
    expect(match?.id).toBe("kg3");
  });
});

describe("promoteMemberStyleRank", () => {
  it("returns a warning when there is no member style id", async () => {
    const result = await promoteMemberStyleRank({
      memberStyleId: null,
      nextRankName: "White Belt 1 stripe",
      styles: MOCK_STYLES,
    });
    expect(result.ok).toBe(true);
    expect(result.clubworxSynced).toBe(false);
  });

  it("syncs when ClubWorx accepts a rank id update", async () => {
    const result = await promoteMemberStyleRank({
      memberStyleId: 11,
      nextRankName: "Grey Belt 3 stripe",
      styles: MOCK_STYLES,
      update: async () => ({ ok: true, body: {} }),
    });
    expect(result).toEqual({ ok: true, clubworxSynced: true });
  });

  it("keeps the confirmation when ClubWorx returns 404", async () => {
    const result = await promoteMemberStyleRank({
      memberStyleId: 11,
      nextRankName: "Grey Belt 3 stripe",
      styles: MOCK_STYLES,
      update: async () => ({
        ok: false,
        status: 404,
        message: "ClubWorx API does not support updating rank",
      }),
    });
    expect(result.ok).toBe(true);
    expect(result.clubworxSynced).toBe(false);
    expect(result.warning).toMatch(/manually/i);
  });
});
