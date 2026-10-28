import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export const DATA_DIR = path.join(process.cwd(), "data");
export const ASSET_DIR = path.join(DATA_DIR, "assets");

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  fs.mkdirSync(ASSET_DIR, { recursive: true });
  db = new DatabaseSync(path.join(DATA_DIR, "studio.db"));
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA cache_size = -64000;
    PRAGMA temp_store = MEMORY;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      thumbnail TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS graphs (
      project_id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      mime TEXT NOT NULL,
      url TEXT NOT NULL,
      meta TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      kind TEXT NOT NULL,
      provider TEXT NOT NULL,
      description TEXT,
      config TEXT NOT NULL,
      builtin INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      node_id TEXT,
      kind TEXT NOT NULL,
      model TEXT NOT NULL,
      status TEXT NOT NULL,
      input TEXT NOT NULL,
      output TEXT,
      error TEXT,
      provider_job TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Persistent knowledge: what a character, a look or a style actually is,
    -- learned by having a vision model read the user's reference images.
    CREATE TABLE IF NOT EXISTS memory (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      source_url TEXT,
      tags TEXT,
      uses INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- A reusable "look": character + wardrobe + location + style, shared by
    -- every scene so batches stay visually consistent.
    CREATE TABLE IF NOT EXISTS presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      character_id TEXT,
      wardrobe TEXT,
      location TEXT,
      style_id TEXT,
      prompt_suffix TEXT,
      ref_url TEXT,
      seed INTEGER,
      created_at INTEGER NOT NULL
    );

    -- Analyses of finished clips: what worked, what drifted, what to fix.
    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      asset_id TEXT,
      kind TEXT NOT NULL,
      summary TEXT NOT NULL,
      payload TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_project ON jobs(project_id);
    CREATE INDEX IF NOT EXISTS idx_memory_kind ON memory(kind);
    CREATE INDEX IF NOT EXISTS idx_analyses_project ON analyses(project_id);
  `);
  return db;
}

export function now(): number {
  return Date.now();
}

export function uid(prefix = ""): string {
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return prefix ? `${prefix}_${rand}` : rand;
}

export function getSetting<T>(key: string, fallback: T): T {
  const row = getDb()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export function setSetting(key: string, value: unknown): void {
  getDb()
    .prepare(
      "INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .run(key, JSON.stringify(value));
}
