import { NextResponse } from "next/server";
import { getShare } from "@/lib/shareStore.server";

export async function GET(_request, { params }) {
  const { id } = await params;
  const data = await getShare(id);

  if (!data) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
