import { NextResponse } from "next/server";
import { getRoster, isPostgresConfigured } from "@/lib/rosterDb.server";
import { isClubWorxConfigured } from "@/lib/clubworx/client.server";
import { syncRosterFromClubWorx } from "@/lib/clubworx/syncRoster.server";
import { isClubWorxRateLimitError } from "@/lib/clubworx/retry";

export const maxDuration = 300;

const DEFAULT_STALE_MINUTES = 30;

function staleAfterMs() {
  const raw = Number(process.env.ROSTER_AUTO_SYNC_MINUTES);
  const minutes = Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_STALE_MINUTES;
  return minutes * 60 * 1000;
}

/**
 * Page-load refresh. No password: it only pulls from ClubWorx, and only when
 * the saved roster is older than ROSTER_AUTO_SYNC_MINUTES.
 */
export async function POST() {
  if (!isPostgresConfigured() || !isClubWorxConfigured()) {
    return NextResponse.json(
      { error: "Database or ClubWorx is not configured" },
      { status: 503 }
    );
  }

  try {
    const roster = await getRoster();
    const updatedAt = roster?.updatedAt ? new Date(roster.updatedAt).getTime() : 0;
    if (updatedAt && Date.now() - updatedAt < staleAfterMs()) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        updatedAt: roster.updatedAt,
      });
    }

    const result = await syncRosterFromClubWorx();
    return NextResponse.json({
      ok: true,
      skipped: false,
      adultsCount: result.adultsCount,
      kidsCount: result.kidsCount,
      savedAt: result.savedAt,
    });
  } catch (e) {
    console.error("ClubWorx auto refresh failed:", e);
    const isRateLimit = isClubWorxRateLimitError(e);
    return NextResponse.json(
      {
        error: isRateLimit
          ? "ClubWorx is busy (429). Showing the last saved roster."
          : e instanceof Error
            ? e.message
            : "Could not refresh roster from ClubWorx",
      },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
