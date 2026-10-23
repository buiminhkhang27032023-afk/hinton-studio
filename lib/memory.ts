import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import os from "node:os";
import { ASSET_DIR, getDb, now, uid } from "./db";
import { getProvider } from "./provider";
import { localUrlToDataUri } from "./storage";

/* ------------------------------- types ---------------------------------- */

export type MemoryKind = "character" | "style" | "wardrobe" | "location" | "trend";

export interface MemoryEntry {
  id: string;
  projectId: string | null;
  kind: MemoryKind;
  name: string;
  description: string;
  sourceUrl: string | null;
  tags: string[];
  uses: number;
  createdAt: number;
  updatedAt: number;
}

/* ------------------------------ storage --------------------------------- */

function rowToMemory(row: Record<string, unknown>): MemoryEntry {
  return {
    id: String(row.id),
    projectId: (row.project_id as string | null) ?? null,
    kind: row.kind as MemoryKind,
    name: String(row.name),
    description: String(row.description),
    sourceUrl: (row.source_url as string | null) ?? null,
    tags: row.tags ? (JSON.parse(String(row.tags)) as string[]) : [],
    uses: Number(row.uses ?? 0),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function listMemory(kind?: MemoryKind): MemoryEntry[] {
  const db = getDb();
  const rows = kind
    ? db.prepare("SELECT * FROM memory WHERE kind = ? ORDER BY updated_at DESC").all(kind)
    : db.prepare("SELECT * FROM memory ORDER BY updated_at DESC").all();
  return (rows as Record<string, unknown>[]).map(rowToMemory);
}

export function getMemory(id: string): MemoryEntry | null {
  const row = getDb().prepare("SELECT * FROM memory WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToMemory(row) : null;
}

export function saveMemory(input: {
  id?: string;
  projectId?: string | null;
  kind: MemoryKind;
  name: string;
  description: string;
  sourceUrl?: string | null;
  tags?: string[];
}): MemoryEntry {
  const db = getDb();
  const id = input.id ?? uid("mem");
  const timestamp = now();
  db.prepare(
    `INSERT INTO memory(id, project_id, kind, name, description, source_url, tags, uses, created_at, updated_at)
     VALUES(?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       kind = excluded.kind,
       name = excluded.name,
       description = excluded.description,
       source_url = excluded.source_url,
       tags = excluded.tags,
       updated_at = excluded.updated_at`,
  ).run(
    id,
    input.projectId ?? null,
    input.kind,
    input.name,
    input.description,
    input.sourceUrl ?? null,
    JSON.stringify(input.tags ?? []),
    timestamp,
    timestamp,
  );
  return getMemory(id)!;
}

export function deleteMemory(id: string): void {
  getDb().prepare("DELETE FROM memory WHERE id = ?").run(id);
}

export function bumpMemoryUse(ids: string[]): void {
  const db = getDb();
  const stmt = db.prepare("UPDATE memory SET uses = uses + 1, updated_at = ? WHERE id = ?");
  for (const id of ids) stmt.run(now(), id);
}

/* ----------------------------- analysis --------------------------------- */

export interface Analysis {
  id: string;
  projectId: string | null;
  assetId: string | null;
  kind: string;
  summary: string;
  payload: Record<string, unknown>;
  createdAt: number;
}

export function saveAnalysis(input: {
  projectId?: string | null;
  assetId?: string | null;
  kind: string;
  summary: string;
  payload?: Record<string, unknown>;
}): Analysis {
  const analysis: Analysis = {
    id: uid("ana"),
    projectId: input.projectId ?? null,
    assetId: input.assetId ?? null,
    kind: input.kind,
    summary: input.summary,
    payload: input.payload ?? {},
    createdAt: now(),
  };
  getDb()
    .prepare(
      "INSERT INTO analyses(id, project_id, asset_id, kind, summary, payload, created_at) VALUES(?,?,?,?,?,?,?)",
    )
    .run(
      analysis.id,
      analysis.projectId,
      analysis.assetId,
      analysis.kind,
      analysis.summary,
      JSON.stringify(analysis.payload),
      analysis.createdAt,
    );
  return analysis;
}

export function listAnalyses(projectId?: string, limit = 30): Analysis[] {
  const db = getDb();
  const rows = projectId
    ? db.prepare("SELECT * FROM analyses WHERE project_id = ? ORDER BY created_at DESC LIMIT ?").all(projectId, limit)
    : db.prepare("SELECT * FROM analyses ORDER BY created_at DESC LIMIT ?").all(limit);
  return (rows as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    projectId: (row.project_id as string | null) ?? null,
    assetId: (row.asset_id as string | null) ?? null,
    kind: String(row.kind),
    summary: String(row.summary),
    payload: row.payload ? JSON.parse(String(row.payload)) : {},
    createdAt: Number(row.created_at),
  }));
}

/* ---------------------------- vision calls ------------------------------- */

const VISION_MODEL = "gpt-5.6-luna";

async function chatWithImage(prompt: string, imageDataUri: string): Promise<string> {
  const provider = getProvider();
  if (!provider.apiKey) throw new Error("Chưa cấu hình API key.");

  const res = await fetch(`${provider.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.defaultChatModel || VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageDataUri } },
          ],
        },
      ],
      max_tokens: 700,
    }),
    signal: AbortSignal.timeout(180_000),
  });

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(json.error?.message ?? `Vision API lỗi ${res.status}`);
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

/** Read a still image and describe the person/look in reusable terms. */
export async function describeCharacterImage(sourceUrl: string): Promise<{
  name: string;
  description: string;
  tags: string[];
}> {
  const dataUri = localUrlToDataUri(sourceUrl);
  const raw = await chatWithImage(
    [
      "Bạn là chuyên gia tạo prompt cho model video AI.",
      "Hãy mô tả ngắn gọn nhưng đủ chi tiết để một model video tái tạo ĐÚNG nhân vật này:",
      "- giới tính, độ tuổi ước chừng, dáng người",
      "- khuôn mặt: hình dạng, mắt, lông mày, mũi, môi",
      "- tóc: độ dài, kiểu, màu",
      "- trang phục và phụ kiện đang mặc",
      "Chỉ trả về 2 phần, đúng định dạng:",
      "TÊN: <tên ngắn gọn 2-4 từ>",
      "MÔ TẢ: <một đoạn tiếng Anh, 40-70 từ, dùng cho prompt video>",
    ].join("\n"),
    dataUri,
  );

  const nameMatch = /TÊN:\s*(.+)/i.exec(raw);
  const descMatch = /MÔ TẢ:\s*([\s\S]+)/i.exec(raw);
  const description = (descMatch?.[1] ?? raw).trim();
  return {
    name: nameMatch?.[1]?.trim().slice(0, 40) || "Nhân vật",
    description,
    tags: extractTags(description),
  };
}

/** Read a style/trend reference and turn it into prompt language. */
export async function describeStyleImage(sourceUrl: string): Promise<{ description: string; tags: string[] }> {
  const dataUri = localUrlToDataUri(sourceUrl);
  const raw = await chatWithImage(
    [
      "Analyse this fashion image as a cinematographer and stylist.",
      "Return one English paragraph (40-70 words) describing: lighting, colour palette, camera/lens feel, wardrobe styling, mood, and the trend it belongs to.",
      "Do not describe the person's identity. Output only the paragraph.",
    ].join("\n"),
    dataUri,
  );
  return { description: raw, tags: extractTags(raw) };
}

function extractTags(text: string): string[] {
  const stop = new Set([
    "the", "a", "an", "and", "with", "of", "in", "on", "her", "his", "she", "he", "is", "are",
    "very", "soft", "light", "dark", "long", "short", "white", "black", "this", "that",
  ]);
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 3 && !stop.has(word)),
    ),
  ).slice(0, 12);
}

/* --------------------------- video analysis ------------------------------ */

function ffmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: "ignore" });
    proc.on("error", reject);
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg lỗi ${code}`))));
  });
}

function ffprobeDuration(file: string): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn("ffprobe", [
      "-v", "error", "-show_entries", "format=duration",
      "-of", "default=nw=1:nk=1", file,
    ]);
    let out = "";
    proc.stdout.on("data", (chunk) => (out += chunk));
    proc.on("close", () => resolve(Number.parseFloat(out.trim()) || 0));
    proc.on("error", () => resolve(0));
  });
}

/** Pull evenly spaced stills out of a clip so the vision model can read it. */
export async function extractFrames(assetUrl: string, count = 4): Promise<string[]> {
  const parts = assetUrl.split("/").filter(Boolean);
  const project = decodeURIComponent(parts[2] ?? "");
  const file = decodeURIComponent(parts[3] ?? "");
  const source = path.join(ASSET_DIR, project, path.basename(file));
  if (!fs.existsSync(source)) throw new Error("Không tìm thấy file video.");

  const duration = await ffprobeDuration(source);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hinton-frames-"));
  const frames: string[] = [];
  const step = duration > 0 ? duration / (count + 1) : 1;

  for (let i = 1; i <= count; i++) {
    const target = path.join(dir, `f${i}.jpg`);
    try {
      await ffmpeg(["-y", "-ss", String(step * i), "-i", source, "-frames:v", "1", "-vf", "scale=640:-1", "-q:v", "3", target]);
      if (fs.existsSync(target)) {
        frames.push(`data:image/jpeg;base64,${fs.readFileSync(target).toString("base64")}`);
      }
    } catch {
      /* skip unreadable frame */
    }
  }
  return frames;
}

export interface VideoAnalysis {
  summary: string;
  strengths: string[];
  issues: string[];
  continuity: string;
  promptSuggestions: string[];
}

/** Have the vision model read a finished clip and say what to keep or fix. */
export async function analyseVideo(assetUrl: string): Promise<VideoAnalysis> {
  const frames = await extractFrames(assetUrl, 4);
  if (!frames.length) throw new Error("Không trích được khung hình từ video.");

  const provider = getProvider();
  const res = await fetch(`${provider.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.defaultChatModel || VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "Đây là các khung hình lấy từ MỘT video thời trang, theo thứ tự thời gian.",
                "Hãy phân tích và trả về JSON hợp lệ, không thêm chữ nào khác:",
                `{"summary":"1-2 câu tiếng Việt tóm tắt nội dung",`,
                `"strengths":["điểm mạnh ngắn"],`,
                `"issues":["vấn đề: lỗi hình, lệch mặt, tay/chân dị dạng, chữ méo, ánh sáng sai"],`,
                `"continuity":"nhận xét nhân vật/bối cảnh có nhất quán giữa các khung không",`,
                `"promptSuggestions":["cụm từ tiếng Anh nên thêm vào prompt để lần sau tốt hơn"]}`,
              ].join("\n"),
            },
            ...frames.map((url) => ({ type: "image_url", image_url: { url } })),
          ],
        },
      ],
      max_tokens: 900,
    }),
    signal: AbortSignal.timeout(240_000),
  });

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(json.error?.message ?? `API lỗi ${res.status}`);

  const raw = json.choices?.[0]?.message?.content ?? "{}";
  const match = /\{[\s\S]*\}/.exec(raw);
  try {
    const parsed = JSON.parse(match?.[0] ?? "{}") as Partial<VideoAnalysis>;
    return {
      summary: parsed.summary ?? raw.slice(0, 300),
      strengths: parsed.strengths ?? [],
      issues: parsed.issues ?? [],
      continuity: parsed.continuity ?? "",
      promptSuggestions: parsed.promptSuggestions ?? [],
    };
  } catch {
    return { summary: raw.slice(0, 400), strengths: [], issues: [], continuity: "", promptSuggestions: [] };
  }
}
