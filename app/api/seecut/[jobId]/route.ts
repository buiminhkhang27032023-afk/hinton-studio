import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { jobsMap, type SeeCutJob } from "@/lib/seecut-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JOBS_DIR = path.join(process.cwd(), "data", "seecut_jobs");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  let job = jobsMap.get(jobId);

  // Check disk for source of truth
  const jobJsonPath = path.join(JOBS_DIR, jobId, "job.json");
  if (fs.existsSync(jobJsonPath)) {
    try {
      const diskJob = JSON.parse(fs.readFileSync(jobJsonPath, "utf-8")) as SeeCutJob;
      job = diskJob;
      jobsMap.set(jobId, diskJob);
    } catch {}
  }

  if (!job) {
    return NextResponse.json({ error: "Không tìm thấy job." }, { status: 404 });
  }

  const elapsed = job.endedAt
    ? Math.round((job.endedAt - job.startedAt) / 1000)
    : Math.round((Date.now() - job.startedAt) / 1000);

  return NextResponse.json({
    id: job.id,
    status: job.status,
    log: job.log.join("\n"),
    elapsed,
    error: job.error,
    inputUrl: job.inputUrl,
    resultUrl: job.resultUrl,
    asset: job.asset,
    plan: job.plan,
  });
}
