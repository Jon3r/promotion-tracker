import { describe, it, expect } from "vitest";
import { applyGiSizeOverrides } from "./applyGiSizeOverrides";

describe("applyGiSizeOverrides", () => {
  it("applies overrides by contact key", () => {
    const students = [
      { contactKey: "a1", beltSize: "A2", fullName: "Alex" },
      { contactKey: "b1", beltSize: "", fullName: "Bob" },
    ];
    const merged = applyGiSizeOverrides(students, { a1: "A3" });
    expect(merged[0].beltSize).toBe("A3");
    expect(merged[1].beltSize).toBe("");
  });
});
