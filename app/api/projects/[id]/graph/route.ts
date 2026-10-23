import { NextResponse } from "next/server";
import { getGraph, saveGraph } from "@/lib/projects";
import type { GraphPayload } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(getGraph(id));
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const graph = (await request.json()) as GraphPayload;
  saveGraph(id, graph);
  return NextResponse.json({ ok: true });
}
