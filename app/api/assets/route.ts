import { NextResponse } from "next/server";
import { listAssets } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const projectId = new URL(request.url).searchParams.get("projectId") ?? undefined;
  return NextResponse.json(listAssets(projectId));
}
