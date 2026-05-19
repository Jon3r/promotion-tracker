import { describe, it, expect } from "vitest";
import { collectGiSizesFromMemberStyles } from "./collectGiSizes";

describe("collectGiSizesFromMemberStyles", () => {
  it("collects unique sizes per category", () => {
    const sizes = collectGiSizesFromMemberStyles([
      { style_name: "Brazilian Jiu Jitsu Adults", belt_size: "A2" },
      { style_name: "Brazilian Jiu Jitsu Adults", belt_size: "A3" },
      { style_name: "Brazilian Jiu Jitsu Adults", belt_size: "A2" },
      { style_name: "Brazilian Jiu Jitsu Kids", belt_size: "M1" },
      { style_name: "Other", belt_size: "XL" },
    ]);
    expect(sizes.adults).toEqual(["A2", "A3"]);
    expect(sizes.kids).toEqual(["M1"]);
  });
});
