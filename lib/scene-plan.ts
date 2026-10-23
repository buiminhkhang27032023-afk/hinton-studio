import type { ModelRecord } from "./types";

/** Durations each video model accepts on this gateway (from its docs). */
export function allowedDurations(modelId?: string | null): number[] {
  if (modelId === "seed:video:piapi-omni-reference") return Array.from({ length: 12 }, (_, i) => i + 4);
  if (modelId?.includes("veo")) return [4, 6, 8];
  if (modelId?.startsWith("iooai:")) return [10];
  if (modelId?.includes("omni")) return [5, 10];
  return [5, 10, 15, 20, 30];
}

/** Largest clip the model supports — used to fill a target length. */
export function maxDuration(modelId?: string | null): number {
  const list = allowedDurations(modelId);
  return list[list.length - 1];
}

/**
 * Split a requested total length into clips the model can actually produce.
 *
 * Rule from the product: never come up short — rounding is always upward, so a
 * 12s request on a model that only does 4/6/8 becomes 8 + 6 = 14s, not 12s.
 */
export function planScenes(totalSeconds: number, modelId?: string | null): number[] {
  const options = allowedDurations(modelId).slice().sort((a, b) => b - a);
  const target = Math.max(1, Math.round(totalSeconds));
  const clips: number[] = [];

  let remaining = target;
  while (remaining > 0) {
    // Pick the longest clip that does not overshoot by more than one step.
    const fit = options.find((option) => option <= remaining);
    if (fit) {
      clips.push(fit);
      remaining -= fit;
      continue;
    }
    // Remaining is smaller than every option: use the smallest one and stop.
    clips.push(options[options.length - 1]);
    remaining = 0;
  }

  return clips;
}

/** True when the plan adds a few seconds rather than falling short. */
export function planIsOver(target: number, clips: number[]): boolean {
  return clips.reduce((sum, value) => sum + value, 0) >= target;
}

export interface PlannedScene {
  title: string;
  prompt: string;
  seconds: number;
}

/**
 * Turn a story idea into shot-by-shot prompts that fit the planned clip
 * lengths. The caller supplies a beat template; we distribute it evenly.
 */
export function buildScenePrompts(
  idea: string,
  clips: number[],
  opts: { subject?: string; wardrobe?: string; location?: string; style?: string } = {},
): PlannedScene[] {
  const beats = [
    "establishing wide shot, subject enters the frame",
    "medium tracking shot following the subject",
    "close-up detail shot, texture and fabric",
    "three-quarter shot, subject turns toward camera",
    "low angle hero shot",
    "over-the-shoulder moving shot",
    "wide shot, subject exits frame",
    "final beauty shot, slow push in",
  ];

  const base = [idea.trim(), opts.subject, opts.wardrobe, opts.location, opts.style]
    .filter(Boolean)
    .join(". ");

  return clips.map((seconds, index) => ({
    title: `Cảnh ${index + 1} · ${seconds}s`,
    seconds,
    prompt: `${base}. ${beats[index % beats.length]}.`,
  }));
}

/** Best video model available, preferring ones known to work. */
export function pickVideoModel(models: ModelRecord[]): ModelRecord | undefined {
  const videos = models.filter((model) => model.kind === "video");
  return videos.find((model) => model.id.includes("veo")) ?? videos[0];
}
