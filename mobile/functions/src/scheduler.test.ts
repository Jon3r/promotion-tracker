import { describe, expect, it } from "vitest";
import type { ClassSession } from "./clubworx/classes";
import { mockCandidate } from "./mock/clubworx";
import {
  confirmNotificationKey,
  decideNotifications,
  endingNotificationKey,
} from "./scheduler";

const day = "2026-09-10";

const kidsClass: ClassSession = {
  id: "kids-evening",
  title: "Kids BJJ",
  startsAt: "2026-09-10T06:30:00.000Z",
  endsAt: "2026-09-10T07:30:00.000Z",
  startsAtLabel: "label",
  organisation: "Main",
  audience: "kids",
  dayKey: day,
};

const alice = mockCandidate({
  contactKey: "alice",
  firstName: "Alice",
  lastName: "Ng",
});

describe("decideNotifications", () => {
  it("emits class_ending once while the class is running", () => {
    const decisions = decideNotifications({
      now: new Date("2026-09-10T07:20:00.000Z"),
      classes: [kidsClass],
      candidatesByClass: new Map([["kids-evening", [alice]]]),
      snoozes: new Map(),
      alreadySent: new Set(),
      alreadyResolved: new Set(),
    });
    expect(decisions).toHaveLength(1);
    expect(decisions[0].type).toBe("class_ending");
    if (decisions[0].type === "class_ending") {
      expect(decisions[0].candidates).toHaveLength(1);
    }
  });

  it("skips class_ending when already sent", () => {
    const decisions = decideNotifications({
      now: new Date("2026-09-10T07:20:00.000Z"),
      classes: [kidsClass],
      candidatesByClass: new Map([["kids-evening", [alice]]]),
      snoozes: new Map(),
      alreadySent: new Set([endingNotificationKey("kids-evening", day)]),
      alreadyResolved: new Set(),
    });
    expect(decisions).toEqual([]);
  });

  it("skips snoozed students", () => {
    const decisions = decideNotifications({
      now: new Date("2026-09-10T07:20:00.000Z"),
      classes: [kidsClass],
      candidatesByClass: new Map([["kids-evening", [alice]]]),
      snoozes: new Map([["alice", new Date("2026-09-20T00:00:00.000Z")]]),
      alreadySent: new Set(),
      alreadyResolved: new Set(),
    });
    expect(decisions).toEqual([]);
  });

  it("emits per-person confirm after class end", () => {
    const decisions = decideNotifications({
      now: new Date("2026-09-10T07:32:00.000Z"),
      classes: [kidsClass],
      candidatesByClass: new Map([["kids-evening", [alice]]]),
      snoozes: new Map(),
      alreadySent: new Set([endingNotificationKey("kids-evening", day)]),
      alreadyResolved: new Set(),
    });
    expect(decisions).toHaveLength(1);
    expect(decisions[0].type).toBe("confirm");
    expect(decisions[0].key).toBe(confirmNotificationKey("kids-evening", day, "alice"));
  });

  it("does not re-ask after a yes/no is recorded", () => {
    const decisions = decideNotifications({
      now: new Date("2026-09-10T07:32:00.000Z"),
      classes: [kidsClass],
      candidatesByClass: new Map([["kids-evening", [alice]]]),
      snoozes: new Map(),
      alreadySent: new Set(),
      alreadyResolved: new Set(["kids-evening_2026-09-10_alice"]),
    });
    expect(decisions.every((d) => d.type !== "confirm")).toBe(true);
  });
});
