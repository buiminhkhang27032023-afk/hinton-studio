import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import util from "node:util";

const execPromise = util.promisify(exec);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JOBS_DIR = path.join(process.cwd(), "data", "seecut_jobs");
const PYTHON_PATH = process.env.SEECUT_PYTHON || (process.platform === "win32" ? "c:\\Users\\Chen Qianyu\\SeeCut\\.venv\\Scripts\\python.exe" : "python3");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { jobId, projectName } = body;

    if (!jobId) {
      return NextResponse.json({ error: "Thiếu jobId" }, { status: 400 });
    }

    const jobDir = path.join(JOBS_DIR, jobId);
    if (!fs.existsSync(jobDir)) {
      return NextResponse.json({ error: "Không tìm thấy job" }, { status: 404 });
    }

    const jobJsonPath = path.join(jobDir, "job.json");
    let name = projectName || "SeeCut Project";
    if (fs.existsSync(jobJsonPath)) {
      try {
        const jobData = JSON.parse(fs.readFileSync(jobJsonPath, "utf-8"));
        if (jobData.inputName) {
          name = `SeeCut - ${jobData.inputName.replace(/\.[^/.]+$/, "")}`;
        }
      } catch {
        // use default
      }
    }

    const script = `
import os, sys, glob, json
from seecut.capcut import publish_to_capcut_desktop

job_dir = r"${jobDir.replace(/\\/g, "\\\\")}"
cover = os.path.join(job_dir, "work", "ai_frame_0.jpg")
vshots = sorted(glob.glob(os.path.join(job_dir, "work", "vshot_*.mkv")))
shots = []
for vs in vshots:
    shots.append({"path": vs, "duration": 2.0, "start": 0.0})

ok, msg, folder = publish_to_capcut_desktop(
    project_name="${name.replace(/"/g, '\\"')}",
    duration_s=len(vshots) * 2.0 or 60.0,
    shots=shots,
    cover_image_path=cover if os.path.isfile(cover) else None
)
print(json.dumps({"success": ok, "message": msg, "folder": folder}))
`;

    const { stdout, stderr } = await execPromise(`"${PYTHON_PATH}" -c "${script.replace(/\r?\n/g, " ").replace(/"/g, '\\"')}"`);
    
    try {
      const res = JSON.parse(stdout.trim());
      return NextResponse.json(res);
    } catch {
      return NextResponse.json({ success: true, message: stdout.trim() || stderr.trim() });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
