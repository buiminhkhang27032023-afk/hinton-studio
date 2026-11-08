function safeParseJson<T>(val: unknown): T | null {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;
  try {
    return JSON.parse(str) as T;
  } catch {
    if (str.startsWith('/') || str.startsWith('http')) {
      return { id: 'output_url', url: str, kind: str.endsWith('.mp4') ? 'video' : 'image' } as unknown as T;
    }
    return null;
  }
}

import { getDb, now, uid } from "./db";
import { externalizeInline } from "./inline-media";
import type { Asset, JobRecord, ModelKind } from "./types";

export interface JobRecovery {
  providerId?: string;
  baseUrl?: string;
  phase: "preparing" | "submitting" | "accepted" | "downloading" | "finished";
  source?: string;
  mime?: string;
  name?: string;
  referenceUrls?: string[];
}

export function getJobRecovery(id: string): JobRecovery | null {
  const row = getDb().prepare("SELECT recovery FROM jobs WHERE id = ?").get(id) as { recovery: string | null } | undefined;
  return row?.recovery ? JSON.parse(row.recovery) as JobRecovery : null;
}

export function setJobRecovery(id: string, recovery: JobRecovery): void {
  getDb().prepare("UPDATE jobs SET recovery = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(recovery), now(), id);
}

/** Atomically refuse a second creation while the first task is unresolved. */
export function claimJob(input: Parameters<typeof createJob>[0], requestKey: string, explicitlyApprovedReplacement = false): { job: JobRecord; existing: boolean } {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const previous = db.prepare(`SELECT id FROM jobs WHERE request_key = ? OR
      (${!explicitlyApprovedReplacement && input.projectId && input.nodeId ? "1" : "0"} AND project_id IS ? AND node_id IS ? AND (status IN ('queued', 'running', 'pending') OR
      (status = 'failed' AND error LIKE '%Quá thời gian chờ%')))
      ORDER BY created_at DESC LIMIT 1`).get(requestKey, input.projectId, input.nodeId) as { id: string } | undefined;
    if (previous) {
      const job = getJob(previous.id)!;
      if (job.error || (input.model && job.model !== input.model)) {
        db.prepare("UPDATE jobs SET status = 'failed' WHERE id = ?").run(job.id);
      } else {
        db.exec("COMMIT");
        return { job, existing: true };
      }
    }
    const job = createJob(input);
    db.prepare("UPDATE jobs SET request_key = ? WHERE id = ?").run(requestKey, job.id);
    db.exec("COMMIT");
    return { job, existing: false };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function createJob(input: {
  projectId: string | null;
  nodeId: string | null;
  kind: ModelKind;
  model: string;
  input: Record<string, unknown>;
}): JobRecord {
  const job: JobRecord = {
    id: uid("job"),
    projectId: input.projectId,
    nodeId: input.nodeId,
    kind: input.kind,
    model: input.model,
    status: "queued",
    input: input.input,
    output: null,
    error: null,
    providerJob: null,
    createdAt: now(),
    updatedAt: now(),
  };
  getDb()
    .prepare(
      `INSERT INTO jobs(id, project_id, node_id, kind, model, status, input, output, error, provider_job, created_at, updated_at)
       VALUES(?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?)`,
    )
    .run(
      job.id,
      job.projectId,
      job.nodeId,
      job.kind,
      job.model,
      job.status,
      JSON.stringify(externalizeInline(job.input, job.projectId)),
      job.createdAt,
      job.updatedAt,
    );
  return job;
}

export function updateJob(
  id: string,
  patch: Partial<Pick<JobRecord, "status" | "output" | "error" | "providerJob">>,
): void {
  const db = getDb();
  const sets: string[] = ["updated_at = ?"];
  const values: unknown[] = [now()];
  if (patch.status !== undefined) {
    sets.push("status = ?");
    values.push(patch.status);
  }
  if (patch.output !== undefined) {
    sets.push("output = ?");
    values.push(JSON.stringify(externalizeInline(patch.output, null)));
  }
  if (patch.error !== undefined) {
    sets.push("error = ?");
    values.push(patch.error);
  }
  if (patch.providerJob !== undefined) {
    sets.push("provider_job = ?");
    values.push(patch.providerJob);
  }
  values.push(id);
  db.prepare(`UPDATE jobs SET ${sets.join(", ")} WHERE id = ?`).run(...(values as never[]));
}

export function getJob(id: string): JobRecord | null {
  const row = getDb().prepare("SELECT * FROM jobs WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    projectId: (row.project_id as string | null) ?? null,
    nodeId: (row.node_id as string | null) ?? null,
    kind: row.kind as ModelKind,
    model: String(row.model),
    status: row.status as JobRecord["status"],
    input: safeParseJson<Record<string, unknown>>(row.input) ?? {},
    output: safeParseJson<Asset>(row.output),
    error: row.error ? String(row.error) : null,
    providerJob: row.provider_job ? String(row.provider_job) : null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function listJobs(projectId?: string, limit = 40): JobRecord[] {
  const rows = projectId
    ? getDb()
        .prepare("SELECT id FROM jobs WHERE project_id = ? ORDER BY created_at DESC LIMIT ?")
        .all(projectId, limit)
    : getDb().prepare("SELECT id FROM jobs ORDER BY created_at DESC LIMIT ?").all(limit);
  return (rows as { id: string }[])
    .map((row) => getJob(row.id))
    .filter((job): job is JobRecord => job !== null);
}
