import { NextResponse } from "next/server";
import { deletePreset } from "@/lib/presets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deletePreset(id);
  return NextResponse.json({ ok: true });
}
