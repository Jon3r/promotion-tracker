import { NextResponse } from "next/server";
import {
  upsertGradingOverride,
  deleteGradingOverride,
  isPostgresConfigured,
} from "@/lib/rosterOverridesDb.server";
import { verifyUploadSecret } from "@/lib/authSecret.server";
import { syncRosterFromClubWorx } from "@/lib/clubworx/syncRoster.server";
import { isClubWorxConfigured } from "@/lib/clubworx/client.server";
import { isClubWorxRateLimitError } from "@/lib/clubworx/retry";

export const maxDuration = 300;

/**
 * Light write actions for the Flutter Grading tab.
 * Body: { action: "setOverride" | "clearOverride" | "sync", ... }
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!verifyUploadSecret(request, body)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPostgresConfigured()) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  const action = String(body.action || "").trim();

  try {
    if (action === "setOverride" || action === "clearOverride") {
      const category = body.category === "kids" ? "kids" : "adults";
      const contactKey = String(body.contactKey || "").trim();
      if (!contactKey) {
        return NextResponse.json({ error: "Missing contactKey" }, { status: 400 });
      }
      if (action === "clearOverride" || !body.gradingBelt) {
        await deleteGradingOverride(category, contactKey);
        return NextResponse.json({ ok: true, cleared: true });
      }
      await upsertGradingOverride(category, contactKey, String(body.gradingBelt));
      return NextResponse.json({ ok: true });
    }

    if (action === "sync") {
      if (!isClubWorxConfigured()) {
        return NextResponse.json(
          { error: "ClubWorx is not configured" },
          { status: 503 }
        );
      }
      const result = await syncRosterFromClubWorx();
      return NextResponse.json({
        ok: true,
        adultsCount: result.adultsCount,
        kidsCount: result.kidsCount,
        savedAt: result.savedAt,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("mobile roster POST failed:", e);
    if (isClubWorxRateLimitError(e)) {
      return NextResponse.json(
        {
          error:
            "ClubWorx is rate-limiting requests (429). Wait a minute, then try Sync once.",
        },
        { status: 429 }
      );
    }
    const message = e instanceof Error ? e.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
