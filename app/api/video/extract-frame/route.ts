import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import crypto from "node:crypto";
import { getDb, now } from "@/lib/db";
import { resolveLocalAssetPath } from "@/lib/storage";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { videoUrl, mode = "current", time = 0, name } = body;
    let projectId = body.projectId;

    if (!videoUrl) {
      return NextResponse.json({ error: "Missing videoUrl" }, { status: 400 });
    }

    if (!projectId) {
      const match = videoUrl.match(/\/api\/files\/([^\/]+)\//);
      if (match && match[1]) projectId = match[1];
    }
    if (!projectId) projectId = "prj_default";

    const baseDir = process.cwd();
    let videoFilename = path.basename(videoUrl.split("?")[0].split("#")[0]);
    let localVideoPath = resolveLocalAssetPath(videoUrl);

    if (!localVideoPath || !fs.existsSync(localVideoPath)) {
      const p1 = path.join(baseDir, "data", "assets", projectId, videoFilename);
      if (fs.existsSync(p1)) {
        localVideoPath = p1;
      } else {
        const altPath = path.join(baseDir, "data", "assets", videoFilename);
        if (fs.existsSync(altPath)) {
          localVideoPath = altPath;
        } else {
          return NextResponse.json({ error: `Video file not found: ${videoFilename}` }, { status: 404 });
        }
      }
    }

    // Determine target timestamp in seconds
    let targetTime = 0.05;

    if (mode === "last") {
      // Get duration via ffprobe
      try {
        const { stdout } = await execFileAsync("ffprobe", [
          "-v", "error",
          "-show_entries", "format=duration",
          "-of", "default=noprint_wrappers=1:nokey=1",
          localVideoPath,
        ]);
        const dur = parseFloat(stdout.trim());
        if (!isNaN(dur) && dur > 0.3) {
          targetTime = Math.max(0.05, dur - 0.15);
        }
      } catch {
        targetTime = 0.05;
      }
    } else if (mode === "current") {
      targetTime = Math.max(0, typeof time === "number" ? time : parseFloat(String(time)) || 0.05);
    } else {
      // mode === "first"
      targetTime = 0.05;
    }

    const assetId = `asset_${crypto.randomUUID().slice(0, 12)}`;
    const labelMode = mode === "first" ? "cảnh đầu" : mode === "last" ? "cảnh cuối" : `tại ${targetTime.toFixed(1)}s`;
    const outFilename = `${assetId}-frame-${mode}.jpg`;
    const outPath = path.join(baseDir, "data", "assets", projectId, outFilename);
    const relUrl = `/api/files/${projectId}/${outFilename}`;

    // Ensure directory exists
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    // Use ffmpeg to extract single frame
    const ffmpegArgs = [
      "-y",
      "-ss", targetTime.toFixed(3),
      "-i", localVideoPath,
      "-vframes", "1",
      "-q:v", "2",
      outPath,
    ];

    await execFileAsync("ffmpeg", ffmpegArgs);

    if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
      return NextResponse.json({ error: "Failed to extract frame with ffmpeg" }, { status: 500 });
    }

    const size = fs.statSync(outPath).size;
    const createdAt = now();
    const assetName = name || `Cắt ${labelMode} - ${videoFilename}`;

    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      assetId,
      projectId,
      assetName,
      "image",
      "image/jpeg",
      relUrl,
      JSON.stringify({
        sourceVideo: videoUrl,
        mode,
        timestamp: targetTime,
        size,
      }),
      createdAt
    );

    const asset = {
      id: assetId,
      projectId,
      name: assetName,
      kind: "image",
      mime: "image/jpeg",
      url: relUrl,
      size,
      createdAt,
    };

    return NextResponse.json({
      success: true,
      asset,
      url: relUrl,
      timestamp: targetTime,
      mode,
    });
  } catch (err: unknown) {
    console.error("Frame extraction error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error during frame extraction" },
      { status: 500 }
    );
  }
}
