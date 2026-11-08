import { NextResponse } from "next/server";
import { recoverJob } from "@/lib/recover-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Explicit user action: inspect/download an EXISTING task. No model submission.
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    return NextResponse.json(await recoverJob(id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không lấy được kết quả cũ." }, { status: 502 });
  }
}
