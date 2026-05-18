import { describe, it, expect } from "vitest";
import { deduplicateStudents } from "./deduplicate";

const row = (overrides) => ({
  firstName: "Andy",
  lastName: "Jones",
  fullName: "Andy Jones",
  currentRank: "Blue Belt",
  nextRank: "",
  beltSize: "",
  email: "andy@test.com",
  phone: "0400000000",
  promotionDate: null,
  mostRecentPromotion: null,
  currentParsed: { belt: "blue", stripes: null, label: "", raw: "" },
  nextParsed: { belt: "blue", stripes: null, label: "", raw: "" },
  ...overrides,
});

describe("deduplicateStudents", () => {
  it("removes duplicate emails", () => {
    const { students, duplicatesRemoved } = deduplicateStudents([
      row({ promotionDate: new Date("2025-01-01") }),
      row({ firstName: "Andrew", promotionDate: new Date("2026-01-01") }),
    ]);
    expect(students).toHaveLength(1);
    expect(duplicatesRemoved).toBe(1);
    expect(students[0].promotionDate?.getFullYear()).toBe(2026);
  });

  it("keeps different people", () => {
    const { students, duplicatesRemoved } = deduplicateStudents([
      row(),
      row({ email: "other@test.com", fullName: "Other Person", lastName: "Person" }),
    ]);
    expect(students).toHaveLength(2);
    expect(duplicatesRemoved).toBe(0);
  });
});
