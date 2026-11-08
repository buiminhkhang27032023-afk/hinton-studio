import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getProvider } from "@/lib/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const stored = db.prepare("SELECT value FROM settings WHERE key = 'elevenlabs_api_key'").get() as { value: string } | undefined;
    let apiKey = process.env.ELEVENLABS_API_KEY || "";
    if (!apiKey && stored?.value) {
      try { apiKey = JSON.parse(stored.value); } catch { apiKey = stored.value; }
    }
    if (!apiKey) {
      const prov = getProvider("elevenlabs");
      apiKey = prov.apiKey || "";
    }

    let elevenLabsData: {
      hasKey: boolean;
      tier: string;
      canInstantClone: boolean;
      characterCount: number;
      characterLimit: number;
      voices: Array<{ id: string; name: string; category: string; previewUrl?: string }>;
    } = {
      hasKey: Boolean(apiKey),
      tier: "none",
      canInstantClone: false,
      characterCount: 0,
      characterLimit: 0,
      voices: [],
    };

    if (apiKey && apiKey.trim()) {
      try {
        // 1. Fetch Subscription details
        const subRes = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
          headers: { "xi-api-key": apiKey.trim() },
          signal: AbortSignal.timeout(6000),
        });
        if (subRes.ok) {
          const sub = await subRes.json();
          elevenLabsData.tier = sub.tier || "free";
          elevenLabsData.canInstantClone = Boolean(sub.can_use_instant_voice_cloning);
          elevenLabsData.characterCount = sub.character_count || 0;
          elevenLabsData.characterLimit = sub.character_limit || 10000;
        }

        // 2. Fetch Voices
        const vRes = await fetch("https://api.elevenlabs.io/v1/voices", {
          headers: { "xi-api-key": apiKey.trim() },
          signal: AbortSignal.timeout(6000),
        });
        if (vRes.ok) {
          const vData = await vRes.json();
          if (Array.isArray(vData.voices)) {
            elevenLabsData.voices = vData.voices.map((v: any) => ({
              id: v.voice_id,
              name: v.name,
              category: v.category || "premade",
              previewUrl: v.preview_url,
            }));
          }
        }
      } catch (err) {
        console.warn("Failed to query ElevenLabs API for voices:", err);
      }
    }

    return NextResponse.json({
      ok: true,
      elevenlabs: elevenLabsData,
      local: {
        omnivoice: true,
        voices: [
          { id: "hoai_my", name: "Hoài My (Nữ Linh · Ấm Áp)", gender: "female", lang: "vi" },
          { id: "nam_minh", name: "Nam Minh (Nam Thắng · Trầm Ấm)", gender: "male", lang: "vi" },
          { id: "omnivoice", name: "OmniVoice (Nam Voice-Lock v2 Chuẩn)", gender: "male", lang: "vi" },
        ],
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || String(err) }, { status: 500 });
  }
}
