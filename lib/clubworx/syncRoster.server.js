import "server-only";
import { fetchAllClubWorxPages, isClubWorxConfigured } from "./client.server";
import { buildRosterFromClubWorx } from "./mapMemberStyles";
import { getRoster, saveRoster } from "../rosterDb.server";
import { getGiSizeOverrides } from "../rosterOverridesDb.server";
import { applyGiSizeOverrides } from "../applyGiSizeOverrides";
import { deserializeDataset, serializeDataset } from "../datasetSerialize";
import {
  collectIncrementalTouchedKeys,
  mergeIncrementalStudents,
} from "./incrementalSync";
import { isClubWorxRateLimitError } from "./retry";

/**
 * @param {string} endpoint
 * @param {Record<string, string>} [extraParams]
 */
async function fetchEndpoint(endpoint, extraParams) {
  return fetchAllClubWorxPages(endpoint, extraParams);
}

/**
 * Pull member styles + rankings from ClubWorx and persist to Postgres.
 * Fetches endpoints sequentially to reduce ClubWorx rate-limit pressure.
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

  const previousRoster = await getRoster();
  const incrementalSince = previousRoster?.updatedAt || null;
  const allowIncremental =
    process.env.CLUBWORX_INCREMENTAL_SYNC !== "0" && Boolean(incrementalSince);
  const incrementalParam =
    process.env.CLUBWORX_UPDATED_AFTER_PARAM?.trim() || "updated_after";

  let memberStyles;
  let members;
  let incremental = false;

  if (allowIncremental && incrementalSince) {
    const filter = { [incrementalParam]: incrementalSince };
    try {
      memberStyles = await fetchEndpoint("member_styles", filter);
      members = await fetchEndpoint("members", filter);
      incremental = true;
    } catch (error) {
      // A 429 means ClubWorx is already overloaded — do not immediately start a
      // full dual-endpoint sync that would make the rate limit worse.
      if (isClubWorxRateLimitError(error)) {
        throw error;
      }
      console.warn("Incremental ClubWorx sync failed; using full sync.", error);
      memberStyles = await fetchEndpoint("member_styles");
      members = await fetchEndpoint("members");
    }
  } else {
    memberStyles = await fetchEndpoint("member_styles");
    members = await fetchEndpoint("members");
  }

  const { adults: adultsRaw, kids: kidsRaw, stats } = buildRosterFromClubWorx(
    memberStyles,
    members,
    { excludedStatuses }
  );

  let nextAdults = adultsRaw;
  let nextKids = kidsRaw;
  if (incremental && previousRoster) {
    const previousAdults = deserializeDataset(previousRoster.adults).students;
    const previousKids = deserializeDataset(previousRoster.kids).students;
    const { touchedContactKeys, touchedMemberStyleIds } =
      collectIncrementalTouchedKeys(memberStyles);
    const excludedSet = new Set(excludedStatuses);

    // Remove members who have moved into excluded statuses even if only the
    // member record changed and member_styles was unchanged.
    for (const member of members) {
      const status = String(member?.status || "").trim();
      if (!excludedSet.has(status)) continue;
      const contactKey = String(member?.contact_key || "").trim();
      if (contactKey) touchedContactKeys.add(contactKey);
    }

    nextAdults = mergeIncrementalStudents(
      previousAdults,
      adultsRaw,
      touchedContactKeys,
      touchedMemberStyleIds
    );
    nextKids = mergeIncrementalStudents(
      previousKids,
      kidsRaw,
      touchedContactKeys,
      touchedMemberStyleIds
    );
  }

  const giOverrides = await getGiSizeOverrides();
  const adults = applyGiSizeOverrides(nextAdults, giOverrides.adults);
  const kids = applyGiSizeOverrides(nextKids, giOverrides.kids);

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
    stats: {
      ...stats,
      incremental,
      incrementalSince,
      incrementalParam: incremental ? incrementalParam : null,
    },
    savedAt,
    fileName,
  };
}
