import fs from "node:fs";
import path from "node:path";
import { ASSET_DIR, getDb, now, uid } from "./db";
import type { Asset, AssetKind } from "./types";

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

export function extForMime(mime: string, fallback = "bin"): string {
  return EXT_BY_MIME[mime.split(";")[0].trim()] ?? fallback;
}

export function kindForMime(mime: string): AssetKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

export function projectDir(projectId: string): string {
  const dir = path.join(ASSET_DIR, projectId.replace(/[^a-zA-Z0-9_-]/g, ""));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function assetUrl(projectId: string, filename: string): string {
  return `/api/files/${encodeURIComponent(projectId)}/${encodeURIComponent(filename)}`;
}

export function saveAsset(opts: {
  projectId: string | null;
  name: string;
  buffer: Buffer;
  mime: string;
  meta?: Record<string, unknown>;
}): Asset {
  const id = uid("asset");
  const ext = extForMime(opts.mime);
  const safeName = opts.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 60) || "asset";
  const filename = `${id}-${safeName}.${ext}`;
  const folder = projectDir(opts.projectId ?? "_library");
  fs.writeFileSync(path.join(folder, filename), opts.buffer);

  const url = assetUrl(opts.projectId ?? "_library", filename);
  const kind = kindForMime(opts.mime);
  const createdAt = now();

  getDb()
    .prepare(
      `INSERT INTO assets(id, project_id, name, kind, mime, url, meta, created_at)
       VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      opts.projectId,
      opts.name,
      kind,
      opts.mime,
      url,
      JSON.stringify(opts.meta ?? {}),
      createdAt,
    );

  return {
    id,
    projectId: opts.projectId,
    name: opts.name,
    kind,
    mime: opts.mime,
    url,
    size: opts.buffer.byteLength,
    meta: opts.meta,
    createdAt,
  };
}

export function rowToAsset(row: Record<string, unknown>): Asset {
  const meta = row.meta ? JSON.parse(String(row.meta)) : {};
  return {
    id: String(row.id),
    projectId: (row.project_id as string | null) ?? null,
    name: String(row.name),
    kind: row.kind as AssetKind,
    mime: String(row.mime),
    url: String(row.url),
    size: Number(row.size ?? 0) || undefined,
    meta,
    createdAt: Number(row.created_at),
  };
}

export function listAssets(projectId?: string): Asset[] {
  const db = getDb();
  const rows = projectId
    ? db.prepare("SELECT * FROM assets WHERE project_id = ? ORDER BY created_at DESC").all(projectId)
    : db.prepare("SELECT * FROM assets ORDER BY created_at DESC").all();
  return (rows as Record<string, unknown>[]).map(rowToAsset);
}

export function getAsset(id: string): Asset | null {
  const row = getDb().prepare("SELECT * FROM assets WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToAsset(row) : null;
}

export function deleteAsset(id: string): void {
  const asset = getAsset(id);
  if (!asset) return;
  const filename = decodeURIComponent(asset.url.split("/").pop() ?? "");
  const folder = projectDir(asset.projectId ?? "_library");
  try {
    fs.unlinkSync(path.join(folder, filename));
  } catch {
    /* file already gone */
  }
  getDb().prepare("DELETE FROM assets WHERE id = ?").run(id);
}

/** Persist bytes coming back from the provider (URL or base64 data URI). */
export async function persistRemoteAsset(opts: {
  projectId: string | null;
  name: string;
  source: string;
  fallbackMime?: string;
  meta?: Record<string, unknown>;
}): Promise<Asset> {
  let buffer: Buffer;
  let mime = opts.fallbackMime ?? "application/octet-stream";

  if (opts.source.startsWith("data:")) {
    const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(opts.source);
    if (!match) throw new Error("Dữ liệu base64 không hợp lệ");
    mime = match[1] || mime;
    buffer = match[2] ? Buffer.from(match[3], "base64") : Buffer.from(decodeURIComponent(match[3]));
  } else {
    const res = await fetch(opts.source, { signal: AbortSignal.timeout(180_000) });
    if (!res.ok) throw new Error(`Không tải được kết quả (HTTP ${res.status})`);
    mime = res.headers.get("content-type")?.split(";")[0] ?? mime;
    buffer = Buffer.from(await res.arrayBuffer());
  }

  return saveAsset({
    projectId: opts.projectId,
    name: opts.name,
    buffer,
    mime,
    meta: opts.meta,
  });
}

/**
 * Turn a locally stored asset URL into a data URI. Provider servers cannot read
 * our /api/files paths, so any local image has to be inlined before upload.
 */
export function localUrlToDataUri(url: string): string {
  if (!url || !url.startsWith("/api/files/")) return url;
  const parts = url.split("/").filter(Boolean); // ["api","files",project,file]
  const project = decodeURIComponent(parts[2] ?? "");
  const file = decodeURIComponent(parts[3] ?? "");
  const full = path.join(ASSET_DIR, project, path.basename(file));
  if (!full.startsWith(ASSET_DIR) || !fs.existsSync(full)) return url;
  const ext = file.split(".").pop()?.toLowerCase() ?? "";
  const mime =
    ext === "jpg" || ext === "jpeg" ? "image/jpeg"
    : ext === "webp" ? "image/webp"
    : ext === "gif" ? "image/gif"
    : "image/png";
  return `data:${mime};base64,${fs.readFileSync(full).toString("base64")}`;
}
