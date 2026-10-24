import type { Asset, GraphPayload, JobRecord, ModelRecord, ProjectSummary } from "./types";
import { withBasePath } from "./base-path";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(withBasePath(url), {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(json?.error ?? `Lỗi ${res.status}`);
  return json as T;
}

export interface MemoryEntry {
  id: string;
  projectId: string | null;
  kind: "character" | "style" | "wardrobe" | "location" | "trend";
  name: string;
  description: string;
  sourceUrl: string | null;
  tags: string[];
  uses: number;
  createdAt: number;
  updatedAt: number;
}

export interface LookPreset {
  id: string;
  name: string;
  characterId: string | null;
  wardrobe: string;
  location: string;
  styleId: string;
  promptSuffix: string;
  refUrl: string | null;
  seed: number | null;
  createdAt: number;
}

export interface VideoAnalysis {
  summary: string;
  strengths: string[];
  issues: string[];
  continuity: string;
  promptSuggestions: string[];
}

export const api = {
  projects: {
    list: () => request<ProjectSummary[]>("/api/projects"),
    create: (name: string) =>
      request<ProjectSummary>("/api/projects", { method: "POST", body: JSON.stringify({ name }) }),
    rename: (id: string, name: string) =>
      request<{ ok: true }>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
    remove: (id: string) => request<{ ok: true }>(`/api/projects/${id}`, { method: "DELETE" }),
    graph: (id: string) => request<GraphPayload>(`/api/projects/${id}/graph`),
    saveGraph: (id: string, graph: GraphPayload) =>
      request<{ ok: true }>(`/api/projects/${id}/graph`, { method: "PUT", body: JSON.stringify(graph) }),
  },
  models: {
    list: (kind?: string) => request<ModelRecord[]>(`/api/models${kind ? `?kind=${kind}` : ""}`),
    save: (payload: Partial<ModelRecord> & { label: string; kind: string; config: unknown }) =>
      request<ModelRecord>("/api/models", { method: "POST", body: JSON.stringify(payload) }),
    remove: (id: string) => request<{ ok: true }>(`/api/models?id=${id}`, { method: "DELETE" }),
    discover: () => request<{ models: unknown[] }>("/api/models/discover"),
    sync: (payload: { onlyNew?: boolean; ids?: string[]; kind?: string; raw?: unknown[] }) =>
      request<{ created: number; updated: number; total: number; skipped: number; models: ModelRecord[] }>(
        "/api/models/sync",
        { method: "POST", body: JSON.stringify(payload) },
      ),
  },
  run: (payload: {
    modelId: string;
    kind: string;
    projectId?: string | null;
    nodeId?: string | null;
    vars: Record<string, unknown>;
    name?: string;
  }) => request<{ jobId: string; output?: Asset; error?: string }>("/api/run", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  assets: {
    list: (projectId?: string) =>
      request<Asset[]>(`/api/assets${projectId ? `?projectId=${projectId}` : ""}`),
    remove: (id: string) => request<{ ok: true }>(`/api/assets/${id}`, { method: "DELETE" }),
    upload: async (file: File, projectId?: string | null) => {
      const form = new FormData();
      form.append("file", file);
      if (projectId) form.append("projectId", projectId);
      return request<Asset>("/api/upload", { method: "POST", body: form });
    },
  },
  settings: {
    get: () =>
      request<{
        baseUrl: string;
        apiKey: string;
        hasKey: boolean;
        proxyAssets: boolean;
        language: string;
        iooai: { baseUrl: string; apiKey: string; hasKey: boolean };
        piapi: { baseUrl: string; apiKey: string; hasKey: boolean };
        runninghub: { baseUrl: string; apiKey: string; hasKey: boolean };
      }>("/api/settings"),
    save: (payload: Record<string, unknown>) =>
      request<{ ok: true }>("/api/settings", { method: "PUT", body: JSON.stringify(payload) }),
  },
  jobs: {
    list: (projectId?: string) =>
      request<JobRecord[]>(`/api/run${projectId ? `?projectId=${projectId}` : ""}`),
  },
  memory: {
    list: (kind?: string) => request<MemoryEntry[]>(`/api/memory${kind ? `?kind=${kind}` : ""}`),
    save: (payload: Partial<MemoryEntry> & { kind: string; name: string; description: string }) =>
      request<MemoryEntry>("/api/memory", { method: "POST", body: JSON.stringify(payload) }),
    remove: (id: string) => request<{ ok: true }>(`/api/memory/${id}`, { method: "DELETE" }),
    analyze: (payload: { assetUrl?: string; assetId?: string; kind?: string; name?: string; projectId?: string | null }) =>
      request<MemoryEntry>("/api/memory/analyze", { method: "POST", body: JSON.stringify(payload) }),
  },
  presets: {
    list: () => request<LookPreset[]>("/api/presets"),
    save: (payload: Partial<LookPreset> & { name: string }) =>
      request<LookPreset>("/api/presets", { method: "POST", body: JSON.stringify(payload) }),
    remove: (id: string) => request<{ ok: true }>(`/api/presets/${id}`, { method: "DELETE" }),
  },
  script: (payload: {
    idea: string;
    totalSeconds: number;
    modelId?: string;
    presetId?: string;
    characterId?: string;
    styleText?: string;
    wardrobe?: string;
    location?: string;
  }) =>
    request<{
      scenes: Array<{ title: string; prompt: string; seconds: number }>;
      plan: number[];
      totalSeconds: number;
      requestedSeconds: number;
      allowedDurations: number[];
    }>("/api/script", { method: "POST", body: JSON.stringify(payload) }),
  seecut: {
    start: (formData: FormData) =>
      request<{ id: string }>("/api/seecut", { method: "POST", body: formData }),
    status: (jobId: string) =>
      request<{
        id: string;
        status: "queued" | "running" | "done" | "error";
        log: string;
        elapsed: number;
        error?: string | null;
        inputUrl?: string;
        resultUrl?: string;
        asset?: Asset | null;
        plan?: Record<string, unknown>;
      }>(`/api/seecut/${jobId}`),
  },
  analyze: {
    video: (payload: { assetId: string; projectId?: string | null; remember?: boolean }) =>
      request<{ analysis: { id: string; summary: string }; result: VideoAnalysis }>("/api/analyze", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    list: (projectId?: string) =>
      request<Array<{ id: string; summary: string; payload: Record<string, unknown>; createdAt: number }>>(
        `/api/analyze${projectId ? `?projectId=${projectId}` : ""}`,
      ),
  },
  promptMaster: {
    enhance: (payload: {
      prompt: string;
      kind?: "image" | "video";
      style?: string;
      preferredLang?: "en" | "vi";
    }) =>
      request<{
        ok: boolean;
        originalPrompt: string;
        enhancedPrompt: string;
        enhancedPromptVi: string;
        highlights: string[];
        model: string;
      }>("/api/prompt-master", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
};
