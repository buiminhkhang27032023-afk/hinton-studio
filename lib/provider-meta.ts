export type ProviderId = "all" | "iooai" | "piapi" | "runninghub" | "provider" | "openai-compatible";

export interface ProviderMeta {
  id: ProviderId;
  label: string;
  short: string;
  badge: string;
  icon: string;
}

export const PROVIDER_METAS: ProviderMeta[] = [
  { id: "all", label: "Tất cả nguồn", short: "Tất cả", badge: "ALL", icon: "🌐" },
  { id: "iooai", label: "IOOAI (Omni Flash / Seedance MD)", short: "IOOAI", badge: "IOOAI", icon: "⚡" },
  { id: "piapi", label: "PiAPI (Seedance 2.0 Fast)", short: "PiAPI", badge: "PiAPI", icon: "🎬" },
  { id: "runninghub", label: "RunningHub (ComfyUI / Flux / LLM)", short: "RunningHub", badge: "RunningHub", icon: "🚀" },
  { id: "provider", label: "Gateway Bùi Hữu Thắng (Veo / Seedance)", short: "Gateway", badge: "Gateway", icon: "🚪" },
  { id: "openai-compatible", label: "Mẫu chuẩn OpenAI Compatible", short: "Mẫu OpenAI", badge: "OpenAI", icon: "⚙️" },
];

export function resolveProvider(model: { id?: string; provider?: string } | null | undefined): ProviderId {
  if (!model) return "openai-compatible";
  const pid = (model.provider || "").toLowerCase();
  const mid = (model.id || "").toLowerCase();
  if (pid === "iooai" || mid.startsWith("iooai:")) return "iooai";
  if (pid === "piapi" || mid.includes("piapi")) return "piapi";
  if (pid.startsWith("runninghub") || mid.startsWith("runninghub:")) return "runninghub";
  if (pid === "provider" || mid.startsWith("buihuuthang/")) return "provider";
  if (pid === "openai-compatible" || mid.startsWith("seed:")) return "openai-compatible";
  return (pid as ProviderId) || "openai-compatible";
}

export function getProviderMeta(providerId: string | null | undefined): ProviderMeta {
  const p = resolveProvider({ provider: providerId ?? undefined });
  return PROVIDER_METAS.find((m) => m.id === p) ?? PROVIDER_METAS[5];
}
