import { NextResponse } from "next/server";
import {
  updateMemberStyleBeltSize,
  isClubWorxConfigured,
} from "@/lib/clubworx/client.server";
import { isPostgresConfigured, patchStudentBeltSize } from "@/lib/rosterDb.server";
import { verifyUploadSecret } from "@/lib/authSecret.server";

export async function PATCH(request, { params }) {
  const { id } = await params;

  if (!isClubWorxConfigured()) {
    return NextResponse.json(
      { error: "ClubWorx is not configured" },
      { status: 503 }
    );
  }

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

  try {
    await updateMemberStyleBeltSize(memberStyleId, beltSize);
    await patchStudentBeltSize(category, {
      memberStyleId,
      contactKey,
      beltSize,
    });
    return NextResponse.json({ ok: true, beltSize });
  } catch (e) {
    console.error("updateMemberStyleBeltSize failed:", e);
    const message =
      e instanceof Error ? e.message : "Could not update belt size in ClubWorx";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
