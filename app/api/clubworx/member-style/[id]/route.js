import { NextResponse } from "next/server";
import {
  updateMemberStyleBeltSize,
  isClubWorxConfigured,
} from "@/lib/clubworx/client.server";
import { isPostgresConfigured, patchStudentBeltSize } from "@/lib/rosterDb.server";
import { upsertGiSizeOverride } from "@/lib/rosterOverridesDb.server";
import { verifyUploadSecret } from "@/lib/authSecret.server";

export async function PATCH(request, { params }) {
  const { id } = await params;

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
  const memberStyleId = Number(id);
  const contactKey = body.contactKey ? String(body.contactKey) : null;

  if (!Number.isFinite(memberStyleId)) {
    return NextResponse.json({ error: "Invalid member style id" }, { status: 400 });
  }

  if (!contactKey) {
    return NextResponse.json(
      { error: "Missing contact key for this member" },
      { status: 400 }
    );
  }

  let clubworxSynced = false;
  let warning = null;

  if (isClubWorxConfigured()) {
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
  } else {
    warning = "ClubWorx not configured; Gi size saved in this app only.";
  }

  try {
    await patchStudentBeltSize(category, {
      memberStyleId,
      contactKey,
      beltSize,
    });
    await upsertGiSizeOverride(category, contactKey, beltSize);
  } catch (e) {
    console.error("patchStudentBeltSize failed:", e);
    const message =
      e instanceof Error ? e.message : "Could not save Gi size to roster";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    beltSize,
    clubworxSynced,
    warning,
  });
}
