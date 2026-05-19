import { describe, it, expect } from "vitest";
import {
  giSizeOptionsForCategory,
  giSizeSortIndex,
  buildGiSizeOptions,
} from "./giSizes";

describe("giSizes", () => {
  it("includes adult presets", () => {
    const opts = giSizeOptionsForCategory("adults");
    expect(opts).toContain("A2");
    expect(opts).toContain("M2");
  });

  it("merges fetched and student sizes", () => {
    const opts = buildGiSizeOptions(
      "adults",
      ["A2L"],
      [{ beltSize: "Custom" }]
    );
    expect(opts).toContain("A2L");
    expect(opts).toContain("Custom");
  });

  it("sorts unknown sizes last", () => {
    expect(giSizeSortIndex("A2", "adults")).toBeLessThan(
      giSizeSortIndex("", "adults")
    );
  });
});
