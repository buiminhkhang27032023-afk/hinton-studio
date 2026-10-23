import { getDb, now, uid } from "./db";
import type { MemoryEntry } from "./memory";
import { getMemory } from "./memory";

export interface LookPreset {
  id: string;
  name: string;
  characterId: string | null;
  wardrobe: string;
  location: string;
  styleId: string;
  promptSuffix: string;
  refUrl: string | null;
  seed: number | null;
  createdAt: number;
}

function rowToPreset(row: Record<string, unknown>): LookPreset {
  return {
    id: String(row.id),
    name: String(row.name),
    characterId: (row.character_id as string | null) ?? null,
    wardrobe: String(row.wardrobe ?? ""),
    location: String(row.location ?? ""),
    styleId: String(row.style_id ?? "cinematic"),
    promptSuffix: String(row.prompt_suffix ?? ""),
    refUrl: (row.ref_url as string | null) ?? null,
    seed: row.seed == null ? null : Number(row.seed),
    createdAt: Number(row.created_at),
  };
}

export function listPresets(): LookPreset[] {
  const rows = getDb().prepare("SELECT * FROM presets ORDER BY created_at DESC").all();
  return (rows as Record<string, unknown>[]).map(rowToPreset);
}

export function getPreset(id: string): LookPreset | null {
  const row = getDb().prepare("SELECT * FROM presets WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToPreset(row) : null;
}

export function savePreset(
  input: Omit<LookPreset, "createdAt" | "id"> & { id?: string },
): LookPreset {
  const id = input.id ?? uid("look");
  getDb()
    .prepare(
      `INSERT INTO presets(id, name, character_id, wardrobe, location, style_id, prompt_suffix, ref_url, seed, created_at)
       VALUES(?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         character_id = excluded.character_id,
         wardrobe = excluded.wardrobe,
         location = excluded.location,
         style_id = excluded.style_id,
         prompt_suffix = excluded.prompt_suffix,
         ref_url = excluded.ref_url,
         seed = excluded.seed`,
    )
    .run(
      id,
      input.name,
      input.characterId ?? null,
      input.wardrobe ?? "",
      input.location ?? "",
      input.styleId ?? "cinematic",
      input.promptSuffix ?? "",
      input.refUrl ?? null,
      input.seed ?? null,
      now(),
    );
  return getPreset(id)!;
}

export function deletePreset(id: string): void {
  getDb().prepare("DELETE FROM presets WHERE id = ?").run(id);
}

/** The continuity block that is prepended to every scene prompt in a batch. */
export function presetPromptBlock(preset: LookPreset): string {
  const parts: string[] = [];
  const character: MemoryEntry | null = preset.characterId ? getMemory(preset.characterId) : null;

  if (character) {
    parts.push(`SAME CHARACTER in every shot: ${character.description}`);
  }
  if (preset.wardrobe.trim()) parts.push(`Wardrobe: ${preset.wardrobe.trim()}.`);
  if (preset.location.trim()) parts.push(`Location: ${preset.location.trim()}.`);
  if (preset.promptSuffix.trim()) parts.push(preset.promptSuffix.trim());
  parts.push(
    "Keep the same face, hairstyle, body, outfit and lighting across all shots. Consistent colour grade. No text overlays.",
  );
  return parts.join(" ");
}
