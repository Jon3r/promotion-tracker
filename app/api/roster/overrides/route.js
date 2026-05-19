import { NextResponse } from "next/server";
import {
  getGradingOverrides,
  setGradingOverridesForCategory,
  clearGradingOverrides,
  upsertGradingOverride,
  deleteGradingOverride,
  isPostgresConfigured,
} from "@/lib/rosterOverridesDb.server";
import { verifyUploadSecret } from "@/lib/authSecret.server";

export async function GET() {
  if (!isPostgresConfigured()) {
    return NextResponse.json(
      { error: "Database not configured", configured: false },
      { status: 503 }
    );
  }

  try {
    const overrides = await getGradingOverrides();
    return NextResponse.json({ configured: true, ...overrides });
  } catch (e) {
    console.error("getGradingOverrides failed:", e);
    return NextResponse.json(
      { error: "Could not load grading overrides" },
      { status: 500 }
    );
  }
}

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

  const category = body.category === "kids" ? "kids" : "adults";

  try {
    if (body.clear) {
      await clearGradingOverrides(category);
      return NextResponse.json({ ok: true, cleared: true });
    }

    if (body.contactKey) {
      const contactKey = String(body.contactKey);
      if (!contactKey) {
        return NextResponse.json({ error: "Missing contactKey" }, { status: 400 });
      }
      if (!body.gradingBelt) {
        await deleteGradingOverride(category, contactKey);
      } else {
        await upsertGradingOverride(
          category,
          contactKey,
          String(body.gradingBelt)
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (body.bulkMove && Array.isArray(body.contactKeys)) {
      const overrides = {};
      for (const entry of body.contactKeys) {
        const contactKey = String(entry.contactKey || "");
        const gradingBelt = String(entry.gradingBelt || "");
        if (contactKey && gradingBelt) {
          overrides[contactKey] = gradingBelt;
          await upsertGradingOverride(category, contactKey, gradingBelt);
        }
      }
      return NextResponse.json({ ok: true, updated: Object.keys(overrides).length });
    }

    if (body.overrides && typeof body.overrides === "object") {
      await setGradingOverridesForCategory(category, body.overrides);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Missing overrides payload" }, { status: 400 });
  } catch (e) {
    console.error("save grading overrides failed:", e);
    const msg = e instanceof Error ? e.message : String(e);
    const missingTable =
      /roster_overrides/i.test(msg) ||
      /relation .* does not exist/i.test(msg);
    return NextResponse.json(
      {
        error: missingTable
          ? "Database missing roster_overrides table. Run scripts/init-db.sql on your Postgres database."
          : `Could not save grading overrides: ${msg}`,
      },
      { status: 500 }
    );
  }
}
