import { describe, expect, it } from "vitest";
import { extractClubWorxCollection } from "./collection";

describe("extractClubWorxCollection", () => {
  it("returns payload when already an array", () => {
    const rows = [{ id: 1 }, { id: 2 }];
    expect(extractClubWorxCollection(rows, "events")).toEqual(rows);
  });

  it("extracts endpoint-named arrays", () => {
    const payload = { events: [{ id: 1 }] };
    expect(extractClubWorxCollection(payload, "events")).toEqual([{ id: 1 }]);
  });

  it("extracts generic data arrays", () => {
    const payload = { data: [{ id: 10 }] };
    expect(extractClubWorxCollection(payload, "bookings")).toEqual([{ id: 10 }]);
  });

  it("falls back when object has single array property", () => {
    const payload = { page: 1, values: [{ id: 7 }] };
    expect(extractClubWorxCollection(payload, "members")).toEqual([{ id: 7 }]);
  });

  it("returns null when no collection is discoverable", () => {
    expect(extractClubWorxCollection({ ok: true }, "events")).toBe(null);
  });
});

