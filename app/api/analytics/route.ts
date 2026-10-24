import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const modelBreakdown = modelsRaw.map((m) => ({
      model: m.model,
      kind: m.kind,
      total: m.total,
      succeeded: m.succeeded,
      failed: m.failed,
      running: m.running,
      successRate: m.total > 0 ? Math.round((m.succeeded / m.total) * 100) : 0,
      lastCalledAt: m.last_called_at,
    }));

    // 3. Recent job activities
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

    // 4. Time series for sine wave plotting
    const timeSlots = db
      .prepare(`
        SELECT 
          strftime('%Y-%m-%d %H:00', datetime(created_at / 1000, 'unixepoch')) as hour_slot,
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('succeeded', 'done', 'completed') THEN 1 ELSE 0 END) as succeeded,
          SUM(CASE WHEN status IN ('failed', 'error', 'cancelled') THEN 1 ELSE 0 END) as failed
        FROM jobs
        GROUP BY hour_slot
        ORDER BY hour_slot DESC
        LIMIT 24
      `)
      .all();

    return NextResponse.json({
      ok: true,
      stats: {
        totalCalls: total,
        successCalls: succeeded,
        failedCalls: failed,
        runningCalls: running,
        successRate,
        modelBreakdown,
        recentJobs,
        timeSlots,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
