import { describe, expect, it } from "vitest";
import { extractClubWorxCollection } from "./collection";

describe("extractClubWorxCollection", () => {
  it("returns payload when already an array", () => {
    const rows = [{ id: 1 }, { id: 2 }];
    expect(extractClubWorxCollection(rows, "events")).toEqual(rows);
  });

  it("extracts endpoint-named arrays", () => {
    expect(extractClubWorxCollection({ events: [{ id: 1 }] }, "events")).toEqual([{ id: 1 }]);
  });

  it("extracts generic data arrays", () => {
    expect(extractClubWorxCollection({ data: [{ id: 10 }] }, "bookings")).toEqual([{ id: 10 }]);
  });

  it("falls back when object has single array property", () => {
    expect(extractClubWorxCollection({ page: 1, values: [{ id: 7 }] }, "members")).toEqual([
      { id: 7 },
    ]);
  });

  it("returns null when no collection is discoverable", () => {
    expect(extractClubWorxCollection({ ok: true }, "events")).toBe(null);
  });
});
