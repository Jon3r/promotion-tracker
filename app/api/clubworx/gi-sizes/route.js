import { NextResponse } from "next/server";
import {
  fetchAllClubWorxPages,
  isClubWorxConfigured,
} from "@/lib/clubworx/client.server";
import { collectGiSizesFromMemberStyles } from "@/lib/clubworx/collectGiSizes";
import { baseGiSizePresets } from "@/lib/giSizes";
import { getRoster, isPostgresConfigured } from "@/lib/rosterDb.server";
import { deserializeDataset } from "@/lib/datasetSerialize";

/**
 * @param {'adults'|'kids'} category
 * @param {string[]} fetched
 */
function mergeSizes(category, fetched) {
  const seen = new Set();
  const out = [];
  for (const size of [...baseGiSizePresets(category), ...fetched]) {
    const key = size.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(size);
  }
  out.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return out;
}

/**
 * @param {import('@/lib/parseExcel').Student[]} students
 * @returns {string[]}
 */
function sizesFromStudents(students) {
  const sizes = new Set();
  for (const s of students) {
    const size = s.beltSize != null ? String(s.beltSize).trim() : "";
    if (size) sizes.add(size);
  }
  return [...sizes];
}

export async function GET() {
  if (!isClubWorxConfigured()) {
    return NextResponse.json(
      { error: "ClubWorx is not configured", configured: false },
      { status: 503 }
    );
  }

  try {
    // Prefer saved roster so the dashboard does not re-fetch all member_styles
    // (which competes with Sync and triggers ClubWorx 429s).
    if (isPostgresConfigured()) {
      const roster = await getRoster();
      if (roster) {
        const adults = deserializeDataset(roster.adults).students || [];
        const kids = deserializeDataset(roster.kids).students || [];
        if (adults.length || kids.length) {
          return NextResponse.json({
            configured: true,
            source: "roster",
            adults: mergeSizes("adults", sizesFromStudents(adults)),
            kids: mergeSizes("kids", sizesFromStudents(kids)),
          });
        }
      }
    }

    const memberStyles = await fetchAllClubWorxPages("member_styles");
    const fromClubWorx = collectGiSizesFromMemberStyles(memberStyles);

    return NextResponse.json({
      configured: true,
      source: "clubworx",
      adults: mergeSizes("adults", fromClubWorx.adults),
      kids: mergeSizes("kids", fromClubWorx.kids),
    });
  } catch (e) {
    console.error("fetch gi sizes failed:", e);
    const message =
      e instanceof Error ? e.message : "Could not load Gi sizes from ClubWorx";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
