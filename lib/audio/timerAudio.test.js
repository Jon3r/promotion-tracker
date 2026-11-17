import { describe, expect, it } from "vitest";
import { resolveRoundAnnouncement } from "./timerAudio";

describe("resolveRoundAnnouncement", () => {
  it("announces Round N + Fight for rounds 1-5", () => {
    expect(resolveRoundAnnouncement({ round: 1 })).toEqual(["round_1", "fight"]);
    expect(resolveRoundAnnouncement({ round: 5 })).toEqual(["round_5", "fight"]);
  });

  it("uses Final Round + Fight for the last scheduled round after round 1", () => {
    expect(resolveRoundAnnouncement({ round: 6, isFinal: true })).toEqual([
      "final_round",
      "fight",
    ]);
    expect(resolveRoundAnnouncement({ round: 3, isFinal: true })).toEqual([
      "final_round",
      "fight",
    ]);
  });

  it("still says Round 1 when the session is only one round", () => {
    expect(resolveRoundAnnouncement({ round: 1, isFinal: true })).toEqual([
      "round_1",
      "fight",
    ]);
  });

  it("falls back to Fight alone for rounds beyond the clip pack", () => {
    expect(resolveRoundAnnouncement({ round: 8 })).toEqual(["fight"]);
    expect(resolveRoundAnnouncement({})).toEqual(["fight"]);
  });
});
