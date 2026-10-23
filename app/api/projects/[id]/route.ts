import { NextResponse } from "next/server";
import { deleteProject, getProject, renameProject } from "@/lib/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { name?: string };
  if (!body.name) return NextResponse.json({ error: "Thiếu tên" }, { status: 400 });
  renameProject(id, body.name);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteProject(id);
  return NextResponse.json({ ok: true });
}
