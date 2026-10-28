import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Standardized color palette matching IOOAI dashboard exactly
const MODEL_COLORS: Record<string, string> = {
  "omni_flash_10s": "#00b4d8",         // Bright cyan / sky blue
  "iooai:omni_flash_10s": "#00b4d8",
  "omni 可编辑视频": "#2563eb",         // Darker blue
  "seedance2.5 快速版": "#10b981",     // Emerald green
  "seedance2.0 线路二": "#f97316",     // Vibrant orange
  "seedance 2.0 线路二": "#f97316",
  "seedance2.0 特价": "#f59e0b",       // Amber
  "seedance2.5 LW": "#a855f7",         // Purple
  "iooai:seedance25-md": "#a855f7",
  "seedance 2.0 fast": "#14b8a6",      // Teal
  "MiniMax H3": "#ec4899",             // Pink
  "MiniMax H3 1080p": "#f43f5e",       // Rose
  "gemini-compose": "#8b5cf6",         // Violet
  "seed:image:gemini-compose": "#8b5cf6",
};

const FALLBACK_PALETTE = [
  "#10b981", "#00b4d8", "#f97316", "#a855f7", "#ec4899", "#f59e0b", "#14b8a6", "#6366f1"
];

function normalizeModelName(m: string): string {
  if (!m) return "unknown";
  if (m.startsWith("iooai:")) return m.replace("iooai:", "");
  if (m.startsWith("seed:image:")) return m.replace("seed:image:", "");
  if (m.startsWith("seed:video:")) return m.replace("seed:video:", "");
  return m;
}

function getModelCost(model: string, seconds?: string | number): { rmb: number; vnd: number } {
  const m = model.toLowerCase();
  const sec = Number(seconds) || 10;
  if (m.includes("omni_flash") || m.includes("omni-flash")) return { rmb: 0.8, vnd: 2800 };
  if (m.includes("omni 可编辑")) return { rmb: 1.2, vnd: 4200 };
  if (m.includes("seedance2.5 lw")) return { rmb: 3.8, vnd: 13300 };
  if (m.includes("seedance2.5 快速") || m.includes("seedance25")) {
    return sec >= 30 ? { rmb: 2.2, vnd: 7700 } : { rmb: 1.5, vnd: 5250 };
  }
  if (m.includes("seedance2.0 特价")) return { rmb: 1.2, vnd: 4200 };
  if (m.includes("seedance2.0 线路二") || m.includes("seedance 2.0")) return { rmb: 1.5, vnd: 5250 };
  if (m.includes("minimax")) return { rmb: 1.5, vnd: 5250 };
  if (m.includes("gemini") || m.includes("gpt-image")) return { rmb: 0.35, vnd: 1225 };
  if (m.includes("kling") || m.includes("wan")) return { rmb: 0.9, vnd: 3150 };
  return { rmb: 0.5, vnd: 1750 };
}

function getModelProvider(model: string): string {
  const m = model.toLowerCase();
  if (m.includes("seedance") || m.includes("doubao")) return "ByteDance Doubao";
  if (m.includes("omni") || m.includes("veo")) return "Google Omni";
  if (m.includes("minimax") || m.includes("hailuo")) return "MiniMax Hailuo";
  if (m.includes("gemini")) return "Google Gemini";
  if (m.includes("gpt")) return "OpenAI";
  if (m.includes("kling")) return "Kuaishou Kling";
  if (m.includes("wan")) return "Alibaba Wan";
  return "AI Gateway";
}

export async function GET() {
  try {
    const db = getDb();

    // 1. Overall summary counts
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

    let totalSpentRmb = 0;
    let totalSpentVnd = 0;

    const modelBreakdown = modelsRaw.map((m) => {
      const cleanName = normalizeModelName(m.model);
      const unitCost = getModelCost(cleanName);
      const modelRmb = Number((unitCost.rmb * m.succeeded).toFixed(2));
      const modelVnd = unitCost.vnd * m.succeeded;

      totalSpentRmb += modelRmb;
      totalSpentVnd += modelVnd;

      return {
        rawModel: m.model,
        model: cleanName,
        provider: getModelProvider(cleanName),
        kind: m.kind,
        total: m.total,
        succeeded: m.succeeded,
        failed: m.failed,
        running: m.running,
        successRate: m.total > 0 ? Math.round((m.succeeded / m.total) * 100) : 0,
        unitCostRmb: unitCost.rmb,
        unitCostVnd: unitCost.vnd,
        totalSpentRmb: modelRmb,
        totalSpentVnd: modelVnd,
        lastCalledAt: m.last_called_at,
        color: MODEL_COLORS[cleanName] || MODEL_COLORS[m.model] || "#38bdf8",
      };
    });

    // 3. Hourly model breakdown matching IOOAI dashboard (Last 8 hours)
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

    const now = new Date();
    const slotsMap: Record<string, Record<string, number>> = {};
    const slotKeys: string[] = [];

    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 3600 * 1000);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const key = `${mm}-${dd} ${hh}:00`;
      slotKeys.push(key);
      slotsMap[key] = {};
    }

    const activeModelsSet = new Set<string>();

    rawHourly.forEach((row) => {
      const clean = normalizeModelName(row.model);
      activeModelsSet.add(clean);
      if (!slotsMap[row.hour_slot]) {
        slotsMap[row.hour_slot] = {};
      }
      slotsMap[row.hour_slot][clean] = (slotsMap[row.hour_slot][clean] || 0) + row.cnt;
    });

    const activeModelsList = Array.from(activeModelsSet);
    if (!activeModelsList.includes("omni_flash_10s")) activeModelsList.push("omni_flash_10s");
    if (!activeModelsList.includes("seedance2.5 快速版")) activeModelsList.push("seedance2.5 快速版");
    if (!activeModelsList.includes("seedance2.0 线路二")) activeModelsList.push("seedance2.0 线路二");

    const modelColors: Record<string, string> = {};
    activeModelsList.forEach((m, idx) => {
      modelColors[m] = MODEL_COLORS[m] || FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];
    });

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

    // 4. Detailed Task Usage Logs (equivalent to https://console.iooai.cn/usage-logs/task)
    const rawJobs = db
      .prepare(`
        SELECT 
          j.id, 
          j.project_id, 
          p.name as project_name,
          j.node_id, 
          j.kind, 
          j.model, 
          j.status, 
          j.input, 
          j.output, 
          j.error, 
          j.provider_job, 
          j.created_at, 
          j.updated_at
        FROM jobs j
        LEFT JOIN projects p ON j.project_id = p.id
        ORDER BY j.created_at DESC
        LIMIT 100
      `)
      .all() as Array<{
      id: string;
      project_id: string | null;
      project_name: string | null;
      node_id: string | null;
      kind: string;
      model: string;
      status: string;
      input: string | null;
      output: string | null;
      error: string | null;
      provider_job: string | null;
      created_at: number;
      updated_at: number;
    }>;

    let totalDurationSec = 0;
    let validDurationCount = 0;

    const taskLogs = rawJobs.map((j) => {
      let prompt = "";
      let seconds = "";
      let resolution = "";
      let aspect = "";
      let inputImages: string[] = [];

      if (j.input) {
        try {
          const parsed = JSON.parse(j.input);
          if (typeof parsed === "object" && parsed !== null) {
            prompt = String(parsed.prompt || parsed.text || "");
            seconds = String(parsed.seconds || parsed.duration || "");
            resolution = String(parsed.resolution || "");
            aspect = String(parsed.aspect || parsed.ratio || "");
            if (Array.isArray(parsed.images)) inputImages = parsed.images;
            else if (typeof parsed.image === "string") inputImages = [parsed.image];
          } else {
            prompt = String(parsed);
          }
        } catch {
          prompt = String(j.input);
        }
      }

      const elapsedSec = Math.max(1, Math.round(((j.updated_at || j.created_at) - j.created_at) / 1000));
      if (j.status === "succeeded" && elapsedSec > 0 && elapsedSec < 600) {
        totalDurationSec += elapsedSec;
        validDurationCount += 1;
      }

      const cleanModel = normalizeModelName(j.model);
      const isFailed = ["failed", "error", "cancelled"].includes(j.status);
      const cost = isFailed ? { rmb: 0, vnd: 0 } : getModelCost(cleanModel, seconds);

      return {
        id: j.id,
        taskId: j.provider_job || j.id,
        projectId: j.project_id,
        projectName: j.project_name || "Dự án HINTON",
        nodeId: j.node_id,
        kind: j.kind,
        rawModel: j.model,
        model: cleanModel,
        provider: getModelProvider(cleanModel),
        status: j.status,
        prompt: prompt.slice(0, 500),
        fullPrompt: prompt,
        seconds: seconds || (j.kind === "video" ? "10s" : ""),
        resolution: resolution || (j.kind === "video" ? "720p" : "HD"),
        aspect: aspect || "16:9",
        inputImages,
        outputUrl: j.output || null,
        error: j.error || null,
        costRmb: cost.rmb,
        costVnd: cost.vnd,
        elapsedSec,
        createdAt: j.created_at,
        updatedAt: j.updated_at,
      };
    });

    const avgLatencySec = validDurationCount > 0 ? Math.round(totalDurationSec / validDurationCount) : 38;

    return NextResponse.json({
      ok: true,
      stats: {
        totalCalls: total,
        successCalls: succeeded,
        failedCalls: failed,
        runningCalls: running,
        successRate,
        totalSpentRmb: Number(totalSpentRmb.toFixed(2)),
        totalSpentVnd,
        avgLatencySec,
        modelBreakdown,
        activeModels: activeModelsList,
        modelColors,
        hourlySeries,
        taskLogs,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
