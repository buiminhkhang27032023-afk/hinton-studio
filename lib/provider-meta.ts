export type ProviderId =
  | "all"
  | "provider"
  | "duomiapi"
  | "iooai"
  | "piapi"
  | "runninghub"
  | "siliconflow"
  | "deepseek"
  | "openrouter"
  | "groq"
  | "bailian"
  | "autodl"
  | "kling"
  | "302ai"
  | "openai-compatible"
  | string;

export interface ProviderMeta {
  id: ProviderId;
  label: string;
  short: string;
  badge: string;
  icon: string;
}

export const PROVIDER_METAS: ProviderMeta[] = [
  { id: "all", label: "Tất cả nguồn", short: "Tất cả", badge: "ALL", icon: "🌐" },
  { id: "iooai", label: "IOOAI (Seedance 2.5 / MiniMax H3 / Omni)", short: "IOOAI", badge: "IOOAI", icon: "⚡" },
  { id: "runninghub", label: "RunningHub (MimicMotion / AnimateAnyone / Kling)", short: "RunningHub", badge: "RUNNINGHUB", icon: "🚀" },
  { id: "bailian", label: "Alibaba Cloud Bailian (阿里云百炼 · AnimateAnyone / Wan 2.2)", short: "Alibaba Bailian", badge: "BAILIAN", icon: "🟠" },
  { id: "autodl", label: "AutoDL ComfyUI (RTX 4090 · MimicMotion Siêu Rẻ)", short: "AutoDL", badge: "AUTODL", icon: "💻" },
  { id: "kling", label: "Kling AI (Kuaishou 快手官方 · Kling 1.5 Pro / Try-On)", short: "Kling AI", badge: "KLING", icon: "🎬" },
  { id: "siliconflow", label: "SiliconFlow (SiliconCloud 硅基流动 · Wan 2.1/2.2 / Flux)", short: "SiliconFlow", badge: "SILICON", icon: "🌟" },
  { id: "302ai", label: "302.AI (LivePortrait / Kling / Pay-as-you-go)", short: "302.AI", badge: "302.AI", icon: "🔮" },
  { id: "provider", label: "Gateway Bùi Hữu Thắng (Veo / Gemini / Seedance)", short: "Bùi Hữu Thắng", badge: "GATEWAY", icon: "🚪" },
  { id: "duomiapi", label: "DuomiAPI (多米API · Kling / Midjourney / Suno)", short: "DuomiAPI", badge: "DUOMI", icon: "💎" },
  { id: "piapi", label: "PiAPI (Seedance 2.0 Fast)", short: "PiAPI", badge: "PiAPI", icon: "🎬" },
  { id: "deepseek", label: "DeepSeek Official API", short: "DeepSeek", badge: "DEEPSEEK", icon: "🤖" },
  { id: "openrouter", label: "OpenRouter Unified Gateway", short: "OpenRouter", badge: "ROUTER", icon: "🧭" },
  { id: "groq", label: "Groq Cloud (LPU Ultra Fast)", short: "Groq", badge: "GROQ", icon: "⚡" },
  { id: "openai-compatible", label: "Cổng OpenAI Tùy Chỉnh", short: "Tùy chỉnh", badge: "CUSTOM", icon: "⚙️" },
];

export function resolveProvider(model: { id?: string; provider?: string } | null | undefined): ProviderId {
  if (!model) return "openai-compatible";
  const pid = (model.provider || "").toLowerCase();
  const mid = (model.id || "").toLowerCase();
  if (pid === "kling" || mid.startsWith("kling:")) return "kling";
  if (pid === "302ai" || mid.startsWith("302ai:")) return "302ai";
  if (pid === "autodl" || mid.startsWith("autodl:")) return "autodl";
  if (pid === "bailian" || pid === "dashscope" || mid.startsWith("bailian:") || mid.includes("animate-anyone") || mid.includes("wan-animate")) return "bailian";
  if (pid === "duomiapi" || mid.startsWith("duomiapi:") || mid.includes("duomi")) return "duomiapi";
  if (pid === "iooai" || mid.startsWith("iooai:")) return "iooai";
  if (pid === "piapi" || mid.includes("piapi")) return "piapi";
  if (pid.startsWith("runninghub") || mid.startsWith("runninghub:")) return "runninghub";
  if (pid === "siliconflow" || mid.startsWith("siliconflow:")) return "siliconflow";
  if (pid === "deepseek" || mid.startsWith("deepseek:")) return "deepseek";
  if (pid === "openrouter" || mid.startsWith("openrouter:")) return "openrouter";
  if (pid === "groq" || mid.startsWith("groq:")) return "groq";
  if (pid === "provider" || mid.startsWith("buihuuthang/")) return "provider";
  if (pid === "openai-compatible" || mid.startsWith("seed:")) return "openai-compatible";
  return (pid as ProviderId) || "openai-compatible";
}

export function getProviderMeta(providerId: string | null | undefined): ProviderMeta {
  const p = resolveProvider({ provider: providerId ?? undefined });
  return PROVIDER_METAS.find((m) => m.id === p) ?? PROVIDER_METAS[5];
}

/** Allowed durations differ per video model */
export function durationOptions(modelId?: string | null): number[] {
  if (!modelId) return [5, 10, 15];
  const mid = modelId.toLowerCase();

  // ByteDance Seedance 2.5 快速版 only allows 15s or 30s
  if (mid.includes("快速版") || (mid.includes("seedance2.5") && !mid.includes("lw"))) {
    return [15, 30];
  }
  if (mid.includes("seedance2.5 lw") || mid.includes("seedance2.5-lw")) {
    return [5, 8, 10, 12, 13, 15, 30];
  }
  if (mid.includes("线路三") || mid.includes("线路二")) {
    return [30];
  }
  if (mid.includes("特价")) {
    return [15];
  }
  // ByteDance Seedance 2.0 (Fast & Full)
  if (mid.includes("seedance 2.0") || mid.includes("seedance2.0")) {
    return [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  }
  if (mid.includes("seedance")) {
    return [5, 10, 15];
  }
  // MiniMax / Hailuo
  if (mid.includes("minimax") || mid.includes("hailuo")) {
    return [5, 6, 10];
  }
  // Kling AI
  if (mid.includes("kling")) {
    return [5, 10];
  }
  // Wan & AnimateAnyone & MimicMotion
  if (mid.includes("wan") || mid.includes("animate") || mid.includes("mimicmotion")) {
    return [5, 10, 15];
  }
  // Veo
  if (mid.includes("veo")) {
    return [4, 6, 8];
  }
  // Omni Flash 10s only
  if (mid.includes("omni_flash_10s")) {
    return [10];
  }
  if (mid.includes("omni")) {
    return [5, 10];
  }
  // PiAPI Seedance accepts whole seconds from 4 to 15
  if (mid.includes("piapi")) {
    return Array.from({ length: 12 }, (_, i) => i + 4);
  }
  return [5, 10, 15, 20, 30];
}

export function getDefaultDuration(modelId?: string | null): number {
  if (!modelId) return 10;
  const mid = modelId.toLowerCase();
  if (mid.includes("快速版") || (mid.includes("seedance2.5") && !mid.includes("lw"))) return 15;
  if (mid.includes("线路三") || mid.includes("线路二")) return 30;
  if (mid.includes("特价")) return 15;
  if (mid.includes("omni")) return 10;
  if (mid.includes("seedance2.5") || mid.includes("seedance 2.5")) return 15;
  if (mid.includes("seedance")) return 10;
  if (mid.includes("minimax") || mid.includes("hailuo")) return 6;
  if (mid.includes("veo")) return 6;
  if (mid.includes("kling")) return 5;
  return 10;
}
