import { describe, expect, it } from "vitest";
import {
  collectIncrementalTouchedKeys,
  mergeIncrementalStudents,
} from "./incrementalSync";

function student(overrides = {}) {
  return {
    firstName: "Test",
    lastName: "Student",
    fullName: "Test Student",
    currentRank: "White Belt",
    nextRank: "Blue Belt",
    beltSize: "",
    email: "",
    phone: "",
    promotionDate: null,
    mostRecentPromotion: null,
    currentParsed: { belt: "white", stripes: null, label: "White Belt", raw: "" },
    nextParsed: { belt: "blue", stripes: null, label: "Blue Belt", raw: "" },
    ...overrides,
  };
}

describe("collectIncrementalTouchedKeys", () => {
  it("collects contact keys and member style ids", () => {
    const { touchedContactKeys, touchedMemberStyleIds } =
      collectIncrementalTouchedKeys([
        { contact_key: "a1", id: 10 },
        { contact_key: "k1", id: 11 },
      ]);

    expect(touchedContactKeys.has("a1")).toBe(true);
    expect(touchedContactKeys.has("k1")).toBe(true);
    expect(touchedMemberStyleIds.has(10)).toBe(true);
    expect(touchedMemberStyleIds.has(11)).toBe(true);
  });
});

describe("mergeIncrementalStudents", () => {
  it("replaces touched students and keeps untouched rows", () => {
    const existing = [
      student({ contactKey: "adult-1", memberStyleId: 1, fullName: "Adult One" }),
      student({ contactKey: "adult-2", memberStyleId: 2, fullName: "Adult Two" }),
    ];
    const updates = [
      student({
        contactKey: "adult-1",
        memberStyleId: 1,
        fullName: "Adult One Updated",
      }),
    ];

    const merged = mergeIncrementalStudents(
      existing,
      updates,
      new Set(["adult-1"]),
      new Set([1])
    );

    expect(merged).toHaveLength(2);
    expect(merged.some((s) => s.fullName === "Adult One Updated")).toBe(true);
    expect(merged.some((s) => s.fullName === "Adult Two")).toBe(true);
  });
});

