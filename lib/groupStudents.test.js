import { describe, it, expect } from "vitest";
import { filterByStripe, filterByBelt, applyFilters } from "./groupStudents";

const student = (belt, stripes = null) => ({
  fullName: "Test",
  email: "",
  currentRank: "",
  nextRank: "",
  currentParsed: { belt, stripes, label: "", raw: "" },
});

describe("filterByBelt", () => {
  const roster = [
    student("white", 3),
    student("blue", 4),
    student("purple", 2),
  ];

  it("filters by belt colour", () => {
    expect(filterByBelt(roster, "blue")).toHaveLength(1);
    expect(filterByBelt(roster, "all")).toHaveLength(3);
  });
});

describe("filterByStripe", () => {
  const roster = [
    student("blue", 3),
    student("blue", 4),
    student("blue", null),
    student("blue", 3),
  ];

  it("returns all when no stripes selected", () => {
    expect(filterByStripe(roster, [])).toHaveLength(4);
    expect(filterByStripe(roster, "all")).toHaveLength(4);
  });

  it("filters by single stripe count", () => {
    expect(filterByStripe(roster, "3")).toHaveLength(2);
    expect(filterByStripe(roster, "4")).toHaveLength(1);
  });

  it("filters by multiple stripe counts", () => {
    expect(filterByStripe(roster, ["3", "4"])).toHaveLength(3);
    expect(filterByStripe(roster, ["none", "3"])).toHaveLength(3);
  });

  it("filters students with no stripe count", () => {
    expect(filterByStripe(roster, "none")).toHaveLength(1);
  });
});

describe("applyFilters", () => {
  it("combines search and stripe filters", () => {
    const roster = [
      { ...student("blue", 3), fullName: "Andy Jones", email: "", currentRank: "", nextRank: "" },
      { ...student("blue", 4), fullName: "Other Person", email: "", currentRank: "", nextRank: "" },
    ];
    const result = applyFilters(roster, {
      search: "andy",
      beltFilter: "blue",
      stripeFilters: ["3"],
    });
    expect(result).toHaveLength(1);
    expect(result[0].fullName).toBe("Andy Jones");
  });
});
