import { NextResponse } from "next/server";
import { getProvider } from "@/lib/provider";
import { getDb } from "@/lib/db";
import { recoverJob } from "@/lib/recover-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Read-only look-up of IOOAI video tasks, so a job that outlived the app's
 * poll timeout can still be recovered. GET ?id=task_xxx  or  GET (list recent).
 */
export async function GET(request: Request) {
  const provider = getProvider("iooai");
  if (!provider.apiKey) return NextResponse.json({ error: "Chưa có API key IOOAI" }, { status: 400 });
  const id = new URL(request.url).searchParams.get("id");
  if (id && !/^[\w-]+$/.test(id)) return NextResponse.json({ error: "id không hợp lệ" }, { status: 400 });
  // IOOAI does not support listing /v1/videos (405). List local IDs instead;
  // fetching this page must not generate any remote traffic.
  if (!id) {
    const tasks = getDb().prepare("SELECT id AS jobId, provider_job AS id, model, status, error, project_id AS projectId FROM jobs WHERE provider_job IS NOT NULL AND (model LIKE 'iooai:%' OR model = 'seedance2.0 线路二') ORDER BY created_at DESC LIMIT 100").all();
    return NextResponse.json({ source: "local", tasks });
  }
  const base = provider.baseUrl.replace(/\/+$/, "");
  const url = `${base}/videos/${id}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${provider.apiKey}`, Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  try {
    return NextResponse.json(JSON.parse(text), { status: res.status });
  } catch {
    return new NextResponse(text.slice(0, 2000), { status: res.status });
  }
}

/**
 * Recover a finished IOOAI video task into a project:
 * POST { id: "task_xxx", projectId, nodeId?, name? }  →  saved asset, attached to the node.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    id?: string; projectId?: string; nodeId?: string; name?: string;
  };
  if (!body.id || !/^[\w-]+$/.test(body.id) || !body.projectId) {
    return NextResponse.json({ error: "Thiếu id hoặc projectId" }, { status: 400 });
  }
  const row = getDb().prepare("SELECT id FROM jobs WHERE project_id = ? AND provider_job = ? ORDER BY created_at DESC LIMIT 1")
    .get(body.projectId, body.id) as { id: string } | undefined;
  if (!row) return NextResponse.json({ error: "Mã tác vụ chưa được gắn vào lịch sử dự án. Không tạo hoặc nhập lại tự động." }, { status: 404 });
  try {
    return NextResponse.json(await recoverJob(row.id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không lấy được video cũ." }, { status: 502 });
  }
}
