import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getDb, now } from "@/lib/db";

const execFileAsync = promisify(execFile);
const PYTHON_PATH = "d:\\aivideo\\OpenMontage\\.venv\\Scripts\\python.exe";
const SOUND_GEN_SCRIPT = path.join(process.cwd(), "server", "sound_generator.py");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, prompt, kind = "sfx", duration = 10 } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập mô tả âm thanh hoặc nhạc cần tạo" }, { status: 400 });
    }
    if (!projectId) {
      return NextResponse.json({ error: "Thiếu projectId" }, { status: 400 });
    }

    const cleanPrompt = prompt.trim();
    const cleanKind = kind === "music" || kind === "bgm" ? "music" : "sfx";
    const dur = Math.min(60, Math.max(2, Number(duration) || 10));

    const assetId = `asset_${crypto.randomBytes(6).toString("hex")}`;
    const baseDir = process.cwd();
    const fname = `${assetId}-${cleanKind}-${Date.now()}.wav`;
    const outPath = path.join(baseDir, "data", "assets", projectId, fname);
    const relUrl = `/api/files/${projectId}/${fname}`;

    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    let generatedBy = "Hinton Sound Synthesizer";
    let success = false;

    // 1. Check if ElevenLabs key is available for SFX
    const db = getDb();
    const storedKey = db.prepare("SELECT value FROM settings WHERE key = 'elevenlabs_api_key'").get() as { value: string } | undefined;
    let elevenKey = process.env.ELEVENLABS_API_KEY || "";
    if (!elevenKey && storedKey?.value) {
      try { elevenKey = JSON.parse(storedKey.value); } catch { elevenKey = storedKey.value; }
    }

    if (elevenKey && elevenKey.trim() && cleanKind === "sfx") {
      try {
        const elRes = await fetch("https://api.elevenlabs.io/v1/sound-effects", {
          method: "POST",
          headers: {
            "xi-api-key": elevenKey.trim(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: cleanPrompt,
            duration_seconds: dur,
          }),
        });

        if (elRes.ok) {
          const arr = await elRes.arrayBuffer();
          fs.writeFileSync(outPath, Buffer.from(arr));
          generatedBy = "ElevenLabs Sound Effects AI";
          success = true;
        }
      } catch (e) {
        console.warn("ElevenLabs SFX call failed, falling back to local synthesizer:", e);
      }
    }

    // 2. Procedural Python Audio Synthesizer (Local, fast, reliable)
    if (!success) {
      await execFileAsync(PYTHON_PATH, [
        SOUND_GEN_SCRIPT,
        "--prompt", cleanPrompt,
        "--kind", cleanKind,
        "--duration", String(dur),
        "--out", outPath,
      ], { timeout: 30000 });

      if (fs.existsSync(outPath) && fs.statSync(outPath).size > 100) {
        generatedBy = cleanKind === "music" ? "Hinton Cinematic Music Engine" : "Hinton Foley & Ambient SFX Engine";
        success = true;
      }
    }

    if (!success || !fs.existsSync(outPath)) {
      throw new Error("Không thể tạo file âm thanh");
    }

    const stat = fs.statSync(outPath);
    const createdAt = now();
    const assetTitle = cleanKind === "music"
      ? `Âm nhạc (BGM) - ${cleanPrompt.slice(0, 30)}...`
      : `Tiếng động (SFX) - ${cleanPrompt.slice(0, 30)}...`;

    db.prepare(`
      INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      assetId,
      projectId,
      assetTitle,
      "audio",
      "audio/wav",
      relUrl,
      JSON.stringify({
        prompt: cleanPrompt,
        kind: cleanKind,
        duration: dur,
        engine: generatedBy,
        size: stat.size,
      }),
      createdAt
    );

    const asset = {
      id: assetId,
      projectId,
      name: assetTitle,
      kind: "audio",
      mime: "audio/wav",
      url: relUrl,
      size: stat.size,
      createdAt,
    };

    return NextResponse.json({
      success: true,
      url: relUrl,
      asset,
      engine: generatedBy,
      kind: cleanKind,
      duration: dur,
    });
  } catch (err: any) {
    console.error("Audio generation route error:", err);
    return NextResponse.json({ error: err.message || "Lỗi tạo âm thanh" }, { status: 500 });
  }
}
