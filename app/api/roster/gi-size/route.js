import { NextResponse } from "next/server";
import {
  updateMemberStyleBeltSize,
  isClubWorxConfigured,
} from "@/lib/clubworx/client.server";
import { isPostgresConfigured, patchStudentBeltSize } from "@/lib/rosterDb.server";
import { upsertGiSizeOverride } from "@/lib/rosterOverridesDb.server";
import { verifyUploadSecret } from "@/lib/authSecret.server";

export async function PUT(request) {
  if (!isPostgresConfigured()) {
    return NextResponse.json(
      { error: "Database not configured" },
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

  const beltSize = String(body.beltSize ?? "").trim();
  const category = body.category === "kids" ? "kids" : "adults";
  const contactKey = body.contactKey ? String(body.contactKey).trim() : "";
  const memberStyleId =
    body.memberStyleId != null ? Number(body.memberStyleId) : null;

  if (!contactKey) {
    return NextResponse.json({ error: "Missing contact key" }, { status: 400 });
  }

  let clubworxSynced = false;
  let warning = null;

  if (
    isClubWorxConfigured() &&
    memberStyleId != null &&
    Number.isFinite(memberStyleId)
  ) {
    try {
      await updateMemberStyleBeltSize(memberStyleId, beltSize);
      clubworxSynced = true;
    } catch (e) {
      console.warn("ClubWorx belt_size update skipped:", e);
      warning =
        e instanceof Error
          ? e.message
          : "Could not update Gi size in ClubWorx; saved in this app only.";
    }
  } else if (isClubWorxConfigured() && !memberStyleId) {
    warning =
      "Gi size saved here. Sync from ClubWorx once to link member records for ClubWorx updates.";
  }

  try {
    await patchStudentBeltSize(category, {
      memberStyleId: Number.isFinite(memberStyleId) ? memberStyleId : null,
      contactKey,
      beltSize,
    });
    await upsertGiSizeOverride(category, contactKey, beltSize);
  } catch (e) {
    console.error("save gi size failed:", e);
    const msg = e instanceof Error ? e.message : "Could not save Gi size";
    const missingTable =
      /roster_overrides/i.test(msg) ||
      /relation .* does not exist/i.test(msg);
    return NextResponse.json(
      {
        error: missingTable
          ? "Database missing roster_overrides table. Run scripts/init-db.sql."
          : msg,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    beltSize,
    clubworxSynced,
    warning,
  });
}
