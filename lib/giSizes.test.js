import { describe, it, expect } from "vitest";
import { giSizeOptionsForCategory, giSizeSortIndex } from "./giSizes";

describe("giSizes", () => {
  it("includes adult presets", () => {
    const opts = giSizeOptionsForCategory("adults");
    expect(opts).toContain("A2");
    expect(opts).toContain("M2");
  });

  it("sorts unknown sizes last", () => {
    expect(giSizeSortIndex("A2", "adults")).toBeLessThan(
      giSizeSortIndex("", "adults")
    );
  });
});
