import { describe, it, expect } from "vitest";
import {
  categoryFromStyleName,
  buildRosterFromClubWorx,
} from "./mapMemberStyles";

describe("categoryFromStyleName", () => {
  it("maps BJJ Adults and Kids style names", () => {
    expect(categoryFromStyleName("Brazilian Jiu Jitsu Adults")).toBe("adults");
    expect(categoryFromStyleName("Brazilian Jiu Jitsu Kids")).toBe("kids");
    expect(categoryFromStyleName("Karate")).toBe(null);
  });
});

describe("buildRosterFromClubWorx", () => {
  const members = [
    {
      contact_key: "adult-1",
      first_name: "Alex",
      last_name: "Adult",
      email: "alex@example.com",
      phone: "0400000000",
      status: "Active",
    },
    {
      contact_key: "kid-1",
      first_name: "Kim",
      last_name: "Kid",
      email: "kim@example.com",
      phone: "",
      status: "Active",
    },
    {
      contact_key: "gone-1",
      first_name: "Old",
      last_name: "Member",
      email: "old@example.com",
      phone: "",
      status: "Cancelled",
    },
  ];

  const memberStyles = [
    {
      id: 83621,
      style_name: "Brazilian Jiu Jitsu Adults",
      contact_key: "adult-1",
      contact_first_name: "Alex",
      contact_last_name: "Adult",
      current_rank_name: "white belt",
      next_rank_name: "white belts 1 stripe",
      belt_size: "A2",
      last_promoted_on: "2024-01-15",
    },
    {
      style_name: "Brazilian Jiu Jitsu Kids",
      contact_key: "kid-1",
      contact_first_name: "Kim",
      contact_last_name: "Kid",
      current_rank_name: "Grey White Belt",
      next_rank_name: "Grey White Belt 1 stripe",
      belt_size: null,
      last_promoted_on: "2025-03-01",
    },
    {
      style_name: "Brazilian Jiu Jitsu Adults",
      contact_key: "gone-1",
      contact_first_name: "Old",
      contact_last_name: "Member",
      current_rank_name: "Blue Belt",
      next_rank_name: "Blue Belt 1 stripe",
      belt_size: null,
      last_promoted_on: "2020-01-01",
    },
  ];

  it("splits active members into adults and kids rosters", () => {
    const { adults, kids, stats } = buildRosterFromClubWorx(
      memberStyles,
      members
    );

    expect(adults).toHaveLength(1);
    expect(kids).toHaveLength(1);
    expect(adults[0].fullName).toBe("Alex Adult");
    expect(adults[0].currentRank).toBe("white belt");
    expect(adults[0].email).toBe("alex@example.com");
    expect(adults[0].memberStyleId).toBe(83621);
    expect(kids[0].fullName).toBe("Kim Kid");
    expect(kids[0].currentParsed.belt).toBe("greywhite");
    expect(stats.skippedExcludedStatus).toBe(1);
  });
});
