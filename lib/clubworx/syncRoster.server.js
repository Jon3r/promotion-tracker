import "server-only";
import { fetchAllClubWorxPages, isClubWorxConfigured } from "./client.server";
import { buildRosterFromClubWorx } from "./mapMemberStyles";
import { saveRoster } from "../rosterDb.server";
import { getGiSizeOverrides } from "../rosterOverridesDb.server";
import { applyGiSizeOverrides } from "../applyGiSizeOverrides";
import { serializeDataset } from "../datasetSerialize";

/**
 * Pull member styles + rankings from ClubWorx and persist to Postgres.
 * @returns {Promise<{ adultsCount: number, kidsCount: number, stats: object, savedAt: string }>}
 */
export async function syncRosterFromClubWorx() {
  if (!isClubWorxConfigured()) {
    throw new Error("CLUBWORX_ACCOUNT_KEY is not configured");
  }

  const excludedRaw = process.env.CLUBWORX_EXCLUDE_MEMBER_STATUSES;
  const excludedStatuses = excludedRaw
    ? excludedRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : ["Cancelled"];

  const [memberStyles, members] = await Promise.all([
    fetchAllClubWorxPages("member_styles"),
    fetchAllClubWorxPages("members"),
  ]);

  const { adults: adultsRaw, kids: kidsRaw, stats } = buildRosterFromClubWorx(
    memberStyles,
    members,
    { excludedStatuses }
  );

  const giOverrides = await getGiSizeOverrides();
  const adults = applyGiSizeOverrides(adultsRaw, giOverrides.adults);
  const kids = applyGiSizeOverrides(kidsRaw, giOverrides.kids);

  const savedAt = new Date().toISOString();
  const fileName = `ClubWorx · ${savedAt.slice(0, 10)}`;

  await saveRoster({
    adults: serializeDataset({
      students: adults,
      fileName,
      savedAt,
    }),
    kids: serializeDataset({
      students: kids,
      fileName,
      savedAt,
    }),
  });

  return {
    adultsCount: adults.length,
    kidsCount: kids.length,
    stats,
    savedAt,
    fileName,
  };
}
