import { NextResponse } from "next/server";
import {
  fetchAllClubWorxPages,
  isClubWorxConfigured,
} from "@/lib/clubworx/client.server";
import { collectGiSizesFromMemberStyles } from "@/lib/clubworx/collectGiSizes";
import { baseGiSizePresets } from "@/lib/giSizes";

export async function GET() {
  if (!isClubWorxConfigured()) {
    return NextResponse.json(
      { error: "ClubWorx is not configured", configured: false },
      { status: 503 }
    );
  }

  try {
    const memberStyles = await fetchAllClubWorxPages("member_styles");
    const fromClubWorx = collectGiSizesFromMemberStyles(memberStyles);

    const merge = (category, fetched) => {
      const seen = new Set();
      const out = [];
      for (const size of [
        ...baseGiSizePresets(category),
        ...fetched,
      ]) {
        const key = size.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(size);
      }
      out.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      return out;
    };

    return NextResponse.json({
      configured: true,
      adults: merge("adults", fromClubWorx.adults),
      kids: merge("kids", fromClubWorx.kids),
    });
  } catch (e) {
    console.error("fetch gi sizes failed:", e);
    const message =
      e instanceof Error ? e.message : "Could not load Gi sizes from ClubWorx";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
