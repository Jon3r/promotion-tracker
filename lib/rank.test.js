import { describe, it, expect } from "vitest";
import { normaliseRank, beltSortIndex } from "./rank";

describe("normaliseRank", () => {
  it.each([
    ["Purple Belt 3 stripe", "purple", 3],
    ["Purple Belt 4 stripe", "purple", 4],
    ["white belts 4 stripe", "white", 4],
    ["white belts 3stripe", "white", 3],
    ["Blue Belt 3 stripe", "blue", 3],
    ["Blue Belt 4 stripe", "blue", 4],
    ["Brown Belt", "brown", null],
    ["Blue Belt", "blue", null],
  ])("parses %s", (raw, belt, stripes) => {
    const result = normaliseRank(raw);
    expect(result.belt).toBe(belt);
    expect(result.stripes).toBe(stripes);
  });

  it("returns unknown for empty", () => {
    expect(normaliseRank("").belt).toBe("unknown");
  });
});

describe("beltSortIndex", () => {
  it("orders adults white before blue", () => {
    expect(beltSortIndex("white", "adults")).toBeLessThan(
      beltSortIndex("blue", "adults")
    );
  });
});
