import { NextResponse } from "next/server";
import {
  getTimerStateSnapshot,
  mutateTimerState,
} from "@/lib/timer/serverStore.server";

export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS = new Set([
  "start",
  "pause",
  "toggle",
  "reset",
  "update_settings",
  "apply_preset",
  "set_display",
]);

export async function GET() {
  try {
    const snapshot = await getTimerStateSnapshot();
    return NextResponse.json(
      { ok: true, ...snapshot },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/timer failed:", error);
    return NextResponse.json(
      { error: "Could not load gym timer state" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = String(body?.action || body?.type || "").trim();
  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json(
      { error: `Unsupported timer action: ${action || "(missing)"}` },
      { status: 400 }
    );
  }

  try {
    const snapshot = await mutateTimerState({ ...body, action });
    return NextResponse.json(
      { ok: true, ...snapshot },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("POST /api/timer failed:", error);
    return NextResponse.json(
      { error: "Could not update gym timer state" },
      { status: 500 }
    );
  }
}
