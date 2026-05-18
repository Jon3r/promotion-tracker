import { NextResponse } from "next/server";
import { isPostgresConfigured } from "@/lib/rosterDb.server";
import { isClubWorxConfigured } from "@/lib/clubworx/client.server";
import { syncRosterFromClubWorx } from "@/lib/clubworx/syncRoster.server";
import { verifyUploadSecret } from "@/lib/authSecret.server";
function verifySyncAuth(request, body) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth === `Bearer ${cronSecret}`) return true;
  }
  return verifyUploadSecret(request, body);
}

export async function GET() {
  return NextResponse.json({
    postgresConfigured: isPostgresConfigured(),
    clubworxConfigured: isClubWorxConfigured(),
  });
}

export async function POST(request) {
  if (!isPostgresConfigured()) {
    return NextResponse.json(
      {
        error:
          "Database not configured. Add Vercel Postgres and run scripts/init-db.sql",
      },
      { status: 503 }
    );
  }

  if (!isClubWorxConfigured()) {
    return NextResponse.json(
      { error: "ClubWorx is not configured. Set CLUBWORX_ACCOUNT_KEY." },
      { status: 503 }
    );
  }

  let body = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!verifySyncAuth(request, body)) {
    return NextResponse.json({ error: "Invalid upload password" }, { status: 401 });
  }

  try {
    const result = await syncRosterFromClubWorx();
    return NextResponse.json({
      ok: true,
      adultsCount: result.adultsCount,
      kidsCount: result.kidsCount,
      savedAt: result.savedAt,
      fileName: result.fileName,
      stats: result.stats,
    });
  } catch (e) {
    console.error("ClubWorx sync failed:", e);
    const message =
      e instanceof Error ? e.message : "Could not sync roster from ClubWorx";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
