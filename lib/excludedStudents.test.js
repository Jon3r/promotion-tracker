import { describe, it, expect } from "vitest";
import {
  exclusionKey,
  withoutExcluded,
} from "./excludedStudents";

function student(overrides = {}) {
  return {
    firstName: "Ada",
    lastName: "Lovelace",
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    phone: "",
    currentRank: "White",
    nextRank: "Blue",
    beltSize: "",
    promotionDate: null,
    mostRecentPromotion: null,
    ...overrides,
  };
}

describe("withoutExcluded", () => {
  it("removes students whose keys are in the excluded list", () => {
    const s = student();
    const key = exclusionKey("adults", s);
    const result = withoutExcluded([s, student({ email: "other@example.com" })], "adults", [
      key,
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("other@example.com");
  });
});
