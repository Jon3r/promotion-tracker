import { describe, it, expect } from "vitest";
import {
  filterByStripe,
  filterByBelt,
  applyFilters,
  groupByBelt,
} from "./groupStudents";
import { normaliseRank } from "./rank";

const student = (belt, stripes = null, nextBelt = belt, nextStripes = stripes) => ({
  fullName: "Test",
  email: "",
  currentRank: "",
  nextRank: "",
  currentParsed: { belt, stripes, label: "", raw: "" },
  nextParsed: { belt: nextBelt, stripes: nextStripes, label: "", raw: "" },
});

describe("groupByBelt", () => {
  it("groups by next belt when groupByNext is set (PDF grading list)", () => {
    const roster = [
      {
        ...student("white", 4, "blue", null),
        fullName: "Promoting to Blue",
        nextRank: "Blue Belt",
        nextParsed: normaliseRank("Blue Belt"),
        currentParsed: normaliseRank("white belts 4 stripe"),
      },
      {
        ...student("white", 3, "white", 4),
        fullName: "Staying on White",
        nextRank: "white belts 4 stripe",
        nextParsed: normaliseRank("white belts 4 stripe"),
        currentParsed: normaliseRank("white belts 3 stripe"),
      },
    ];

    const byCurrent = groupByBelt(roster, "adults", "name");
    expect(byCurrent.get("white")).toHaveLength(2);

    const byNext = groupByBelt(roster, "adults", "name", { groupByNext: true });
    expect(byNext.get("white")).toHaveLength(1);
    expect(byNext.get("blue")).toHaveLength(1);
    expect(byNext.get("blue")[0].fullName).toBe("Promoting to Blue");
  });
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
