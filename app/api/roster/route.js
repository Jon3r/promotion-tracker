import { NextResponse } from "next/server";
import {
  getRoster,
  saveRoster,
  isPostgresConfigured,
} from "@/lib/rosterDb.server";
import { verifyUploadSecret } from "@/lib/authSecret.server";
import { deserializeDataset } from "@/lib/datasetSerialize";

export async function GET() {
  if (!isPostgresConfigured()) {
    return NextResponse.json({
      configured: false,
      adults: null,
      kids: null,
    });
  }

  try {
    const roster = await getRoster();
    if (!roster) {
      return NextResponse.json({
        configured: true,
        adults: deserializeDataset(null),
        kids: deserializeDataset(null),
        updatedAt: null,
      });
    }

    return NextResponse.json({
      configured: true,
      adults: roster.adults,
      kids: roster.kids,
      updatedAt: roster.updatedAt,
    });
  } catch (e) {
    console.error("getRoster failed:", e);
    return NextResponse.json(
      { error: "Could not load roster from database" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  if (!isPostgresConfigured()) {
    return NextResponse.json(
      {
        error:
          "Database not configured. Add Vercel Postgres and run scripts/init-db.sql",
        configured: false,
      },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!verifyUploadSecret(request, body)) {
    return NextResponse.json({ error: "Invalid upload password" }, { status: 401 });
  }

  try {
    await saveRoster({
      adults: body.adults,
      kids: body.kids,
    });
    return NextResponse.json({
      ok: true,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("saveRoster failed:", e);
    return NextResponse.json(
      { error: "Could not save roster to database" },
      { status: 500 }
    );
  }
}
