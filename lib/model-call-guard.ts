import { NextResponse } from "next/server";
import { getDb, getSetting } from "./db";

export const MODEL_CALLS_PAUSED_MESSAGE =
  "Đã khóa gọi model theo yêu cầu của bạn để tránh phát sinh chi phí. Chưa gửi yêu cầu tới nhà cung cấp.";

export function modelCallsPaused(): boolean {
  return getSetting<boolean>("model_calls_paused", false) === true;
}

export function pausedModelResponse(): NextResponse | null {
  return modelCallsPaused()
    ? NextResponse.json({ error: MODEL_CALLS_PAUSED_MESSAGE }, { status: 423 })
    : null;
}

/** A local, expiring, single-use approval never unlocks the whole application. */
export function consumeModelApproval(token: string | null, scope: { modelId: string; projectId: string | null; nodeId: string | null }): boolean {
  if (!token) return false;
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = 'generation_approval'").get() as { value: string } | undefined;
  if (!row) return false;
  const approval = JSON.parse(row.value) as { token: string; remaining: number; expiresAt: number; modelId: string; projectId: string | null; nodeId: string | null };
  if (approval.token !== token || approval.remaining !== 1 || approval.expiresAt < Date.now() ||
      approval.modelId !== scope.modelId || approval.projectId !== scope.projectId || approval.nodeId !== scope.nodeId) return false;
  const result = db.prepare("UPDATE settings SET value = ? WHERE key = 'generation_approval' AND value = ?")
    .run(JSON.stringify({ ...approval, remaining: 0 }), row.value);
  return Number(result.changes) === 1;
}
