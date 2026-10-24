import { getSetting } from "./db";
import type { ModelConfig, ModelKind, ProviderSettings } from "./types";

export const DEFAULT_PROVIDER: ProviderSettings = {
  baseUrl: "https://api.buihuuthang.com/v1",
  apiKey: "",
  proxyAssets: true,
  authHeader: "bearer",
};

export const PIAPI_PROVIDER: ProviderSettings = {
  baseUrl: "https://api.piapi.ai/api/v1",
  apiKey: "",
  proxyAssets: true,
  authHeader: "x-api-key",
};

export const RUNNINGHUB_PROVIDER: ProviderSettings = {
  baseUrl: "https://www.runninghub.ai",
  apiKey: "",
  proxyAssets: true,
  authHeader: "bearer",
};

export const RUNNINGHUB_LLM_PROVIDER: ProviderSettings = {
  baseUrl: "https://llm.runninghub.ai/v1",
  apiKey: "",
  proxyAssets: true,
  authHeader: "bearer",
};

export const IOOAI_PROVIDER: ProviderSettings = {
  baseUrl: "https://api.iooai.cn/v1", apiKey: "", proxyAssets: true, authHeader: "bearer",
};

const PROVIDER_SETTING_KEY: Record<string, { key: string; fallback: ProviderSettings }> = {
  "openai-compatible": { key: "provider", fallback: DEFAULT_PROVIDER },
  provider: { key: "provider", fallback: DEFAULT_PROVIDER },
  iooai: { key: "provider_iooai", fallback: IOOAI_PROVIDER },
  piapi: { key: "provider_piapi", fallback: PIAPI_PROVIDER },
  runninghub: { key: "provider_runninghub", fallback: RUNNINGHUB_PROVIDER },
  "runninghub-llm": { key: "provider_runninghub", fallback: RUNNINGHUB_LLM_PROVIDER },
};

export * from "./provider-meta";

export function getProvider(id: string = "openai-compatible"): ProviderSettings {
  const entry = PROVIDER_SETTING_KEY[id] ?? PROVIDER_SETTING_KEY["openai-compatible"];
  return { ...entry.fallback, ...getSetting<Partial<ProviderSettings>>(entry.key, {}) };
}

function pick(obj: unknown, path: string): unknown {
  if (!path) return obj;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    if (Array.isArray(acc)) {
      const idx = Number(key);
      return Number.isInteger(idx) ? acc[idx] : undefined;
    }
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/** Deep-substitute {{placeholders}} inside a body template. */
function fillTemplate(template: unknown, vars: Record<string, unknown>): unknown {
  if (typeof template === "string") {
    const exact = /^\{\{(\w+)\}\}$/.exec(template);
    if (exact) {
      const value = vars[exact[1]];
      return value === undefined ? null : value;
    }
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
      vars[key] === undefined || vars[key] === null ? "" : String(vars[key]),
    );
  }
  if (Array.isArray(template)) return template.map((item) => fillTemplate(item, vars));
  if (template && typeof template === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(template as Record<string, unknown>)) {
      const filled = fillTemplate(value, vars);
      if (filled !== null || !/\{\{/.test(JSON.stringify(value))) out[key] = filled;
    }
    return out;
  }
  return template;
}

function stripEmpty(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out;
}

export interface RunModelInput {
  model: string;
  kind: ModelKind;
  config: ModelConfig;
  vars: Record<string, unknown>;
  /** Which provider config to use (ModelRecord.provider). Defaults to the main gateway. */
  providerId?: string;
}

export interface RunModelResult {
  /** URL or data URI of the produced asset. */
  source: string;
  mime?: string;
  providerJob?: string;
  raw?: unknown;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function authHeaders(provider: ProviderSettings): Record<string, string> {
  return provider.authHeader === "x-api-key"
    ? { "X-API-Key": provider.apiKey }
    : { Authorization: `Bearer ${provider.apiKey}` };
}

/**
 * The buihuuthang gateway is flaky in bursts — the exact same request can get a
 * 405, or a job that reports status "failed" with a generic message, and then
 * succeed outright a few minutes later. These two shapes are the ones observed
 * in practice; treat them as transient and worth one whole-job retry.
 */
const TRANSIENT_JOB_ERROR = /\b405\b|yêu cầu tạo nội dung thất bại|tác vụ thất bại/i;

export async function runModel(input: RunModelInput): Promise<RunModelResult> {
  try {
    return await attemptRun(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (input.providerId === "iooai" || !TRANSIENT_JOB_ERROR.test(message)) throw error;
    await sleep(5000);
    return attemptRun(input);
  }
}

async function attemptRun(input: RunModelInput): Promise<RunModelResult> {
  const provider = getProvider(input.providerId);
  if (!provider.apiKey) {
    const where = input.providerId === "iooai" ? "Cài đặt → IOOAI" : input.providerId === "piapi" ? "Cài đặt → PiAPI" : input.providerId?.startsWith("runninghub") ? "Cài đặt → RunningHub" : "Cài đặt → Kết nối API";
    throw new Error(`Chưa cấu hình API key. Vào ${where} để nhập key.`);
  }

  const base = provider.baseUrl.replace(/\/+$/, "");
  const vars: Record<string, unknown> = { ...input.vars, model: input.vars.model ?? input.model };
  if (input.providerId?.startsWith("runninghub")) {
    vars.apiKey = provider.apiKey;
  }
  if (input.providerId === "iooai") {
    const images = Array.isArray(vars.images) ? vars.images : [];
    if (!images.length || images.length > 7 || images.some((url) => {
      if (typeof url !== "string") return true;
      try { const u = new URL(url); return u.protocol !== "https:" || /^(localhost|127\.|192\.168\.|10\.|\[::1\])/.test(u.hostname); }
      catch { return true; }
    })) throw new Error("Omni IOOAI cần 1–7 ảnh có URL HTTPS công khai. Ảnh tải lên localhost chưa dùng được; hãy dùng URL ảnh công khai.");
    vars.resolution = vars.resolution === "1080p" ? "1080p" : "720p";
    if (vars.aspect !== "16:9" && vars.aspect !== "9:16") throw new Error("Omni IOOAI chỉ hỗ trợ 16:9 hoặc 9:16.");
  }
  if (input.providerId === "piapi" && input.config.body?.task_type === "seedance-2-mini-less-restriction") {
    const images = Array.isArray(vars.imageUrls) ? vars.imageUrls : [];
    const allImages = Array.isArray(vars.images) ? vars.images : images;
    if (!images.length || images.length > 9 || allImages.length !== images.length) {
      throw new Error("Omni Reference cần 1–9 ảnh URL công khai. Ảnh local chưa gửi trực tiếp được; không tự chuyển sang tạo video bằng chữ.");
    }
    vars.piapiDuration = Math.min(15, Math.max(4, Math.round(Number(vars.piapiDuration ?? vars.duration ?? 5))));
    vars.resolution = vars.resolution === "720p" ? "720p" : "480p";
  }
  const method = input.config.method ?? "POST";
  const timeoutMs = (input.config.timeout ?? 300) * 1000;

  const buildUrl = (endpoint: string) => {
    const url = `${base}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    if (method === "GET" && input.config.body) {
      const params = stripEmpty(fillTemplate(input.config.body, vars) as Record<string, unknown>);
      const qs = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]),
      );
      return `${url}?${qs.toString()}`;
    }
    return url;
  };

  /**
   * `verb` defaults to the config's method. Polling and content endpoints are
   * always GET — sending the create-method there returns 405.
   */
  const buildGetUrl = (endpoint: string) => `${base}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const send = async (endpoint: string, attempts = 6, verb?: "GET" | "POST", customBody?: unknown) => {
    const useMethod = verb ?? method;
    const url = useMethod === "GET" ? buildGetUrl(endpoint) : buildUrl(endpoint);
    const headers: Record<string, string> = {
      ...authHeaders(provider),
      ...(input.config.headers ?? {}),
    };
    if (input.providerId?.startsWith("runninghub") || base.includes("runninghub")) {
      try { headers["Host"] = new URL(base).host; } catch {}
    }
    const baseInit: RequestInit = { method: useMethod, headers };
    if (useMethod === "POST") {
      headers["Content-Type"] = "application/json";
      baseInit.body = customBody !== undefined
        ? JSON.stringify(customBody)
        : JSON.stringify(stripEmpty(fillTemplate(input.config.body ?? {}, vars) as Record<string, unknown>));
    }

    let lastError = "";
    for (let attempt = 0; attempt < attempts; attempt++) {
      // A fresh timeout per attempt — reusing one AbortSignal across retries would make
      // later attempts inherit however much of the clock earlier attempts already burned.
      let res: Response;
      try {
        res = await fetch(url, { ...baseInit, signal: AbortSignal.timeout(timeoutMs) });
      } catch (err) {
        // A hung/very slow response (our own client timeout firing, or a network drop)
        // throws instead of resolving — this gateway is slow often enough that it's worth
        // one retry rather than failing the whole job outright.
        lastError =
          err instanceof Error && err.name === "TimeoutError"
            ? `Model "${vars.model}" không phản hồi trong ${timeoutMs / 1000}s. Nhà cung cấp đang chậm — thử lại hoặc chọn model khác. Chi tiết: ${err.message}`
            : `Lỗi kết nối tới nhà cung cấp: ${err instanceof Error ? err.message : String(err)}`;
        if (attempt === attempts - 1) throw new Error(lastError);
        await sleep(4000 * (attempt + 1));
        continue;
      }
      const text = await res.text();
      let json: unknown = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = { raw: text };
      }
      if (res.ok) return json;

      const message =
        (pick(json, "error.message") as string) ??
        (pick(json, "message") as string) ??
        (typeof json === "object" ? JSON.stringify(json).slice(0, 300) : text.slice(0, 300));
      lastError =
        res.status === 502
          ? `Model "${vars.model}" đang lỗi phía nhà cung cấp (502). Đây là lỗi upstream, không phải cấu hình của bạn — thử lại sau hoặc chọn model khác. Chi tiết: ${message}`
          : res.status === 429
            ? `Nhà cung cấp đang quá tải cho model "${vars.model}" (429). Thử lại sau vài phút. Chi tiết: ${message}`
            : `API trả về ${res.status}: ${message}`;

      // 5xx / 429 are transient on this gateway — back off and retry.
      const retryable = res.status >= 500 || res.status === 429;
      if (!retryable || attempt === attempts - 1) throw new Error(lastError);
      await sleep(4000 * (attempt + 1));
    }
    throw new Error(lastError || "Không gọi được API.");
  };

  const json = await send(input.config.endpoint, input.providerId === "iooai" ? 1 : 6);
  const resultPath = input.config.resultPath ?? "data.0.url";
  const direct = pick(json, resultPath);

  if (typeof direct === "string" && direct.length > 0) {
    // Some /chat/completions models (e.g. req/gemini-3.0-pro-image) answer with the image
    // as a markdown link inside the text content, not a bare URL: "![...](https://...)".
    const markdownImage = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/.exec(direct);
    const url = markdownImage ? markdownImage[1] : direct;
    return { source: url, mime: guessMime(url, input.kind), raw: json };
  }

  // Images API often answers with base64 instead of a URL.
  if (!direct) {
    const b64 =
      pick(json, "data.0.b64_json") ?? pick(json, "b64_json") ?? pick(json, "data.0.b64");
    if (typeof b64 === "string" && b64.length > 64) {
      const mime = input.kind === "video" ? "video/mp4" : "image/png";
      return { source: `data:${mime};base64,${b64}`, mime, raw: json };
    }
  }

  // Async job flow: poll until the status field says done / failed.
  const jobId = input.config.jobPath ? pick(json, input.config.jobPath) : null;
  if (input.config.pollEndpoint && jobId != null) {
    const statusPath = input.config.statusPath ?? "status";
    const done = input.config.doneValues ?? ["succeeded", "completed", "success", "done"];
    const failed = input.config.failedValues ?? ["failed", "error", "cancelled"];
    const deadline = Date.now() + timeoutMs;
    let lastStatus = "";

    while (Date.now() < deadline) {
      await sleep(3000);
      const pollMethod = input.config.pollMethod ?? (input.providerId === "runninghub" ? "POST" : "GET");
      const pollBody = pollMethod === "POST" ? { taskId: String(jobId) } : undefined;
      const pollJson = await send(input.config.pollEndpoint.replace("{{job}}", String(jobId)), 6, pollMethod, pollBody);
      const status = String(pick(pollJson, statusPath) ?? "").toLowerCase();
      lastStatus = status;

      if (failed.includes(status)) {
        const detail =
          (pick(pollJson, "error.message") as string) ??
          (pick(pollJson, "error") as string) ??
          status;
        throw new Error(`Tác vụ thất bại: ${detail}`);
      }

      if (done.includes(status)) {
        if (input.providerId === "iooai" && pick(pollJson, "download_ready") !== true) continue;
        const finalValue = pick(pollJson, resultPath);
        if (typeof finalValue === "string" && finalValue) {
          return {
            source: finalValue,
            mime: guessMime(finalValue, input.kind),
            providerJob: String(jobId),
            raw: pollJson,
          };
        }

        // No inline URL — the bytes live behind a dedicated content endpoint.
        if (input.config.contentEndpoint) {
          return {
            source: await fetchContent(
              base,
              input.config.contentEndpoint.replace("{{job}}", String(jobId)),
              provider,
              input.config.headers,
            ),
            mime: input.kind === "video" ? "video/mp4" : "image/png",
            providerJob: String(jobId),
            raw: pollJson,
          };
        }

        throw new Error("Tác vụ đã xong nhưng không có đường dẫn kết quả. Kiểm tra lại cấu hình model.");
      }
    }
    throw new Error(
      `Quá thời gian chờ (trạng thái cuối: ${lastStatus || "không rõ"}). Tác vụ có thể vẫn đang chạy.`,
    );
  }

  // Some gateways return a job-shaped body without a poll path but with content.
  if (input.config.contentEndpoint && jobId != null) {
    return {
      source: await fetchContent(
        base,
        input.config.contentEndpoint.replace("{{job}}", String(jobId)),
        provider,
        input.config.headers,
      ),
      mime: input.kind === "video" ? "video/mp4" : "image/png",
      providerJob: String(jobId),
      raw: json,
    };
  }

  throw new Error(
    `Không đọc được kết quả tại "${resultPath}". Kiểm tra lại cấu hình model trong trang Model.`,
  );
}

/** Fetch binary media and return it as a data URI the storage layer can save. */
async function fetchContent(
  base: string,
  endpoint: string,
  provider: ProviderSettings,
  extra?: Record<string, string>,
): Promise<string> {
  const url = `${base}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const res = await fetch(url, {
    headers: { ...authHeaders(provider), ...(extra ?? {}) },
    signal: AbortSignal.timeout(300_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Không tải được file kết quả (HTTP ${res.status}) ${text.slice(0, 200)}`);
  }
  const mime = res.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream";
  const buffer = Buffer.from(await res.arrayBuffer());
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

export function guessMime(source: string, kind: ModelKind): string {
  if (source.startsWith("data:")) return source.slice(5, source.indexOf(";")) || "application/octet-stream";
  const ext = source.split("?")[0].split(".").pop()?.toLowerCase();
  if (kind === "video") return ext === "webm" ? "video/webm" : "video/mp4";
  if (kind === "chat") return "application/json";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/png";
}

/** Ask the gateway which models it exposes. Uses the saved key and auth header. */
export async function listProviderModels(providerId = "openai-compatible"): Promise<unknown[]> {
  const provider = getProvider(providerId);
  if (!provider.apiKey) throw new Error("Chưa có API key");
  const isRunningHub = providerId === "runninghub" || providerId === "runninghub-llm";
  const targetUrl = isRunningHub
    ? "https://llm.runninghub.ai/v1/models"
    : `${provider.baseUrl.replace(/\/+$/, "")}/models`;
  const headers: Record<string, string> = isRunningHub
    ? { Authorization: `Bearer ${provider.apiKey}`, Accept: "application/json" }
    : { ...authHeaders(provider), Accept: "application/json" };
  const res = await fetch(targetUrl, {
    headers,
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  let json: { data?: unknown[]; error?: { message?: string }; message?: string } | unknown[] = {};
  try {
    json = text ? (JSON.parse(text) as typeof json) : {};
  } catch {
    throw new Error(res.ok ? "API không trả danh sách model" : `HTTP ${res.status}`);
  }
  if (Array.isArray(json)) return json;
  if (!res.ok) throw new Error(json.error?.message ?? json.message ?? `HTTP ${res.status}`);
  return Array.isArray(json.data) ? json.data : [];
}
