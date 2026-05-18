import { describe, it, expect, beforeEach, vi } from "vitest";
import { saveDataset, loadDataset, clearSavedDataset } from "./storage";

describe("storage", () => {
  beforeEach(() => {
    const store = {};
    vi.stubGlobal("localStorage", {
      getItem: (key) => store[key] ?? null,
      setItem: (key, value) => {
        store[key] = value;
      },
      removeItem: (key) => {
        delete store[key];
      },
    });
    clearSavedDataset("adults");
  });

  it("round-trips student data with dates", () => {
    const promotionDate = new Date("2026-03-27");
    saveDataset("adults", {
      fileName: "adults.xlsx",
      error: null,
      students: [
        {
          firstName: "Andy",
          lastName: "Jones",
          fullName: "Andy Jones",
          currentRank: "Purple Belt 3 stripe",
          nextRank: "Purple Belt 4 stripe",
          beltSize: "A3",
          email: "a@b.com",
          phone: "1",
          promotionDate,
          mostRecentPromotion: null,
          currentParsed: { belt: "purple", stripes: 3, label: "", raw: "" },
          nextParsed: { belt: "purple", stripes: 4, label: "", raw: "" },
        },
      ],
    });

    const loaded = loadDataset("adults");
    expect(loaded?.fileName).toBe("adults.xlsx");
    expect(loaded?.students).toHaveLength(1);
    expect(loaded?.students[0].promotionDate?.toISOString()).toBe(
      promotionDate.toISOString()
    );
  });
});
