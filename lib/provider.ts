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
  baseUrl: "https://www.runninghub.cn/openapi/v2",
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

export const DUOMIAPI_PROVIDER: ProviderSettings = {
  baseUrl: "https://api.wike.cc",
  apiKey: "",
  proxyAssets: true,
  authHeader: "bearer",
};

export const SILICONFLOW_PROVIDER: ProviderSettings = {
  baseUrl: "https://api.siliconflow.cn/v1",
  apiKey: "",
  proxyAssets: true,
  authHeader: "bearer",
};

export const DEEPSEEK_PROVIDER: ProviderSettings = {
  baseUrl: "https://api.deepseek.com/v1",
  apiKey: "",
  proxyAssets: true,
  authHeader: "bearer",
};

export const OPENROUTER_PROVIDER: ProviderSettings = {
  baseUrl: "https://openrouter.ai/api/v1",
  apiKey: "",
  proxyAssets: true,
  authHeader: "bearer",
};

export const GROQ_PROVIDER: ProviderSettings = {
  baseUrl: "https://api.groq.com/openai/v1",
  apiKey: "",
  proxyAssets: true,
  authHeader: "bearer",
};

export const MUSE_PROVIDER: ProviderSettings = {
  baseUrl: "https://api.musetalk.ai/v1",
  apiKey: "",
  proxyAssets: true,
  authHeader: "bearer",
};

export const BAILIAN_PROVIDER: ProviderSettings = {
  baseUrl: "https://dashscope.aliyuncs.com/api/v1",
  apiKey: "",
  proxyAssets: true,
  authHeader: "bearer",
};

export const ELEVENLABS_PROVIDER: ProviderSettings = {
  baseUrl: "https://api.elevenlabs.io/v1",
  apiKey: "",
  proxyAssets: true,
  authHeader: "x-api-key",
};

export const AUTODL_PROVIDER: ProviderSettings = {
  baseUrl: "http://127.0.0.1:8188",
  apiKey: "autodl",
  proxyAssets: true,
  authHeader: "bearer",
};

const PROVIDER_SETTING_KEY: Record<string, { key: string; fallback: ProviderSettings }> = {
  "openai-compatible": { key: "provider", fallback: DEFAULT_PROVIDER },
  provider: { key: "provider", fallback: DEFAULT_PROVIDER },
  duomiapi: { key: "provider_duomiapi", fallback: DUOMIAPI_PROVIDER },
  siliconflow: { key: "provider_siliconflow", fallback: SILICONFLOW_PROVIDER },
  deepseek: { key: "provider_deepseek", fallback: DEEPSEEK_PROVIDER },
  openrouter: { key: "provider_openrouter", fallback: OPENROUTER_PROVIDER },
  groq: { key: "provider_groq", fallback: GROQ_PROVIDER },
  iooai: { key: "provider_iooai", fallback: IOOAI_PROVIDER },
  piapi: { key: "provider_piapi", fallback: PIAPI_PROVIDER },
  runninghub: { key: "provider_runninghub", fallback: RUNNINGHUB_PROVIDER },
  "runninghub-llm": { key: "provider_runninghub", fallback: RUNNINGHUB_LLM_PROVIDER },
  bailian: { key: "provider_bailian", fallback: BAILIAN_PROVIDER },
  dashscope: { key: "provider_bailian", fallback: BAILIAN_PROVIDER },
  autodl: { key: "provider_autodl", fallback: AUTODL_PROVIDER },
  muse: { key: "provider_muse", fallback: MUSE_PROVIDER },
  elevenlabs: { key: "provider_elevenlabs", fallback: ELEVENLABS_PROVIDER },
};

export * from "./provider-meta";

export function getProvider(id: string = "openai-compatible"): ProviderSettings {
  const normId = (id || "openai-compatible").toLowerCase();
  if (normId === "elevenlabs") {
    const prov = { ...ELEVENLABS_PROVIDER, ...getSetting<Partial<ProviderSettings>>("provider_elevenlabs", {}) };
    if (!prov.apiKey) {
      prov.apiKey = getSetting<string>("elevenlabs_api_key", "") || process.env.ELEVENLABS_API_KEY || "";
    }
    return prov;
  }
  const entry = PROVIDER_SETTING_KEY[normId];
  if (entry) {
    return { ...entry.fallback, ...getSetting<Partial<ProviderSettings>>(entry.key, {}) };
  }
  // Check custom providers stored in custom_providers setting
  const customList = getSetting<Array<{ id: string; baseUrl: string; apiKey: string; authHeader?: "bearer" | "x-api-key" }>>(
    "custom_providers",
    [],
  );
  const foundCustom = customList.find((c) => c.id.toLowerCase() === normId);
  if (foundCustom) {
    return {
      baseUrl: foundCustom.baseUrl || DEFAULT_PROVIDER.baseUrl,
      apiKey: foundCustom.apiKey || "",
      proxyAssets: true,
      authHeader: foundCustom.authHeader || "bearer",
    };
  }
  return { ...DEFAULT_PROVIDER, ...getSetting<Partial<ProviderSettings>>("provider", {}) };
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
  /** Called as soon as the provider returns a task id, so a slow job can be recovered. */
  onJobId?: (jobId: string) => void;
  /** Persist the submission boundary before any billable request. */
  onSubmit?: () => void;
  /** Set only by the server after consuming a scoped single-use approval. */
  approvedPausedRun?: boolean;
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

export async function runModel(input: RunModelInput): Promise<RunModelResult> {
  if (getSetting<boolean>("model_calls_paused", false) === true && input.approvedPausedRun !== true) {
    throw new Error("Đã khóa gọi model theo yêu cầu của bạn. Chưa gửi yêu cầu mới.");
  }
  // Re-submitting a generation can create another billable task even when
  // the previous response timed out. Never retry whole generations implicitly.
  return attemptRun(input);
}

async function attemptRun(input: RunModelInput): Promise<RunModelResult> {
  const provider = getProvider(input.providerId);
  if (!provider.apiKey) {
    const where =
      input.providerId === "muse"
        ? "Cài đặt → Cổng Muse AI"
        : input.providerId === "duomiapi"
        ? "Cài đặt → Cổng DuomiAPI"
        : input.providerId === "iooai"
        ? "Cài đặt → Cổng IOOAI"
        : input.providerId === "piapi"
        ? "Cài đặt → Cổng PiAPI"
        : input.providerId?.startsWith("runninghub")
        ? "Cài đặt → Cổng RunningHub"
        : input.providerId === "bailian" || input.providerId === "dashscope"
        ? "Cài đặt → Cổng Alibaba Bailian"
        : input.providerId === "autodl"
        ? "Cài đặt → Cổng AutoDL ComfyUI"
        : "Cài đặt → Cổng Nối API";
    throw new Error(`Chưa cấu hình API key cho cổng [${input.providerId}]. Vào ${where} để nhập key.`);
  }

  const base = provider.baseUrl.replace(/\/+$/, "");
  const vars: Record<string, unknown> = { ...input.vars, model: input.vars.model ?? input.model };
  if (input.providerId?.startsWith("runninghub") || base.includes("runninghub")) {
    vars.apiKey = provider.apiKey;
    const imgUrl =
      (typeof vars.image === "string" && vars.image) ||
      (typeof vars.firstImageUrl === "string" && vars.firstImageUrl) ||
      (Array.isArray(vars.images) && typeof vars.images[0] === "string" && vars.images[0]) ||
      "";
    if (imgUrl) {
      if (!vars.firstImageUrl) vars.firstImageUrl = imgUrl;
      if (!vars.firstFrameUrl) vars.firstFrameUrl = imgUrl;
      if (!vars.imageUrl) vars.imageUrl = imgUrl;
    }
    vars.resolution = vars.resolution || "720p";
    vars.duration = String(vars.duration || vars.seconds || "5");
    vars.sound = vars.sound ?? "false";
    vars.bgm = vars.bgm ?? "false";
    vars.movementAmplitude = vars.movementAmplitude ?? "auto";
    vars.aspectRatio = vars.aspectRatio || vars.aspect || "9:16";
    if ((String(input.model).includes("mimicmotion") || String(input.model).includes("animate-anyone")) && (!vars.workflowId || String(vars.workflowId).includes("_"))) {
      throw new Error(
        "Chưa nhập mã Workflow ID RunningHub. Hãy vào runninghub.ai tìm workflow MimicMotion/AnimateAnyone, copy dãy số 19 chữ số trên thanh URL và dán vào ô 'Mã Workflow ID' trong bảng Inspector (hoặc dùng model Kling 2.6 Pro / Wan 2.7 không cần ID)."
      );
    }
  }
  if (input.providerId === "iooai") {
    vars.aspect = vars.aspect === "9:16" ? "9:16" : "16:9";
    vars.ratio = vars.aspect;
    vars.resolution = vars.resolution === "1080p" ? "1080p" : "720p";

    // Handle video reference for video-to-video capable models (Omni Video Editor, Seedance 2.0 / 2.5)
    const midCheck = String(vars.model || input.model || "").toLowerCase();
    if (midCheck.includes("seedance2.5 lj") || midCheck.includes("seedance2.5lj")) {
      delete vars.videos;
      delete vars.video;
      delete vars.videoUrl;
    } else if (Array.isArray(vars.videos) && vars.videos.length > 0) {
      if (midCheck.includes("可编辑") || midCheck.includes("seedance")) {
        vars.videos = vars.videos.filter((u) => typeof u === "string" && /^https:\/\//i.test(u));
        if (!vars.videos.length) delete vars.videos;
      } else {
        delete vars.videos;
      }
    } else {
      const rawVid = (vars.video || vars.videoUrl) as string | undefined;
      if (typeof rawVid === "string" && rawVid.trim()) {
        if (midCheck.includes("可编辑") || midCheck.includes("seedance")) {
          vars.videos = [rawVid.trim()];
        } else {
          delete vars.videos;
          delete vars.video;
          delete vars.videoUrl;
        }
      }
    }

    // Handle audio fields for IOOAI:
    // ByteDance Seedance 2.0 / 2.5 officially supports `audios: [https_urls]` for multi-character audio guidance/lipsync!
    // Other models (Omni, MiniMax) do not accept audio fields.
    if (midCheck.includes("seedance") && Array.isArray(vars.audios) && vars.audios.length > 0) {
      // Keep vars.audios as an array of public HTTPS audio URLs for Seedance
      vars.audios = vars.audios.filter((u) => typeof u === "string" && /^https:\/\//i.test(u));
      if (!vars.audios.length) delete vars.audios;
    } else {
      delete vars.audios;
    }
    delete vars.audio;
    delete vars.audioUrl;
    delete vars.audio_url;
    delete vars.sound;

    // Auto-normalize duration & seconds to match IOOAI endpoint requirements
    const mid = String(vars.model || input.model || "").toLowerCase();
    if (mid.includes("adaptive") || (mid.includes("seedance") && (mid.includes("fast") || mid.includes("mini") || mid.includes("满血")) && !mid.includes("官渠") && !mid.includes("全参"))) {
      vars.ratio = "adaptive";
    }
    if (input.kind === "video" && mid.includes("omni") && !mid.includes("edit") && !mid.includes("可编辑")) {
      let images = Array.isArray(vars.images) ? vars.images : [];
      if (images.length > 7) {
        images = images.slice(0, 7);
        vars.images = images;
      }
      if (!images.length || images.some((url) => typeof url !== "string" || !/^https:\/\//i.test(url))) {
        throw new Error("IOOAI Omni cần 1–7 ảnh URL HTTPS công khai. Không gửi ảnh local hoặc âm thầm chuyển sang tạo bằng chữ.");
      }
    }
    if (vars.model === "seedance2.0 线路二" || mid.includes("线路二") || mid.includes("特价")) {
      delete vars.resolution;
    }
    if (mid.includes("seedance2.5 lj")) {
      vars.resolution = "1080p";
    }
    let sec = Number(vars.seconds ?? vars.duration ?? 15);
    if (mid.includes("线路三") || mid.includes("seedance2.5线路二")) {
      sec = 30;
    } else if (mid.includes("线路二") || mid.includes("特价") || mid.includes("快速版")) {
      sec = 15;
    } else if (mid.includes("omni")) {
      sec = 10;
    } else if (mid.includes("lw")) {
      const allowed = [5, 8, 10, 12, 13, 15, 30];
      sec = allowed.reduce((prev, curr) => Math.abs(curr - sec) < Math.abs(prev - sec) ? curr : prev, 15);
    } else if (mid.includes("seedance2.5") || mid.includes("seedance 2.5")) {
      sec = Math.min(30, Math.max(4, Math.round(sec)));
    } else if (mid.includes("seedance 2.0") || mid.includes("seedance2.0")) {
      sec = Math.min(15, Math.max(4, Math.round(sec)));
    }
    vars.seconds = String(sec);
    vars.duration = sec;
  }
  if (input.providerId === "muse"
        ? "Cài đặt → Cổng Muse AI"
        : input.providerId === "duomiapi" && input.config.endpoint?.includes("contents/generations/tasks")) {
    const prompt = String(vars.prompt || "").trim();
    const image = typeof vars.image === "string" ? vars.image.trim() : "";
    const content: Array<Record<string, unknown>> = [];
    if (prompt) content.push({ type: "text", text: prompt });
    if (image) content.push({ type: "image_url", image_url: { url: image } });
    vars.content = content.length > 0 ? content : [{ type: "text", text: "cinematic high quality video" }];
  }
  if (input.config.endpoint?.includes("/chat/completions") && input.kind === "image") {
    const prompt = String(vars.prompt || "").trim();
    const imgs: string[] = [];
    const pushImg = (val: unknown) => {
      if (typeof val === "string" && val.trim() && !imgs.includes(val.trim())) {
        imgs.push(val.trim());
      }
    };
    if (Array.isArray(vars.images)) {
      for (const item of vars.images) pushImg(item);
    }
    pushImg(vars.modelImage);
    pushImg(vars.garmentImage);
    pushImg(vars.image);

    const content: Array<Record<string, unknown>> = [];
    if (prompt) content.push({ type: "text", text: prompt });
    for (const url of imgs) {
      content.push({ type: "image_url", image_url: { url } });
    }
    vars.content = content.length > 0 ? content : [{ type: "text", text: prompt || "photorealistic high quality image" }];
    vars.messages = [
      {
        role: "user",
        content: vars.content,
      },
    ];
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

  const resolveEndpointUrl = (endpoint: string) => {
    if (/^https?:\/\//i.test(endpoint)) return endpoint;
    let cleanBase = base.replace(/\/+$/, "");
    let cleanEp = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

    if (input.providerId?.startsWith("runninghub") || cleanBase.includes("runninghub")) {
      const isComfy = cleanEp.startsWith("/task/");
      const isLlm = cleanEp.startsWith("/chat/") || cleanEp.startsWith("/models") || cleanEp.startsWith("/v1/");
      const isV2 = cleanEp.startsWith("/openapi/v2");

      if (isLlm) {
        if (!cleanBase.includes("llm.runninghub.ai")) {
          cleanBase = "https://llm.runninghub.ai/v1";
          cleanEp = cleanEp.replace(/^\/v1/, "");
        }
      } else if (!isComfy) {
        if (cleanBase.endsWith("/openapi/v2") && isV2) {
          cleanEp = cleanEp.replace(/^\/openapi\/v2/, "");
        } else if (!cleanBase.endsWith("/openapi/v2") && !isV2) {
          cleanBase = `${cleanBase}/openapi/v2`;
        }
      }
    }
    return `${cleanBase}${cleanEp}`;
  };

  const buildUrl = (endpoint: string) => {
    const url = resolveEndpointUrl(endpoint);
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
  const buildGetUrl = (endpoint: string) => resolveEndpointUrl(endpoint);

  const send = async (endpoint: string, attempts = 6, verb?: "GET" | "POST", customBody?: unknown) => {
    const useMethod = verb ?? method;
    const url = useMethod === "GET" ? buildGetUrl(endpoint) : buildUrl(endpoint);
    const headers: Record<string, string> = {
      ...authHeaders(provider),
      ...(input.config.headers ?? {}),
    };
    if (input.providerId?.startsWith("runninghub") || base.includes("runninghub")) {
      try { headers["Host"] = new URL(url).host; } catch {}
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
        res = await fetch(url, { ...baseInit, signal: AbortSignal.timeout(verb ? Math.min(timeoutMs, 30_000) : timeoutMs) });
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

  // Only polling may be retried; creation requests have no idempotency contract.
  input.onSubmit?.();
  const json = await send(input.config.endpoint, 1);

  if (input.providerId?.startsWith("runninghub") || base.includes("runninghub")) {
    const errCode = String(pick(json, "errorCode") ?? "");
    if (errCode && errCode !== "0" && errCode !== "null" && errCode !== "undefined") {
      const errMsg = (pick(json, "errorMessage") as string) || "Lỗi yêu cầu RunningHub";
      if (errCode === "605") {
        throw new Error(
          "Tài khoản RunningHub của bạn không đủ số dư (còn 3.05 CNY). Vui lòng nạp thêm tại runninghub.ai hoặc chuyển sang nguồn IOOAI / Gateway Bùi Hữu Thắng.",
        );
      }
      throw new Error(`RunningHub báo lỗi [${errCode}]: ${errMsg}`);
    }
    const code = pick(json, "code");
    if (code !== undefined && code !== null && code !== 0 && code !== 200) {
      if (code === 404 && (String(input.model).includes("mimicmotion") || String(input.model).includes("animate"))) {
        throw new Error(
          "Model MimicMotion/AnimateAnyone là dạng ComfyUI Cloud cần có Workflow ID riêng trên tài khoản RunningHub. Hãy chuyển sang model [RunningHub · Kling 2.6 Pro Video] hoặc [Alibaba Wan 2.7] để tạo chuyển động cho người mẫu ngay lập tức."
        );
      }
      const msg = (pick(json, "msg") as string) || (pick(json, "message") as string) || "Lỗi RunningHub";
      throw new Error(`RunningHub báo lỗi [${code}]: ${msg}`);
    }
  }

  const resultPath = input.config.resultPath ?? "data.0.url";
  // Persist acceptance before parsing results or polling. Do not swallow a DB
  // failure: continuing without a durable ID makes safe recovery impossible.
  const jobId = input.config.jobPath
    ? (pick(json, input.config.jobPath) ?? pick(json, "taskId") ?? pick(json, "data.taskId") ?? pick(json, "task_id") ?? pick(json, "data.task_id") ?? pick(json, "id"))
    : (pick(json, "taskId") ?? pick(json, "id") ?? pick(json, "task_id") ?? pick(json, "data.taskId") ?? pick(json, "data.task_id"));
  if (jobId != null) input.onJobId?.(String(jobId));
  const direct = pick(json, resultPath);

  if (typeof direct === "string" && direct.length > 0 &&
      !(input.providerId === "iooai" && (pick(json, "download_ready") === false || pick(json, "data.download_ready") === false))) {
    // Some /chat/completions models (e.g. req/gemini-3.0-pro-image) answer with the image
    // as a markdown link inside the text content, not a bare URL: "![...](https://...)".
    const markdownImage = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/.exec(direct);
    const url = markdownImage ? markdownImage[1] : direct;
    return { source: url, mime: guessMime(url, input.kind), providerJob: jobId == null ? undefined : String(jobId), raw: json };
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
  if (input.config.pollEndpoint && jobId != null) {
    const statusPath = input.config.statusPath ?? "status";
    const done = input.config.doneValues ?? ["succeeded", "completed", "success", "done"];
    const failed = input.config.failedValues ?? ["failed", "error", "cancelled"];
    // Video providers (IOOAI Seedance/Omni) regularly take 15–30 min when busy;
    // the old 15-min cap gave up on jobs that were still rendering.
    const pollTimeoutMs = input.kind === "video" ? Math.max(timeoutMs, 45 * 60_000) : timeoutMs;
    const deadline = Date.now() + pollTimeoutMs;
    let lastStatus = "";

    if (input.config.initialPollDelaySeconds) await sleep(input.config.initialPollDelaySeconds * 1000);

    while (Date.now() < deadline) {
      await sleep(Math.max(3000, (input.config.pollIntervalSeconds ?? 3) * 1000));
      const pollMethod = input.config.pollMethod ?? (input.providerId === "runninghub" ? "POST" : "GET");
      const pollBody = pollMethod === "POST" ? { taskId: String(jobId) } : undefined;
      const pollJson = await send(input.config.pollEndpoint.replace("{{job}}", String(jobId)), 6, pollMethod, pollBody);
      const rawStatus = pick(pollJson, statusPath) ?? pick(pollJson, "data.status") ?? pick(pollJson, "status");
      const status = String(rawStatus ?? "").toLowerCase();
      lastStatus = status;

      if (input.providerId?.startsWith("runninghub") || base.includes("runninghub")) {
        const pErrCode = String(pick(pollJson, "errorCode") ?? "");
        if (pErrCode && pErrCode !== "0" && pErrCode !== "null" && pErrCode !== "undefined" && pErrCode !== "1004") {
          const pErrMsg = (pick(pollJson, "errorMessage") as string) || `Mã lỗi ${pErrCode}`;
          if (pErrCode === "605") {
            throw new Error("Tài khoản RunningHub của bạn không đủ số dư.");
          }
          throw new Error(`Tác vụ RunningHub thất bại [${pErrCode}]: ${pErrMsg}`);
        }
      }

      const hasUpstreamErr = pick(pollJson, "error");
      if (failed.includes(status) || (hasUpstreamErr && !done.includes(status) && status !== "queued" && pick(pollJson, "error.code") === "upstream_error")) {
        const detail =
          (pick(pollJson, "errorMessage") as string) ??
          (pick(pollJson, "failedReason.message") as string) ??
          (pick(pollJson, "error.message") as string) ??
          (pick(pollJson, "error") as string) ??
          status;
        throw new Error(`${failed.includes(status) ? "Tác vụ thất bại" : "Tác vụ chưa có kết quả"}: ${detail}`);
      }

      if (done.includes(status)) {
        if (input.providerId === "iooai" && (pick(pollJson, "download_ready") === false || pick(pollJson, "data.download_ready") === false)) continue;
        let finalValue = pick(pollJson, resultPath);
        if (!finalValue || typeof finalValue !== "string") {
          finalValue = pick(pollJson, "results.0.url")
            ?? pick(pollJson, "data.outputUrl")
            ?? pick(pollJson, "data.output_url")
            ?? pick(pollJson, "output_url")
            ?? pick(pollJson, "video_url")
            ?? pick(pollJson, "videos.0.url")
            ?? pick(pollJson, "data.content.0.video_url")
            ?? pick(pollJson, "data.video_url")
            ?? pick(pollJson, "data.url")
            ?? pick(pollJson, "url");
        }
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
      `Quá thời gian chờ (trạng thái cuối: ${lastStatus || "không rõ"}). Tác vụ có thể vẫn đang chạy — mã tác vụ: ${String(jobId)}.`,
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
