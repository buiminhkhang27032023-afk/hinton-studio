import { getDb, now, uid } from "./db";
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
  return JSON.parse(row.data) as GraphPayload;
}

export function saveGraph(projectId: string, graph: GraphPayload): void {
  getDb()
    .prepare(
      `INSERT INTO graphs(project_id, data, updated_at) VALUES(?, ?, ?)
       ON CONFLICT(project_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    )
    .run(projectId, JSON.stringify(graph), now());
  getDb().prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(now(), projectId);
}

export function setThumbnail(projectId: string, url: string): void {
  getDb().prepare("UPDATE projects SET thumbnail = ?, updated_at = ? WHERE id = ?").run(url, now(), projectId);
}
