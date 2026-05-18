import { describe, it, expect } from "vitest";
import { describeFilters } from "./exportReport";

describe("describeFilters", () => {
  it("describes active filters", () => {
    expect(
      describeFilters({
        search: "andy",
        beltFilter: "blue",
        stripeFilters: ["3", "4"],
      })
    ).toContain("belt=Blue");
    expect(
      describeFilters({ stripeFilters: ["3", "4"] })
    ).toContain("3 stripes or 4 stripes");
    expect(describeFilters({})).toBe("no filters");
  });
});
