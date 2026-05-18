import { NextResponse } from "next/server";
import { createShare, isShareStorageConfigured } from "@/lib/shareStore.server";
import { serializeDataset } from "@/lib/datasetSerialize";

export async function POST(request) {
  if (!isShareStorageConfigured()) {
    return NextResponse.json(
      {
        error:
          "Share storage is not configured. Add Upstash Redis on Vercel, or run locally in development.",
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

  const uploadSecret = process.env.SHARE_UPLOAD_SECRET;
  if (uploadSecret) {
    const provided =
      body.password || request.headers.get("x-share-secret");
    if (provided !== uploadSecret) {
      return NextResponse.json(
        { error: "Invalid publish password" },
        { status: 401 }
      );
    }
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
