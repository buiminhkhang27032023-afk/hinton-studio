import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getDb, now } from "@/lib/db";

const execFileAsync = promisify(execFile);

const PYTHON_PATH = "d:\\aivideo\\OpenMontage\\.venv\\Scripts\\python.exe";
const EDGE_TTS_PATH = "d:\\aivideo\\OpenMontage\\.venv\\Scripts\\edge-tts.exe";
const OMNIVOICE_SERVICE = path.join(process.cwd(), "server", "omnivoice_service.py");
const OMNIVOICE_ENDPOINT = process.env.OMNIVOICE_ENDPOINT || "http://127.0.0.1:8123";
const ANALYZE_VOICE_SCRIPT = path.join(process.cwd(), "server", "analyze_voice.py");

const VOICE_MAP: Record<string, string> = {
  // Nữ tiếng Việt
  shimmer: "vi-VN-HoaiMyNeural",
  nova: "vi-VN-HoaiMyNeural",
  hoai_my: "vi-VN-HoaiMyNeural",
  female: "vi-VN-HoaiMyNeural",

  // Nam tiếng Việt
  nam_minh: "vi-VN-NamMinhNeural",
  alloy: "vi-VN-NamMinhNeural",
  echo: "vi-VN-NamMinhNeural",
  male: "vi-VN-NamMinhNeural",

  // Tiếng Anh
  en_male: "en-US-GuyNeural",
  en_female: "en-US-JennyNeural",
};

interface VoiceAnalysis {
  gender: "female" | "male";
  median_f0: number;
  delta_hz: number;
  pitch_arg: string;
  selected_voice: string;
  status?: string;
}

const analysisCache = new Map<string, { mtime: number; data: VoiceAnalysis }>();

function resolveReferenceAudioPath(ref: unknown, projectId: string, baseDir: string): string | null {
  if (typeof ref !== "string" || !ref.trim()) return null;
  const trimmed = ref.trim();

  // 1. /api/files/projectId/filename...
  if (trimmed.startsWith("/api/files/")) {
    const rel = trimmed.replace(/^\/api\/files\//, "");
    const parts = rel.split("/").filter(Boolean);
    const candidate = path.join(baseDir, "data", "assets", ...parts);
    if (fs.existsSync(candidate)) return candidate;
  }

  // 2. Absolute or direct path
  if (fs.existsSync(trimmed)) {
    return trimmed;
  }

  // 3. Fallback check inside project assets
  const candidateInProject = path.join(baseDir, "data", "assets", projectId, path.basename(trimmed));
  if (fs.existsSync(candidateInProject)) {
    return candidateInProject;
  }

  // 4. Default voice lock
  if (trimmed.includes("voice-lock-vn-v2.wav")) {
    const defaultLock = path.join(baseDir, "data", "omnivoice", "voice-lock-vn-v2.wav");
    if (fs.existsSync(defaultLock)) return defaultLock;
  }

  return null;
}

async function analyzeReferenceVoice(filePath: string): Promise<VoiceAnalysis | null> {
  try {
    const stat = fs.statSync(filePath);
    const cached = analysisCache.get(filePath);
    if (cached && cached.mtime === stat.mtimeMs) {
      return cached.data;
    }

    if (fs.existsSync(ANALYZE_VOICE_SCRIPT) && fs.existsSync(PYTHON_PATH)) {
      const { stdout } = await execFileAsync(PYTHON_PATH, [ANALYZE_VOICE_SCRIPT, filePath], { timeout: 12000 });
      const parsed = JSON.parse(stdout.trim()) as VoiceAnalysis;
      if (parsed && !("error" in parsed && parsed.status !== "fallback")) {
        analysisCache.set(filePath, { mtime: stat.mtimeMs, data: parsed });
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed to analyze voice characteristics:", err);
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
        const {
      projectId,
      text,
      voice = "omnivoice",
      speed = 1.2,
      model = "omnivoice",
      referenceAudio,
      instruct,
      voiceDescription,
      cloneEngine,
      similarityBoost = 0.88,
      stability = 0.5,
      voiceId: customVoiceId,
    } = body;

    if (!projectId || !text?.trim()) {
      return NextResponse.json({ error: "Missing projectId or text" }, { status: 400 });
    }

    const cleanText = text.trim();
    const assetId = `asset_${crypto.randomUUID().slice(0, 12)}`;
    const baseDir = process.cwd();
    const isOmni = voice === "omnivoice" || voice === "omnivoice_custom" || voice.startsWith("omni");
    const activeDescription = (voiceDescription || instruct || "").trim();

    let audioBuffer: Buffer | null = null;
    let mimeType = "audio/mpeg";
    let ext = "mp3";
    let engineUsed = "OmniVoice";

    // Resolve reference audio path if provided
    const resolvedRefPath = resolveReferenceAudioPath(referenceAudio, projectId, baseDir);
    let voiceAnalysis: VoiceAnalysis | null = null;

    // 1. Try local OmniVoice AI Voice Cloning / Voice Design server first
    // - If referenceAudio is provided: Voice Clone mode (zero-shot)
    // - If voiceDescription/instruct is provided: Voice Design mode (prompt-to-voice)
    // - Otherwise: default Voice-Lock v2
        const isEleven = Boolean(
      voice && (
        String(voice).toLowerCase().includes("eleven") ||
        String(voice).startsWith("el_") ||
        cloneEngine === "elevenlabs" ||
        /^[a-zA-Z0-9_-]{18,24}$/.test(String(voice))
      )
    );

    // 1. ELEVENLABS PIPELINE (Instant Voice Clone, Custom Cloned Voices, Multilingual v2)
    if (isEleven) {
      try {
        const db = getDb();
        const storedKey = db.prepare("SELECT value FROM settings WHERE key = 'elevenlabs_api_key'").get() as { value: string } | undefined;
        let apiKey = process.env.ELEVENLABS_API_KEY || "";
        if (!apiKey && storedKey?.value) {
          try { apiKey = JSON.parse(storedKey.value); } catch { apiKey = storedKey.value; }
        }
        if (!apiKey) {
          const providerKey = db.prepare("SELECT value FROM settings WHERE key = 'provider_elevenlabs'").get() as { value: string } | undefined;
          if (providerKey?.value) {
            try {
              const p = JSON.parse(providerKey.value);
              apiKey = p.apiKey || p.key || "";
            } catch {
              apiKey = providerKey.value;
            }
          }
        }

        if (apiKey && apiKey.trim()) {
          const key = apiKey.trim();
          let targetVoiceId: string | null = null;
          let isClonedVoice = false;

          // Case A: User uploaded/selected reference audio for ElevenLabs Instant Voice Cloning
          const wantsCloneFromRef = Boolean(resolvedRefPath) && (voice === "elevenlabs_clone" || cloneEngine === "elevenlabs" || voice === "omnivoice_custom");
          if (wantsCloneFromRef && resolvedRefPath && fs.existsSync(resolvedRefPath)) {
            try {
              const fileName = path.basename(resolvedRefPath);
              const cloneName = `Clone_${path.basename(resolvedRefPath, path.extname(resolvedRefPath)).slice(0, 15)}`;
              
              const form = new FormData();
              form.append("name", cloneName);
              form.append("description", `SeeCut Studio Auto Voice Clone for ${fileName}`);
              const fileBuf = fs.readFileSync(resolvedRefPath);
              const mime = fileName.endsWith(".wav") ? "audio/wav" : "audio/mpeg";
              form.append("files", new Blob([fileBuf], { type: mime }), fileName);

              const cloneRes = await fetch("https://api.elevenlabs.io/v1/voices/add", {
                method: "POST",
                headers: { "xi-api-key": key },
                body: form,
                signal: AbortSignal.timeout(30000),
              });

              if (cloneRes.ok) {
                const cloneData = await cloneRes.json();
                if (cloneData.voice_id) {
                  targetVoiceId = cloneData.voice_id;
                  isClonedVoice = true;
                  console.log(`ElevenLabs voice cloned successfully: ${targetVoiceId} (${cloneName})`);
                }
              } else {
                const errJson = await cloneRes.json().catch(() => ({}));
                console.warn("ElevenLabs Instant Voice Cloning unavailable or restricted:", errJson);
                // Will automatically fall back to OmniVoice below
              }
            } catch (cloneErr) {
              console.warn("Exception during ElevenLabs voice clone:", cloneErr);
            }
          }

          // Case B: Explicit Voice ID passed directly or custom voice
          if (!targetVoiceId) {
            // CRITICAL: If user requested Voice Clone from reference audio (wantsCloneFromRef),
            // and ElevenLabs failed to clone (e.g. Free account restricted from Instant Voice Cloning API),
            // DO NOT fall back to Antoni (ErXwobaYiN019PkySvjV) or Rachel! Doing so uses English phonemes on Vietnamese text,
            // which sounds like Thai / broken dialect!
            // Leave targetVoiceId as null so it falls right through to OmniVoice AI Local Server (Zero-Shot Clone in pure Vietnamese)!
            if (wantsCloneFromRef) {
              console.log("ElevenLabs API cannot clone via API on current account. Falling back to OmniVoice local zero-shot clone.");
            } else if (customVoiceId) {
              targetVoiceId = String(customVoiceId).trim().replace(/^el_/, "");
            } else if (String(voice).startsWith("el_")) {
              targetVoiceId = String(voice).replace(/^el_/, "");
            } else if (/^[a-zA-Z0-9_-]{18,24}$/.test(String(voice))) {
              targetVoiceId = String(voice);
            } else {
              const isFemale = String(voice).toLowerCase().includes("female") || String(voice).toLowerCase().includes("nu") || String(voice).toLowerCase().includes("linh");
              targetVoiceId = isFemale ? "21m00Tcm4TlvDq8ikWAM" : "ErXwobaYiN019PkySvjV";
            }
          }

          // If targetVoiceId is valid, generate TTS with ElevenLabs Flash v2.5 (official Vietnamese support)
          if (targetVoiceId) {
            const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`, {
              method: "POST",
              headers: {
                "xi-api-key": key,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: cleanText,
                model_id: "eleven_flash_v2_5",
                language_code: "vi",
                voice_settings: {
                  stability: Number(stability) || 0.5,
                  similarity_boost: Number(similarityBoost) || 0.88,
                  style: 0.15,
                  use_speaker_boost: true,
                },
              }),
              signal: AbortSignal.timeout(45000),
            });

            if (elRes.ok) {
              const arr = await elRes.arrayBuffer();
              audioBuffer = Buffer.from(arr);
              ext = "mp3";
              mimeType = "audio/mpeg";
              engineUsed = isClonedVoice
                ? `ElevenLabs Instant Voice Clone (${targetVoiceId})`
                : `ElevenLabs Flash v2.5 Tiếng Việt (${targetVoiceId === "21m00Tcm4TlvDq8ikWAM" ? "Linh Nữ" : targetVoiceId === "ErXwobaYiN019PkySvjV" ? "Thắng Nam" : targetVoiceId})`;
            } else {
              console.warn("ElevenLabs TTS request returned", elRes.status, "- falling back to OmniVoice");
            }
          }
        }
      } catch (elevenErr) {
        console.warn("ElevenLabs execution error:", elevenErr);
      }
    }

    // 2. OMNIVOICE AI LOCAL SERVER (Zero-Shot Voice Cloning & Voice-Lock v2)
    // Runs when ElevenLabs fell back OR when user selects OmniVoice / Free Voice Cloning
    if (!audioBuffer) {
      const shouldUseOmni = isOmni || Boolean(resolvedRefPath) || Boolean(activeDescription) || isEleven;
      if (shouldUseOmni) {
        try {
          const controller = new AbortController();
          const timeoutMs = resolvedRefPath ? 75000 : 35000;
          const timeout = setTimeout(() => controller.abort(), timeoutMs);

          const payload: Record<string, unknown> = {
            text: cleanText,
            speed: Number(speed) || 1.2,
            language: "vi",
          };
          if (resolvedRefPath) {
            payload.custom_ref = resolvedRefPath;
          }
          if (activeDescription) {
            payload.instruct = activeDescription;
          }

          const srvRes = await fetch(`${OMNIVOICE_ENDPOINT.replace(/\/+$/, "")}/tts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (srvRes.ok) {
            const raw = await srvRes.arrayBuffer();
            audioBuffer = Buffer.from(raw);
            const isWav = audioBuffer.slice(0, 4).toString() === "RIFF";
            ext = isWav ? "wav" : "mp3";
            mimeType = isWav ? "audio/wav" : "audio/mpeg";
            const refName = resolvedRefPath ? path.basename(resolvedRefPath) : null;
            engineUsed = refName
              ? (isEleven ? `OmniVoice AI Voice Clone (Miễn phí Cục bộ theo mẫu "${refName}")` : `OmniVoice AI Voice Cloning (${refName})`)
              : activeDescription
              ? `OmniVoice Voice Design (${activeDescription})`
              : "OmniVoice (Voice-Lock v2 Server)";
          }
        } catch (err) {
          console.warn("OmniVoice HTTP server error:", err);
        }
      }
    }

    // 3. Fallback: Edge-TTS
    if (!audioBuffer) {
      if (resolvedRefPath) {
        voiceAnalysis = await analyzeReferenceVoice(resolvedRefPath);
      }
      const tempOut = path.join(baseDir, "data", "omnivoice", `temp_${assetId}.mp3`);
      fs.mkdirSync(path.dirname(tempOut), { recursive: true });

      try {
        const sp = Number(speed) || 1.0;
        const ratePct = Math.round((sp - 1.0) * 100);
        const rateArg = ratePct >= 0 ? `--rate=+${ratePct}%` : `--rate=${ratePct}%`;

        // Determine edge voice and pitch argument
        let selectedNeuralVoice = "vi-VN-NamMinhNeural";
        const edgeArgs: string[] = [];

        if (voiceAnalysis) {
          // If reference audio was analyzed, adopt its gender & pitch
          if (voice === "omnivoice_custom" || voice === "omnivoice" || !VOICE_MAP[voice]) {
            selectedNeuralVoice = voiceAnalysis.selected_voice;
          } else {
            selectedNeuralVoice = VOICE_MAP[voice];
          }

          if (voiceAnalysis.pitch_arg && voiceAnalysis.pitch_arg !== "+0Hz") {
            edgeArgs.push("--pitch", voiceAnalysis.pitch_arg);
          }

          const refName = path.basename(resolvedRefPath || "reference");
          const genderLabel = voiceAnalysis.gender === "female" ? "Giọng Nữ" : "Giọng Nam";
          engineUsed = `OmniVoice Clone (Mẫu: ${refName} · ${genderLabel} ${voiceAnalysis.median_f0}Hz ${voiceAnalysis.pitch_arg})`;
        } else if (activeDescription) {
          const low = activeDescription.toLowerCase();
          if (low.includes("female") || low.includes("nữ") || low.includes("gái") || low.includes("cô")) {
            selectedNeuralVoice = "vi-VN-HoaiMyNeural";
          } else {
            selectedNeuralVoice = "vi-VN-NamMinhNeural";
          }
          if (low.includes("low pitch") || low.includes("trầm")) {
            edgeArgs.push("--pitch", "-20Hz");
          } else if (low.includes("high pitch") || low.includes("cao")) {
            edgeArgs.push("--pitch", "+25Hz");
          }
          engineUsed = `OmniVoice Voice Design (${activeDescription})`;
        } else if (VOICE_MAP[voice]) {
          selectedNeuralVoice = VOICE_MAP[voice];
          engineUsed = `Neural TTS (${selectedNeuralVoice})`;
        } else if (isOmni) {
          selectedNeuralVoice = "vi-VN-NamMinhNeural";
          engineUsed = "OmniVoice (Voice-Lock v2 · 1.2x)";
        }

        edgeArgs.push(
          "--voice", selectedNeuralVoice,
          rateArg,
          "--text", cleanText,
          "--write-media", tempOut
        );

        // Run edge-tts CLI with retry
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            await execFileAsync(EDGE_TTS_PATH, edgeArgs, { timeout: 30000 });

            if (fs.existsSync(tempOut) && fs.statSync(tempOut).size > 0) {
              audioBuffer = fs.readFileSync(tempOut);
              fs.unlinkSync(tempOut);
              ext = "mp3";
              mimeType = "audio/mpeg";
              break;
            }
          } catch (e) {
            if (attempt === 3) throw e;
            await new Promise((r) => setTimeout(r, 800));
          }
        }
      } catch (localErr) {
        console.error("Local TTS generation error:", localErr);
        if (fs.existsSync(tempOut)) {
          try { fs.unlinkSync(tempOut); } catch {}
        }
      }
    }

    if (!audioBuffer) {
      throw new Error("Không thể tạo âm thanh. Vui lòng kiểm tra lại câu chữ hoặc thử lại.");
    }

    // Save final audio asset
    const fname = `${assetId}-voice-${voice}.${ext}`;
    const outPath = path.join(baseDir, "data", "assets", projectId, fname);
    const relUrl = `/api/files/${projectId}/${fname}`;

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, audioBuffer);

    const createdAt = now();
    const assetName = `Giọng đọc (${isOmni ? "OmniVoice" : voice}) - ${cleanText.slice(0, 30)}...`;

    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      assetId,
      projectId,
      assetName,
      "audio",
      mimeType,
      relUrl,
      JSON.stringify({
        text: cleanText,
        voice,
        speed,
        model,
        referenceAudio: resolvedRefPath ? `/api/files/${projectId}/${path.basename(resolvedRefPath)}` : null,
        analysis: voiceAnalysis,
        engine: engineUsed,
        size: audioBuffer.length
      }),
      createdAt
    );

    const asset = {
      id: assetId,
      projectId,
      name: assetName,
      kind: "audio",
      mime: mimeType,
      url: relUrl,
      size: audioBuffer.length,
      createdAt,
    };

    return NextResponse.json({
      success: true,
      asset,
      url: relUrl,
      engine: engineUsed,
      referenceMatched: !!voiceAnalysis,
      gender: voiceAnalysis?.gender,
      medianF0: voiceAnalysis?.median_f0,
      pitchArg: voiceAnalysis?.pitch_arg,
    });
  } catch (err: unknown) {
    console.error("TTS generation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error generating voice" },
      { status: 500 }
    );
  }
}
