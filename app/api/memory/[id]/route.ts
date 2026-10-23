import { NextResponse } from "next/server";
import { deleteMemory } from "@/lib/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteMemory(id);
  return NextResponse.json({ ok: true });
}
