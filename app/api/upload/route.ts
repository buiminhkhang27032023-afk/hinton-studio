import { NextResponse } from "next/server";
import { listAssets } from "@/lib/storage";
import { saveAsset } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  const projectId = new URL(request.url).searchParams.get("projectId") ?? undefined;
  return NextResponse.json(listAssets(projectId));
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const projectId = (form.get("projectId") as string) || null;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Không có file được gửi lên." }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const asset = saveAsset({
    projectId,
    name: file.name || "upload",
    buffer,
    mime: file.type || "application/octet-stream",
  });
  return NextResponse.json(asset);
}
