import { NextResponse } from "next/server";
import { deleteAsset } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteAsset(id);
  return NextResponse.json({ ok: true });
}
