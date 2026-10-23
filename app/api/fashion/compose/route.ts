import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { ASSET_DIR } from "@/lib/db";
import { saveAsset } from "@/lib/storage";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

function resolveLocalOrWrite(urlOrPath: string, tempPrefix: string, ext = "jpg"): string {
  if (!urlOrPath) return "";
  
  // If it's an internal /api/files path
  if (urlOrPath.startsWith("/api/files/")) {
    const parts = urlOrPath.replace("/api/files/", "").split("/");
    if (parts.length >= 2) {
      const proj = decodeURIComponent(parts[0]);
      const file = decodeURIComponent(parts.slice(1).join("/"));
      const diskPath = path.join(ASSET_DIR, proj, file);
      if (fs.existsSync(diskPath)) return diskPath;
    }
  }

  // If it's already an existing absolute path on disk
  if (fs.existsSync(urlOrPath)) return urlOrPath;

  // If it's a data URI
  if (urlOrPath.startsWith("data:")) {
    const comma = urlOrPath.indexOf(",");
    if (comma !== -1) {
      const b64 = urlOrPath.slice(comma + 1);
      const tmpPath = path.join(os.tmpdir(), `${tempPrefix}_${Date.now()}.${ext}`);
      fs.writeFileSync(tmpPath, Buffer.from(b64, "base64"));
      return tmpPath;
    }
  }

  return urlOrPath;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      videoUrl,
      modelImageUrl,
      garmentImageUrl,
      headline = "HÃY NHỚ",
      subheadline = "Bí quyết phối đồ",
      projectId = null,
    } = body;

    if (!videoUrl || !modelImageUrl || !garmentImageUrl) {
      return NextResponse.json(
        { error: "Cần đủ 3 yếu tố: video người mẫu, ảnh chân dung người mẫu và ảnh sản phẩm quần áo." },
        { status: 400 },
      );
    }

    const localVideo = resolveLocalOrWrite(videoUrl, "v_in", "mp4");
    const localModel = resolveLocalOrWrite(modelImageUrl, "m_in", "jpg");
    const localGarment = resolveLocalOrWrite(garmentImageUrl, "g_in", "jpg");

    if (!fs.existsSync(localVideo)) {
      return NextResponse.json({ error: `Không tìm thấy file video nguồn: ${videoUrl}` }, { status: 404 });
    }
    if (!fs.existsSync(localModel)) {
      return NextResponse.json({ error: `Không tìm thấy file ảnh người mẫu: ${modelImageUrl}` }, { status: 404 });
    }
    if (!fs.existsSync(localGarment)) {
      return NextResponse.json({ error: `Không tìm thấy file ảnh trang phục: ${garmentImageUrl}` }, { status: 404 });
    }

    const tempOut = path.join(os.tmpdir(), `fashion_9_16_${Date.now()}.mp4`);
    const scriptPath = path.join(process.cwd(), "scripts", "compose_fashion_engine.py");

    const { stdout, stderr } = await execFileAsync(process.env.FASHION_PYTHON || (process.platform === "win32" ? "python" : "python3"), [
      scriptPath,
      localVideo,
      localModel,
      localGarment,
      tempOut,
      headline,
      subheadline,
    ]);

    if (!fs.existsSync(tempOut) || fs.statSync(tempOut).size < 1000) {
      console.error("Compose error stdout:", stdout, "stderr:", stderr);
      throw new Error(`Ghép video thất bại: ${stderr || stdout}`);
    }

    const buffer = fs.readFileSync(tempOut);
    try {
      if (fs.existsSync(tempOut)) {
        fs.unlinkSync(tempOut);
      }
    } catch {
      /* ignore temp cleanup */
    }

    const asset = saveAsset({
      projectId,
      name: `fashion-lookbook-${Date.now()}`,
      buffer,
      mime: "video/mp4",
      meta: {
        headline,
        subheadline,
        type: "fashion_split_screen",
        aspect: "9:16",
      },
    });

    return NextResponse.json({ success: true, asset });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
