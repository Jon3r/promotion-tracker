import { NextResponse } from "next/server";
import {
  fetchAllClubWorxPages,
  isClubWorxConfigured,
} from "@/lib/clubworx/client.server";
import { normaliseClubWorxEvent } from "@/lib/clubworx/classes";

export async function GET() {
  if (!isClubWorxConfigured()) {
    return NextResponse.json(
      { error: "ClubWorx is not configured. Set CLUBWORX_ACCOUNT_KEY." },
      { status: 503 }
    );
  }

  try {
    const events = await fetchAllClubWorxPages("events");
    const classes = events
      .map(normaliseClubWorxEvent)
      .filter((event) => event.id);

    classes.sort((a, b) => {
      const at = a.startsAt ? new Date(a.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bt = b.startsAt ? new Date(b.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
      return at - bt;
    });

    return NextResponse.json({ ok: true, classes });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load ClubWorx classes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

