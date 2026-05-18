import { NextResponse } from "next/server";
import { createShare, isShareStorageConfigured } from "@/lib/shareDb.server";
import { serializeDataset } from "@/lib/datasetSerialize";
import { verifyUploadSecret } from "@/lib/authSecret.server";

export async function POST(request) {
  if (!isShareStorageConfigured()) {
    return NextResponse.json(
      {
        error:
          "Share storage is not configured. Add Vercel Postgres and run scripts/init-db.sql",
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
    return NextResponse.json(
      { error: "Invalid publish password" },
      { status: 401 }
    );
  }

  const adultsStudents = body.adults?.students;
  const kidsStudents = body.kids?.students;
  const hasAdults = Array.isArray(adultsStudents) && adultsStudents.length > 0;
  const hasKids = Array.isArray(kidsStudents) && kidsStudents.length > 0;

  if (!hasAdults && !hasKids) {
    return NextResponse.json(
      { error: "Upload at least one Adults or Kids roster to publish" },
      { status: 400 }
    );
  }

  try {
    const id = await createShare({
      adults: serializeDataset({
        students: adultsStudents || [],
        fileName: body.adults?.fileName ?? null,
        savedAt: body.adults?.savedAt ?? null,
      }),
      kids: serializeDataset({
        students: kidsStudents || [],
        fileName: body.kids?.fileName ?? null,
        savedAt: body.kids?.savedAt ?? null,
      }),
    });

    return NextResponse.json({ shareId: id });
  } catch (e) {
    console.error("createShare failed:", e);
    return NextResponse.json(
      { error: "Could not save share link" },
      { status: 500 }
    );
  }
}
