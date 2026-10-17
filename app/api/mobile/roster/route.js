import { NextResponse } from "next/server";
import {
  getRoster,
  isPostgresConfigured,
} from "@/lib/rosterDb.server";
import { getGradingOverrides } from "@/lib/rosterOverridesDb.server";
import { deserializeDataset } from "@/lib/datasetSerialize";
import { mergeGradingOverrides } from "@/lib/gradingBelt";
import { isReadyToPromote } from "@/lib/readyToPromote";
import { verifyUploadSecret } from "@/lib/authSecret.server";

/**
 * Slim roster for the Flutter admin Grading tab.
 * Auth: same as other write APIs — ROSTER_UPLOAD_SECRET via body/header, or open if unset.
 */
export async function GET(request) {
  if (!verifyUploadSecret(request, null)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPostgresConfigured()) {
    return NextResponse.json(
      { error: "Database not configured", configured: false },
      { status: 503 }
    );
  }

  try {
    const roster = await getRoster();
    const overrides = await getGradingOverrides();
    const adultsRaw = deserializeDataset(roster?.adults).students || [];
    const kidsRaw = deserializeDataset(roster?.kids).students || [];

    const adults = mergeGradingOverrides(adultsRaw, overrides.adults || {}).map(
      slimStudent
    );
    const kids = mergeGradingOverrides(kidsRaw, overrides.kids || {}).map(
      slimStudent
    );

    return NextResponse.json({
      ok: true,
      configured: true,
      updatedAt: roster?.updatedAt ?? null,
      adults,
      kids,
      overrides: {
        adults: overrides.adults || {},
        kids: overrides.kids || {},
      },
    });
  } catch (e) {
    console.error("mobile roster GET failed:", e);
    return NextResponse.json(
      { error: "Could not load roster" },
      { status: 500 }
    );
  }
}

/**
 * @param {import('@/lib/parseExcel').Student} s
 */
function slimStudent(s) {
  return {
    contactKey: s.contactKey || null,
    memberStyleId: s.memberStyleId ?? null,
    fullName: s.fullName || "",
    currentRank: s.currentRank || "",
    nextRank: s.nextRank || "",
    beltSize: s.beltSize || "",
    email: s.email || "",
    phone: s.phone || "",
    currentBelt: s.currentParsed?.belt || "unknown",
    nextBelt: s.nextParsed?.belt || "unknown",
    gradingBelt: s.gradingBeltOverride || s.nextParsed?.belt || null,
    gradingBeltOverride: s.gradingBeltOverride || null,
    readyToPromote: isReadyToPromote(s),
  };
}
