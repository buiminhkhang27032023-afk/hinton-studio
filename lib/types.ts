export type ModelKind = "chat" | "image" | "video" | "upscale" | "train";

export type AssetKind = "image" | "video" | "audio" | "file";

export interface Asset {
  id: string;
  projectId: string | null;
  name: string;
  kind: AssetKind;
  mime: string;
  url: string;
  width?: number;
  height?: number;
  duration?: number;
  size?: number;
  meta?: Record<string, unknown>;
  createdAt: number;
}

/**
 * A model entry is fully declarative: the endpoint path, the request body
 * template and the response mapping are all editable from the UI. That lets the
 * same app talk to any OpenAI-compatible gateway without a code change.
 */
export interface ModelConfig {
  /** Path appended to the provider base URL, e.g. "/images/generations". */
  endpoint: string;
  /** HTTP method. Defaults to POST. */
  method?: "POST" | "GET";
  /**
   * Request body template. Placeholders are substituted before sending:
   * {{prompt}}, {{image}}, {{images}}, {{duration}}, {{aspect}}, {{size}},
   * {{seed}}, {{model}}, {{input}} (raw JSON of the node input).
   */
  body?: Record<string, unknown>;
  /** Dot path to the generated asset URL (or base64 payload) in the response. */
  resultPath?: string;
  /**
   * When the asset is not in the JSON but behind its own endpoint, use this.
   * {{job}} is replaced with the provider job id.
   */
  contentEndpoint?: string;
  /** Dot path to a provider job id, when generation is asynchronous. */
  jobPath?: string;
  /** Path used to poll an async job. {{job}} is replaced with the job id. */
  pollEndpoint?: string;
  /** Dot path that holds the job status. */
  statusPath?: string;
  /** Values of the status field that mean "done". */
  doneValues?: string[];
  /** Values of the status field that mean "failed". */
  failedValues?: string[];
  /** Extra headers sent with the request. */
  headers?: Record<string, string>;
  /** Seconds to wait before giving up on a sync request. */
  timeout?: number;
}

export interface ModelRecord {
  id: string;
  label: string;
  kind: ModelKind;
  provider: string;
  description?: string;
  config: ModelConfig;
  builtin: boolean;
  createdAt: number;
}

export interface ProviderSettings {
  baseUrl: string;
  apiKey: string;
  defaultChatModel?: string;
  /** Allow browser to fetch remote assets directly (CORS dependent). */
  proxyAssets: boolean;
  /** How the API key is sent. Defaults to "bearer" (Authorization: Bearer ...). */
  authHeader?: "bearer" | "x-api-key";
}

export interface JobRecord {
  id: string;
  projectId: string | null;
  nodeId: string | null;
  kind: ModelKind;
  model: string;
  status: "queued" | "running" | "succeeded" | "failed";
  input: Record<string, unknown>;
  output?: Asset | null;
  error?: string | null;
  providerJob?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  thumbnail: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface GraphPayload {
  nodes: unknown[];
  edges: unknown[];
  viewport?: { x: number; y: number; zoom: number };
}
