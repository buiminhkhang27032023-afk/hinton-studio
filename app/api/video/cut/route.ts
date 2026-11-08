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
    const { videoUrl, startTime = 0, endTime, name } = body;
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

    const startSec = Math.max(0, parseFloat(String(startTime)) || 0);
    const endSec = endTime != null ? parseFloat(String(endTime)) : null;

    const assetId = `asset_${crypto.randomUUID().slice(0, 12)}`;
    const outFilename = `${assetId}-clip.mp4`;
    const outPath = path.join(baseDir, "data", "assets", projectId, outFilename);
    const relUrl = `/api/files/${projectId}/${outFilename}`;

    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    const ffmpegArgs = [
      "-y",
      "-ss", startSec.toFixed(3),
    ];

    if (endSec != null && endSec > startSec) {
      ffmpegArgs.push("-to", endSec.toFixed(3));
    }

    ffmpegArgs.push(
      "-i", localVideoPath,
      "-c:v", "libx264",
      "-c:a", "aac",
      "-movflags", "+faststart",
      outPath
    );

    await execFileAsync("ffmpeg", ffmpegArgs);

    if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
      return NextResponse.json({ error: "Failed to cut video with ffmpeg" }, { status: 500 });
    }

    const size = fs.statSync(outPath).size;
    const createdAt = now();
    const assetName = name || `Cắt đoạn ${startSec.toFixed(1)}s-${endSec ? endSec.toFixed(1) + "s" : "hết"} - ${videoFilename}`;

    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      assetId,
      projectId,
      assetName,
      "video",
      "video/mp4",
      relUrl,
      JSON.stringify({
        sourceVideo: videoUrl,
        startTime: startSec,
        endTime: endSec,
        size,
      }),
      createdAt
    );

    const asset = {
      id: assetId,
      projectId,
      name: assetName,
      kind: "video",
      mime: "video/mp4",
      url: relUrl,
      size,
      createdAt,
    };

    return NextResponse.json({
      success: true,
      asset,
      url: relUrl,
      startTime: startSec,
      endTime: endSec,
    });
  } catch (err: unknown) {
    console.error("Video cut error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error during video cutting" },
      { status: 500 }
    );
  }
}
