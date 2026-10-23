import { getDb, now } from "./db";
import type { ModelConfig, ModelKind, ModelRecord } from "./types";
import { rowToModel } from "./models";

/** Hints a provider catalog entry may carry. */
export interface CatalogEntry {
  id: string;
  displayName?: string;
  billingUnit?: string;
  endpointTypes?: string[];
  hints?: string;
}

/**
 * Models we deliberately keep out of the picker. These are fixed-length
 * variants priced far above the base model (30.000đ / 50.000đ per video).
 */
export const EXCLUDED_MODELS = new Set(["seedance-2.5-10s", "seedance-2.5-30s"]);

/** Ids like `buihuuthang/` or `req/` carry no model name — skip them. */
export function isValidModelId(id: string): boolean {
  if (!id || !id.trim()) return false;
  const trimmed = id.trim();
  // Must end with a real model slug, not a separator.
  if (/[/:._-]$/.test(trimmed)) return false;
  // Bare prefixes such as "req/" or "buihuuthang/" have no slug after the slash.
  const slug = trimmed.split("/").pop() ?? "";
  if (slug.length < 2) return false;
  return true;
}

/**
 * Auto-detect the model kind. The catalog tells us the billing unit: per-request
 * models are media (image/video/upscale), per-token models are chat.
 */
export function detectKind(entry: CatalogEntry): ModelKind {
  const text = `${entry.id} ${entry.displayName ?? ""} ${entry.hints ?? ""}`.toLowerCase();

  if (/(upscal|super.?res|esrgan|realesr|enhanc)/.test(text)) return "upscale";
  if (/(lora|fine.?tun)/.test(text)) return "train";
  if (
    /(seedance|veo|kling|runway|sora|wan.?2|hailuo|pika|luma|dream.?machine|omni.?flash|\bt2v\b|\bi2v\b|video)/.test(
      text,
    )
  ) {
    return "video";
  }
  // Explicit image words win over the billing heuristic.
  // "gemini-*-image" answers only via /chat/completions on this gateway.
  if (/gemini.*image/.test(text)) return "chat";
  if (/(image|flux|dall|sd.?xl|midjourney|imagen|nano.?banana|stable.?diffusion)/.test(text)) {
    return "image";
  }
  // Known chat families — checked before billing_unit, which is per-request for
  // several gateways even on text models.
  if (
    /(gpt|claude|gemini|qwen|llama|deepseek|glm|grok|kimi|chat|codex|minimax|mistral|o[1-9]|sol\b|luna\b|terra\b|astra\b)/.test(
      text,
    )
  ) {
    return "chat";
  }
  if (entry.billingUnit === "request") return "image";
  return "image";
}

/** Endpoint + body template matching the kind, for models discovered by id. */
export function configForKind(kind: ModelKind, modelId: string): ModelConfig {
  if (kind === "video") {
    return {
      endpoint: "/videos",
      method: "POST",
      body: {
        model: modelId,
        prompt: "{{prompt}}",
        seconds: "{{duration}}",
        size: "{{size}}",
        // Docs call the reference image `input_reference`; a single image is
        // used as the first frame. Empty values are stripped before sending.
        input_reference: "{{image}}",
      },
      jobPath: "id",
      pollEndpoint: "/videos/{{job}}",
      statusPath: "status",
      doneValues: ["completed", "succeeded", "success", "done"],
      failedValues: ["failed", "error", "cancelled"],
      contentEndpoint: "/videos/{{job}}/content",
      resultPath: "data.0.url",
      timeout: 900,
    };
  }
  if (kind === "upscale") {
    return {
      endpoint: "/images/upscale",
      body: { model: modelId, image: "{{image}}", scale: "{{scale}}" },
      resultPath: "data.0.url",
      timeout: 300,
    };
  }
  if (kind === "chat") {
    return {
      endpoint: "/chat/completions",
      body: { model: modelId, messages: [{ role: "user", content: "{{prompt}}" }] },
      resultPath: "choices.0.message.content",
      timeout: 180,
    };
  }
  if (kind === "train") {
    return {
      endpoint: "/fine_tuning/jobs",
      body: { model: modelId, dataset: "{{dataset}}", name: "{{name}}" },
      jobPath: "id",
      pollEndpoint: "/fine_tuning/jobs/{{job}}",
      resultPath: "fine_tuned_model",
      timeout: 3600,
    };
  }
  return {
    endpoint: "/images/generations",
    body: { model: modelId, prompt: "{{prompt}}", n: 1, size: "{{size}}", response_format: "url" },
    resultPath: "data.0.url",
    timeout: 300,
  };
}

export interface SyncResult {
  created: number;
  updated: number;
  removed: number;
  total: number;
  skipped: number;
}

/**
 * Merge a provider catalog into the local list.
 *
 * Duplicate ids are common (`veo-3.1` and `req/veo-3.1`). We keep the shortest
 * id for each (display name + kind) pair so the model picker stays readable.
 */
export function syncProviderModels(
  entries: CatalogEntry[],
  opts: { onlyNew?: boolean; replace?: boolean } = {},
): SyncResult {
  const db = getDb();
  const result: SyncResult = { created: 0, updated: 0, removed: 0, total: entries.length, skipped: 0 };

  // Drop unusable ids and collapse duplicates.
  const best = new Map<string, CatalogEntry & { kind: ModelKind }>();
  for (const entry of entries) {
    if (!isValidModelId(entry.id) || EXCLUDED_MODELS.has(entry.id.trim())) {
      result.skipped += 1;
      continue;
    }
    const kind = detectKind(entry);
    const key = `${(entry.displayName ?? entry.id).toLowerCase()}::${kind}`;
    const current = best.get(key);
    if (!current || entry.id.length < current.id.length) {
      best.set(key, { ...entry, id: entry.id.trim(), kind });
    }
  }

  if (opts.replace) {
    // Re-sync from scratch: drop previously synced rows so removals propagate.
    result.removed = Number(
      (db.prepare("DELETE FROM models WHERE provider = 'provider'").run() as { changes: number }).changes,
    );
  }

  const find = db.prepare("SELECT * FROM models WHERE id = ?");
  const insert = db.prepare(
    `INSERT INTO models(id, label, kind, provider, description, config, builtin, created_at)
     VALUES(?, ?, ?, 'provider', ?, ?, 0, ?)`,
  );
  const update = db.prepare(
    "UPDATE models SET kind = ?, label = ?, config = ? WHERE id = ?",
  );

  for (const entry of best.values()) {
    const label = entry.displayName?.trim() || entry.id;
    const existing = find.get(entry.id) as Record<string, unknown> | undefined;

    if (existing) {
      if (opts.onlyNew) {
        result.skipped += 1;
        continue;
      }
      const record = rowToModel(existing);
      // Auto-synced rows get the default template for their kind refreshed;
      // hand-made models keep whatever the user tuned.
      const config =
        record.provider === "provider"
          ? JSON.stringify(configForKind(entry.kind, entry.id))
          : JSON.stringify(record.config);
      update.run(entry.kind, record.builtin ? record.label : label, config, entry.id);
      result.updated += 1;
      continue;
    }

    insert.run(
      entry.id,
      label,
      entry.kind,
      entry.billingUnit === "request"
        ? `Model media · tính theo lượt gọi`
        : `Model chat · tính theo token`,
      JSON.stringify(configForKind(entry.kind, entry.id)),
      now(),
    );
    result.created += 1;
  }

  return result;
}
