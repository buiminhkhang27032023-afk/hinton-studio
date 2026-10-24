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
  { id: "provider", label: "Gateway Bùi Hữu Thắng (Veo / Gemini / Seedance)", short: "Bùi Hữu Thắng", badge: "GATEWAY", icon: "🚪" },
  { id: "duomiapi", label: "DuomiAPI (多米API · Kling / Midjourney / Suno)", short: "DuomiAPI", badge: "DUOMI", icon: "💎" },
  { id: "iooai", label: "IOOAI (Omni Flash / Seedance MD)", short: "IOOAI", badge: "IOOAI", icon: "⚡" },
  { id: "piapi", label: "PiAPI (Seedance 2.0 Fast)", short: "PiAPI", badge: "PiAPI", icon: "🎬" },
  { id: "runninghub", label: "RunningHub (ComfyUI / Flux / LLM)", short: "RunningHub", badge: "RunningHub", icon: "🚀" },
  { id: "siliconflow", label: "SiliconFlow (SiliconCloud 硅基流动)", short: "SiliconFlow", badge: "SILICON", icon: "🌟" },
  { id: "deepseek", label: "DeepSeek Official API", short: "DeepSeek", badge: "DEEPSEEK", icon: "🤖" },
  { id: "openrouter", label: "OpenRouter Unified Gateway", short: "OpenRouter", badge: "ROUTER", icon: "🧭" },
  { id: "groq", label: "Groq Cloud (LPU Ultra Fast)", short: "Groq", badge: "GROQ", icon: "⚡" },
  { id: "openai-compatible", label: "Cổng OpenAI Tùy Chỉnh", short: "Tùy chỉnh", badge: "CUSTOM", icon: "⚙️" },
];

export function resolveProvider(model: { id?: string; provider?: string } | null | undefined): ProviderId {
  if (!model) return "openai-compatible";
  const pid = (model.provider || "").toLowerCase();
  const mid = (model.id || "").toLowerCase();
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
