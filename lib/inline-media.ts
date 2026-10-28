import crypto from "crypto";
import fs from "fs";
import path from "path";
import { ASSET_DIR, DATA_DIR, getDb, getSetting, setSetting } from "./db";

/**
 * Base64 images (data: URIs) were being stored inline in graphs, asset meta and
 * job records. Two projects alone had 75MB + 52MB graphs, so every canvas load
 * and every autosave moved tens of MB, and the Library / AI Stats pages pulled
 * hundreds of MB of JSON. This module moves those blobs to files on disk and
 * keeps only a short /api/files/... URL (which every provider path already
 * accepts: see lib/reference-images.ts and localUrlToDataUri).
 */

const MIN_INLINE_BYTES = 2048; // tiny icons can stay inline
const DATA_URI_RE = /^data:([a-z]+\/[a-z0-9.+-]+)(?:;[a-z0-9=.-]+)*;base64,/i;

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

function folderFor(projectId: string | null | undefined): string {
  const safe = (projectId || "_library").replace(/[^a-zA-Z0-9_-]/g, "") || "_library";
  return safe;
}

function writeDataUri(uri: string, projectId: string | null | undefined): string | null {
  const m = DATA_URI_RE.exec(uri);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const b64 = uri.slice(m[0].length);
  const hash = crypto.createHash("sha1").update(b64).digest("hex").slice(0, 20);
  const folder = folderFor(projectId);
  const filename = `inline_${hash}.${EXT[mime] ?? "bin"}`;
  const dir = path.join(ASSET_DIR, folder);
  const full = path.join(dir, filename);
  if (!fs.existsSync(full)) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(full, Buffer.from(b64, "base64"));
  }
  return `/api/files/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}`;
}

/** Deep-copies `value`, replacing large base64 data: URIs with local file URLs. */
export function externalizeInline<T>(value: T, projectId: string | null | undefined): T {
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") {
      if (v.length >= MIN_INLINE_BYTES && v.startsWith("data:")) {
        try {
          return writeDataUri(v, projectId) ?? v;
        } catch {
          return v;
        }
      }
      return v;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = walk(val);
      return out;
    }
    return v;
  };
  return walk(value) as T;
}

/** Same as externalizeInline but for a JSON string column. Returns null if unchanged. */
export function externalizeJsonText(text: string | null, projectId: string | null): string | null {
  if (!text || !text.includes(";base64,")) return null;
  try {
    const next = JSON.stringify(externalizeInline(JSON.parse(text), projectId));
    return next.length < text.length ? next : null;
  } catch {
    return null;
  }
}

const MIGRATION_KEY = "migration:inline-media-v1";

/** One-time cleanup of rows written before externalization existed. */
export function migrateInlineMediaOnce(): void {
  if (getSetting<boolean>(MIGRATION_KEY, false)) return;
  const db = getDb();
  const started = Date.now();
  const hasInline = db
    .prepare(
      "SELECT 1 FROM graphs WHERE instr(data, ';base64,') > 0 UNION ALL SELECT 1 FROM assets WHERE instr(meta, ';base64,') > 0 UNION ALL SELECT 1 FROM jobs WHERE instr(input, ';base64,') > 0 OR instr(output, ';base64,') > 0 LIMIT 1",
    )
    .get();
  if (!hasInline) {
    setSetting(MIGRATION_KEY, true);
    return;
  }
  // Safety net: full copy of the database before touching any row.
  const backup = path.join(DATA_DIR, `studio.backup-before-inline-${Date.now()}.db`);
  try {
    db.exec(`VACUUM INTO '${backup.replace(/'/g, "''")}'`);
    console.log(`[inline-media] backup written: ${backup}`);
  } catch (err) {
    console.warn("[inline-media] backup failed, migration skipped:", err);
    return;
  }
  let changed = 0;

  const passes = [
    { table: "graphs", key: "project_id", col: "data", projectCol: "project_id" },
    { table: "assets", key: "id", col: "meta", projectCol: "project_id" },
    { table: "jobs", key: "id", col: "input", projectCol: "project_id" },
    { table: "jobs", key: "id", col: "output", projectCol: "project_id" },
  ] as const;

  for (const { table, key, col, projectCol } of passes) {
    // Fetch ids first, then rows one by one, so we never hold 600MB in memory.
    const ids = db
      .prepare(`SELECT ${key} AS k FROM ${table} WHERE instr(${col}, ';base64,') > 0`)
      .all() as { k: string }[];
    const one = db.prepare(`SELECT ${projectCol} AS p, ${col} AS v FROM ${table} WHERE ${key} = ?`);
    const upd = db.prepare(`UPDATE ${table} SET ${col} = ? WHERE ${key} = ?`);
    for (const { k } of ids) {
      const row = one.get(k) as { p: string | null; v: string | null } | undefined;
      if (!row) continue;
      const next = externalizeJsonText(row.v, row.p ?? null);
      if (next) {
        upd.run(next, k);
        changed++;
      }
    }
  }

  setSetting(MIGRATION_KEY, true);
  if (changed > 0) {
    try {
      db.exec("PRAGMA wal_checkpoint(TRUNCATE); VACUUM;");
    } catch (err) {
      console.warn("[inline-media] VACUUM skipped:", err);
    }
  }
  console.log(`[inline-media] migrated ${changed} rows in ${Date.now() - started}ms`);
}
