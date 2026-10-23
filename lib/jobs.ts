import { getDb, now, uid } from "./db";
import type { Asset, JobRecord, ModelKind } from "./types";

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
      JSON.stringify(job.input),
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
    values.push(JSON.stringify(patch.output));
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
    input: JSON.parse(String(row.input)),
    output: row.output ? (JSON.parse(String(row.output)) as Asset) : null,
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
