import { NextResponse } from "next/server";
import { listMemory, saveMemory, type MemoryKind } from "@/lib/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const kind = new URL(request.url).searchParams.get("kind") as MemoryKind | null;
  return NextResponse.json(listMemory(kind ?? undefined));
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    id?: string;
    projectId?: string | null;
    kind: MemoryKind;
    name: string;
    description: string;
    sourceUrl?: string | null;
    tags?: string[];
  };
  if (!body.kind || !body.name?.trim() || !body.description?.trim()) {
    return NextResponse.json({ error: "Thiếu kind, tên hoặc mô tả." }, { status: 400 });
  }
  return NextResponse.json(saveMemory(body));
}
