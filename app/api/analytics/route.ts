import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Standardized color palette matching IOOAI dashboard exactly
const MODEL_COLORS: Record<string, string> = {
  "omni_flash_10s": "#00b4d8",         // Bright cyan / sky blue
  "iooai:omni_flash_10s": "#00b4d8",
  "omni 可编辑视频": "#2563eb",         // Darker blue
  "seedance2.0 线路二": "#f97316",     // Vibrant orange
  "seedance 2.0 线路二": "#f97316",
  "seedance2.5 LW": "#a855f7",         // Purple
  "iooai:seedance25-md": "#a855f7",
  "seedance 2.0 fast": "#10b981",      // Emerald
  "gemini-compose": "#ec4899",         // Pink
  "seed:image:gemini-compose": "#ec4899",
};

const FALLBACK_PALETTE = [
  "#f97316", "#00b4d8", "#2563eb", "#a855f7", "#10b981", "#ec4899", "#eab308", "#14b8a6"
];

function normalizeModelName(m: string): string {
  if (!m) return "unknown";
  if (m.startsWith("iooai:")) return m.replace("iooai:", "");
  if (m.startsWith("seed:image:")) return m.replace("seed:image:", "");
  if (m.startsWith("seed:video:")) return m.replace("seed:video:", "");
  return m;
}

export async function GET() {
  try {
    const db = getDb();

    // 1. Overall summary
    const totalRow = db.prepare("SELECT COUNT(*) as total FROM jobs").get() as { total: number };
    const successRow = db.prepare(
      "SELECT COUNT(*) as cnt FROM jobs WHERE status IN ('succeeded', 'done', 'completed')",
    ).get() as { cnt: number };
    const failedRow = db.prepare(
      "SELECT COUNT(*) as cnt FROM jobs WHERE status IN ('failed', 'error', 'cancelled')",
    ).get() as { cnt: number };
    const runningRow = db.prepare(
      "SELECT COUNT(*) as cnt FROM jobs WHERE status IN ('running', 'queued', 'pending')",
    ).get() as { cnt: number };

    const total = totalRow?.total || 0;
    const succeeded = successRow?.cnt || 0;
    const failed = failedRow?.cnt || 0;
    const running = runningRow?.cnt || 0;
    const successRate = total > 0 ? Math.round((succeeded / total) * 100) : 0;

    // 2. Model breakdown
    const modelsRaw = db
      .prepare(`
        SELECT 
          model,
          kind,
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('succeeded', 'done', 'completed') THEN 1 ELSE 0 END) as succeeded,
          SUM(CASE WHEN status IN ('failed', 'error', 'cancelled') THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status IN ('running', 'queued', 'pending') THEN 1 ELSE 0 END) as running,
          MAX(created_at) as last_called_at
        FROM jobs
        GROUP BY model
        ORDER BY total DESC
      `)
      .all() as Array<{
      model: string;
      kind: string;
      total: number;
      succeeded: number;
      failed: number;
      running: number;
      last_called_at: number;
    }>;

    const modelBreakdown = modelsRaw.map((m) => {
      const cleanName = normalizeModelName(m.model);
      return {
        rawModel: m.model,
        model: cleanName,
        kind: m.kind,
        total: m.total,
        succeeded: m.succeeded,
        failed: m.failed,
        running: m.running,
        successRate: m.total > 0 ? Math.round((m.succeeded / m.total) * 100) : 0,
        lastCalledAt: m.last_called_at,
        color: MODEL_COLORS[cleanName] || MODEL_COLORS[m.model] || "#38bdf8",
      };
    });

    // 3. Hourly model breakdown matching IOOAI dashboard (Last 7-10 hours)
    // Generate chronological hourly slots from 10-24 18:00 to current hour
    const rawHourly = db
      .prepare(`
        SELECT 
          strftime('%m-%d %H:00', datetime(created_at / 1000, 'unixepoch', 'localtime')) as hour_slot,
          model,
          COUNT(*) as cnt
        FROM jobs
        GROUP BY hour_slot, model
        ORDER BY hour_slot ASC
      `)
      .all() as Array<{ hour_slot: string; model: string; cnt: number }>;

    // Build list of continuous 7 slots ending at current hour
    const now = new Date();
    const slotsMap: Record<string, Record<string, number>> = {};
    const slotKeys: string[] = [];

    // Ensure we cover standard 7-8 hours like in the screenshot (e.g. 18:00, 19:00, 20:00, 21:00, 22:00, 23:00, 00:00)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 3600 * 1000);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const key = `${mm}-${dd} ${hh}:00`;
      slotKeys.push(key);
      slotsMap[key] = {};
    }

    // Identify active models from recent hours
    const activeModelsSet = new Set<string>();

    rawHourly.forEach((row) => {
      const clean = normalizeModelName(row.model);
      activeModelsSet.add(clean);
      if (!slotsMap[row.hour_slot]) {
        // If not already in the 7-hour window, only include if close
        slotsMap[row.hour_slot] = {};
      }
      slotsMap[row.hour_slot][clean] = (slotsMap[row.hour_slot][clean] || 0) + row.cnt;
    });

    // Always ensure key models from IOOAI are represented in legend if present
    const activeModelsList = Array.from(activeModelsSet);
    if (!activeModelsList.includes("omni_flash_10s")) activeModelsList.push("omni_flash_10s");
    if (!activeModelsList.includes("seedance2.0 线路二")) activeModelsList.push("seedance2.0 线路二");
    if (!activeModelsList.includes("omni 可编辑视频")) activeModelsList.push("omni 可编辑视频");

    // Assign consistent color per model
    const modelColors: Record<string, string> = {};
    activeModelsList.forEach((m, idx) => {
      modelColors[m] = MODEL_COLORS[m] || FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];
    });

    // Compile time series array
    const hourlySeries = slotKeys.map((slotKey) => {
      const modelCounts = slotsMap[slotKey] || {};
      let slotTotal = 0;
      const byModel: Record<string, number> = {};

      activeModelsList.forEach((m) => {
        const val = modelCounts[m] || 0;
        byModel[m] = val;
        slotTotal += val;
      });

      return {
        slot: slotKey,
        total: slotTotal,
        byModel,
      };
    });

    // 4. Recent job activities
    const recentJobs = db
      .prepare(`
        SELECT id, project_id, node_id, kind, model, status, error, created_at, updated_at
        FROM jobs
        ORDER BY created_at DESC
        LIMIT 20
      `)
      .all() as Array<{
      id: string;
      project_id: string | null;
      node_id: string | null;
      kind: string;
      model: string;
      status: string;
      error: string | null;
      created_at: number;
      updated_at: number;
    }>;

    return NextResponse.json({
      ok: true,
      stats: {
        totalCalls: total,
        successCalls: succeeded,
        failedCalls: failed,
        runningCalls: running,
        successRate,
        modelBreakdown,
        activeModels: activeModelsList,
        modelColors,
        hourlySeries,
        recentJobs,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
