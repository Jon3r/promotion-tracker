import { describe, it, expect } from "vitest";
import {
  serializeDataset,
  deserializeDataset,
} from "./datasetSerialize";

describe("deserializeDataset", () => {
  it("loads serialized blobs from the API (with version)", () => {
    const blob = serializeDataset({
      students: [
        {
          firstName: "Ada",
          lastName: "Lovelace",
          currentRank: "White belt",
          nextRank: "Blue belt",
          beltSize: "A2",
          promotionDate: new Date("2024-06-01"),
          email: "",
          phoneNumber: "",
          mostRecentPromotion: null,
        },
      ],
      fileName: "adults.xlsx",
      savedAt: "2024-06-02T12:00:00.000Z",
    });

    const loaded = deserializeDataset(blob);
    expect(loaded.students).toHaveLength(1);
    expect(loaded.students[0].firstName).toBe("Ada");
    expect(loaded.fileName).toBe("adults.xlsx");
  });

  it("still loads legacy API shape without version when students exist", () => {
    const legacyApiShape = {
      fileName: "adults.xlsx",
      savedAt: "2024-06-02T12:00:00.000Z",
      students: [
        {
          firstName: "Ada",
          lastName: "Lovelace",
          currentRank: "White belt",
          nextRank: "Blue belt",
          beltSize: "A2",
          promotionDate: "2024-06-01T00:00:00.000Z",
          email: "",
          phoneNumber: "",
          mostRecentPromotion: null,
        },
      ],
    };

    const loaded = deserializeDataset(legacyApiShape);
    expect(loaded.students).toHaveLength(1);
    expect(loaded.students[0].promotionDate).toEqual(
      new Date("2024-06-01T00:00:00.000Z")
    );
  });

  it("treats empty {} from the database as an empty roster", () => {
    expect(deserializeDataset({}).students).toHaveLength(0);
  });
});
