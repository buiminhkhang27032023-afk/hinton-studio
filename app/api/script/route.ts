import { NextResponse } from "next/server";
import { getProvider } from "@/lib/provider";
import { planScenes, allowedDurations } from "@/lib/scene-plan";
import { presetPromptBlock, getPreset } from "@/lib/presets";
import { getMemory } from "@/lib/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

interface Scene {
  title: string;
  prompt: string;
  seconds: number;
}

/**
 * Write a shot list from an idea.
 *
 * Body: { idea, totalSeconds, modelId, presetId?, characterId?, styleText?, locale? }
 * The number of shots comes from what the model can actually render, so the
 * batch never falls short of the requested length.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    idea?: string;
    totalSeconds?: number;
    modelId?: string;
    presetId?: string;
    characterId?: string;
    styleText?: string;
    wardrobe?: string;
    location?: string;
    locale?: "vi" | "en";
  };

  const total = Math.max(4, Number(body.totalSeconds) || 12);
  const clips = planScenes(total, body.modelId);
  const allowed = allowedDurations(body.modelId);

  if (!body.idea?.trim()) {
    return NextResponse.json({ error: "Hãy nhập ý tưởng." }, { status: 400 });
  }

  const preset = body.presetId ? getPreset(body.presetId) : null;
  const character = body.characterId
    ? getMemory(body.characterId)
    : preset?.characterId
      ? getMemory(preset.characterId)
      : null;

  // Everything that must stay identical across the batch.
  const continuityParts: string[] = [];
  if (character) continuityParts.push(`SAME CHARACTER: ${character.description}`);
  if (preset) continuityParts.push(presetPromptBlock(preset));
  if (body.wardrobe?.trim()) continuityParts.push(`Wardrobe: ${body.wardrobe.trim()}.`);
  if (body.location?.trim()) continuityParts.push(`Location: ${body.location.trim()}.`);
  if (body.styleText?.trim()) continuityParts.push(`Style: ${body.styleText.trim()}.`);
  const continuity = continuityParts.join(" ");

  const provider = getProvider();
  let scenes: Scene[] = [];

  if (provider.apiKey) {
    try {
      const res = await fetch(`${provider.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: provider.defaultChatModel || "gpt-5.6-luna",
          messages: [
            {
              role: "user",
              content: [
                "You are a fashion film director writing a shot list for an AI video model.",
                `Idea: ${body.idea.trim()}`,
                continuity ? `Continuity constraints that EVERY prompt must respect: ${continuity}` : "",
                `Write exactly ${clips.length} shots, each one shot for a ${clips[0]}s clip.`,
                `Shot lengths in order: ${clips.join(", ")} seconds.`,
                "Rules:",
                "- Each prompt is English, 30-55 words, describing ONE continuous camera move.",
                "- Every prompt must repeat the same character/wardrobe/location wording so nothing drifts.",
                "- Vary the camera: establishing, tracking, close-up, three-quarter, low angle, beauty shot.",
                "- No text overlays, no cuts inside a shot.",
                "Return ONLY valid JSON, nothing else:",
                `{"scenes":[{"title":"ngắn tiếng Việt","prompt":"english prompt","seconds":${clips[0]}}]}`,
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
          max_tokens: 1600,
        }),
        signal: AbortSignal.timeout(150_000),
      });

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      };
      const raw = json.choices?.[0]?.message?.content ?? "";
      const match = /\{[\s\S]*\}/.exec(raw);
      const parsed = JSON.parse(match?.[0] ?? "{}") as { scenes?: Scene[] };
      if (Array.isArray(parsed.scenes) && parsed.scenes.length) {
        scenes = parsed.scenes.slice(0, clips.length).map((scene, index) => ({
          title: scene.title?.slice(0, 60) || `Cảnh ${index + 1}`,
          prompt: String(scene.prompt ?? "").trim(),
          // Lengths are decided here, never by the model.
          seconds: clips[index] ?? clips[clips.length - 1],
        }));
      }
    } catch {
      /* fall through to the deterministic plan */
    }
  }

  // Deterministic fallback so the feature works even without a chat model.
  if (!scenes.length) {
    const beats = [
      "Establishing wide shot: subject enters the frame, camera slowly tracks left.",
      "Medium tracking shot from the side, subject walks at a steady pace.",
      "Close-up detail shot on fabric and movement, shallow depth of field.",
      "Three-quarter shot, subject turns toward camera, hair moving in the wind.",
      "Low angle hero shot, camera pushes in slowly.",
      "Beauty shot, subject holds still, gentle camera drift.",
    ];
    scenes = clips.map((seconds, index) => ({
      title: `Cảnh ${index + 1}`,
      seconds,
      prompt: [
        body.idea!.trim(),
        continuity,
        beats[index % beats.length],
        "Cinematic fashion film, shot on 35mm, consistent colour grade across all shots.",
      ]
        .filter(Boolean)
        .join(" "),
    }));
  }

  return NextResponse.json({
    scenes,
    plan: clips,
    totalSeconds: clips.reduce((sum, value) => sum + value, 0),
    requestedSeconds: total,
    allowedDurations: allowed,
  });
}