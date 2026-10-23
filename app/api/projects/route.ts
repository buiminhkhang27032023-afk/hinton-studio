import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listProjects());
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { name?: string };
  return NextResponse.json(createProject(body.name ?? "Dự án mới"));
}
