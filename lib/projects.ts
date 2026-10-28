import { getDb, now, uid } from "./db";
import { externalizeInline } from "./inline-media";
import type { GraphPayload, ProjectSummary } from "./types";

export function listProjects(): ProjectSummary[] {
  const rows = getDb()
    .prepare("SELECT * FROM projects ORDER BY updated_at DESC")
    .all() as Record<string, unknown>[];
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    thumbnail: (row.thumbnail as string | null) ?? null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }));
}

export function getProject(id: string): ProjectSummary | null {
  const row = getDb().prepare("SELECT * FROM projects WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    name: String(row.name),
    thumbnail: (row.thumbnail as string | null) ?? null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function createProject(name: string): ProjectSummary {
  const project: ProjectSummary = {
    id: uid("prj"),
    name: name.trim() || "Dự án mới",
    thumbnail: null,
    createdAt: now(),
    updatedAt: now(),
  };
  getDb()
    .prepare("INSERT INTO projects(id, name, thumbnail, created_at, updated_at) VALUES(?, ?, NULL, ?, ?)")
    .run(project.id, project.name, project.createdAt, project.updatedAt);
  return project;
}

export function renameProject(id: string, name: string): void {
  getDb().prepare("UPDATE projects SET name = ?, updated_at = ? WHERE id = ?").run(name.trim(), now(), id);
}

export function deleteProject(id: string): void {
  getDb().prepare("DELETE FROM projects WHERE id = ?").run(id);
}

export function getGraph(projectId: string): GraphPayload {
  const row = getDb().prepare("SELECT data FROM graphs WHERE project_id = ?").get(projectId) as
    | { data: string }
    | undefined;
  if (!row) return { nodes: [], edges: [] };
  const graph = JSON.parse(row.data) as GraphPayload;

  try {
    const jobs = getDb()
      .prepare(
        "SELECT node_id, status, output FROM jobs WHERE project_id = ? AND status = 'succeeded' ORDER BY updated_at ASC",
      )
      .all(projectId) as { node_id: string; status: string; output: string }[];
    if (jobs && jobs.length > 0) {
      const jobMap = new Map<string, any>();
      for (const j of jobs) {
        if (j.node_id && j.output) {
          try {
            jobMap.set(j.node_id, JSON.parse(j.output));
          } catch {}
        }
      }
      for (const n of graph.nodes as any[]) {
        const nodeData = n.data as any;
        if ((!nodeData?.result || nodeData?.status === "running") && jobMap.has(n.id)) {
          const out = jobMap.get(n.id);
          n.data = {
            ...nodeData,
            status: "done",
            result: out,
            videoUrl: out?.kind === "video" ? out.url : nodeData?.videoUrl,
            imageUrl: out?.kind === "image" ? out.url : nodeData?.imageUrl,
          };
        }
      }
    }
  } catch {}

  return graph;
}

export function saveGraph(projectId: string, graph: GraphPayload): void {
  getDb()
    .prepare(
      `INSERT INTO graphs(project_id, data, updated_at) VALUES(?, ?, ?)
       ON CONFLICT(project_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    )
    .run(projectId, JSON.stringify(externalizeInline(graph, projectId)), now());
  getDb().prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(now(), projectId);
}

export function setThumbnail(projectId: string, url: string): void {
  getDb().prepare("UPDATE projects SET thumbnail = ?, updated_at = ? WHERE id = ?").run(url, now(), projectId);
}
