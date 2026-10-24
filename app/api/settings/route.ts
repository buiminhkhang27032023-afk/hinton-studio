import { NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";
import {
  DEFAULT_PROVIDER,
  PIAPI_PROVIDER,
  DUOMIAPI_PROVIDER,
  SILICONFLOW_PROVIDER,
  DEEPSEEK_PROVIDER,
  OPENROUTER_PROVIDER,
  GROQ_PROVIDER,
  getProvider,
} from "@/lib/provider";
import type { ProviderSettings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const provider = getProvider();
  const duomiapi = getProvider("duomiapi");
  const iooai = getProvider("iooai");
  const piapi = getProvider("piapi");
  const runninghub = getProvider("runninghub");
  const siliconflow = getProvider("siliconflow");
  const deepseek = getProvider("deepseek");
  const openrouter = getProvider("openrouter");
  const groq = getProvider("groq");

  const rawCustom = getSetting<Array<{ id: string; name: string; baseUrl: string; apiKey: string; icon?: string }>>(
    "custom_providers",
    [],
  );
  const customProviders = rawCustom.map((c) => ({
    ...c,
    hasKey: Boolean(c.apiKey),
    apiKey: c.apiKey ? `••••${c.apiKey.slice(-4)}` : "",
  }));

  const activeProvider = getSetting<string>("active_provider", "provider");

  return NextResponse.json({
    ...provider,
    apiKey: provider.apiKey ? `••••${provider.apiKey.slice(-4)}` : "",
    hasKey: Boolean(provider.apiKey),
    baseUrlDefault: DEFAULT_PROVIDER.baseUrl,
    language: getSetting("language", "vi"),
    activeProvider,
    duomiapi: {
      baseUrl: duomiapi.baseUrl || DUOMIAPI_PROVIDER.baseUrl,
      apiKey: duomiapi.apiKey ? `••••${duomiapi.apiKey.slice(-4)}` : "",
      hasKey: Boolean(duomiapi.apiKey),
    },
    iooai: {
      baseUrl: iooai.baseUrl,
      apiKey: iooai.apiKey ? `••••${iooai.apiKey.slice(-4)}` : "",
      hasKey: Boolean(iooai.apiKey),
    },
    piapi: {
      baseUrl: piapi.baseUrl,
      baseUrlDefault: PIAPI_PROVIDER.baseUrl,
      apiKey: piapi.apiKey ? `••••${piapi.apiKey.slice(-4)}` : "",
      hasKey: Boolean(piapi.apiKey),
    },
    runninghub: {
      baseUrl: runninghub.baseUrl || "https://www.runninghub.ai",
      apiKey: runninghub.apiKey ? `••••${runninghub.apiKey.slice(-4)}` : "",
      hasKey: Boolean(runninghub.apiKey),
    },
    siliconflow: {
      baseUrl: siliconflow.baseUrl || SILICONFLOW_PROVIDER.baseUrl,
      apiKey: siliconflow.apiKey ? `••••${siliconflow.apiKey.slice(-4)}` : "",
      hasKey: Boolean(siliconflow.apiKey),
    },
    deepseek: {
      baseUrl: deepseek.baseUrl || DEEPSEEK_PROVIDER.baseUrl,
      apiKey: deepseek.apiKey ? `••••${deepseek.apiKey.slice(-4)}` : "",
      hasKey: Boolean(deepseek.apiKey),
    },
    openrouter: {
      baseUrl: openrouter.baseUrl || OPENROUTER_PROVIDER.baseUrl,
      apiKey: openrouter.apiKey ? `••••${openrouter.apiKey.slice(-4)}` : "",
      hasKey: Boolean(openrouter.apiKey),
    },
    groq: {
      baseUrl: groq.baseUrl || GROQ_PROVIDER.baseUrl,
      apiKey: groq.apiKey ? `••••${groq.apiKey.slice(-4)}` : "",
      hasKey: Boolean(groq.apiKey),
    },
    customProviders,
  });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as Partial<ProviderSettings> & {
    language?: string;
    activeProvider?: string;
    duomiapiApiKey?: string;
    duomiapiBaseUrl?: string;
    duomiapiClearKey?: boolean;
    iooaiApiKey?: string;
    piapiApiKey?: string;
    piapiClearKey?: boolean;
    runninghubApiKey?: string;
    runninghubBaseUrl?: string;
    runninghubClearKey?: boolean;
    siliconflowApiKey?: string;
    siliconflowBaseUrl?: string;
    siliconflowClearKey?: boolean;
    deepseekApiKey?: string;
    deepseekBaseUrl?: string;
    deepseekClearKey?: boolean;
    openrouterApiKey?: string;
    openrouterBaseUrl?: string;
    openrouterClearKey?: boolean;
    groqApiKey?: string;
    groqBaseUrl?: string;
    groqClearKey?: boolean;
    customProviders?: Array<{ id: string; name: string; baseUrl: string; apiKey: string; icon?: string }>;
  };

  // Primary Gateway (Bùi Hữu Thắng or Custom Main)
  const current = getSetting<Partial<ProviderSettings>>("provider", {});
  const next: Partial<ProviderSettings> = { ...current };
  if (typeof body.baseUrl === "string" && body.baseUrl.trim()) {
    next.baseUrl = body.baseUrl.trim().replace(/\/+$/, "");
  }
  if (typeof body.apiKey === "string" && body.apiKey.trim() && !body.apiKey.includes("••••")) {
    next.apiKey = body.apiKey.trim();
  }
  if (body.apiKey === "" && "clearKey" in body) {
    next.apiKey = "";
  }
  if (typeof body.proxyAssets === "boolean") next.proxyAssets = body.proxyAssets;
  if (typeof body.defaultChatModel === "string") next.defaultChatModel = body.defaultChatModel;
  setSetting("provider", next);

  if (body.language === "vi" || body.language === "en") setSetting("language", body.language);
  if (typeof body.activeProvider === "string") setSetting("active_provider", body.activeProvider);

  // DuomiAPI
  if (typeof body.duomiapiApiKey === "string" || body.duomiapiClearKey || typeof body.duomiapiBaseUrl === "string") {
    const curDuomi = getSetting<Partial<ProviderSettings>>("provider_duomiapi", {});
    const nextDuomi: Partial<ProviderSettings> = { ...curDuomi };
    if (body.duomiapiClearKey) {
      nextDuomi.apiKey = "";
    } else if (body.duomiapiApiKey && body.duomiapiApiKey.trim() && !body.duomiapiApiKey.includes("••••")) {
      nextDuomi.apiKey = body.duomiapiApiKey.trim();
    }
    if (typeof body.duomiapiBaseUrl === "string" && body.duomiapiBaseUrl.trim()) {
      nextDuomi.baseUrl = body.duomiapiBaseUrl.trim().replace(/\/+$/, "");
    }
    setSetting("provider_duomiapi", nextDuomi);
  }

  // PiAPI
  if (typeof body.piapiApiKey === "string" || body.piapiClearKey) {
    const currentPiapi = getSetting<Partial<ProviderSettings>>("provider_piapi", {});
    const nextPiapi: Partial<ProviderSettings> = { ...currentPiapi };
    if (body.piapiClearKey) {
      nextPiapi.apiKey = "";
    } else if (body.piapiApiKey && body.piapiApiKey.trim() && !body.piapiApiKey.includes("••••")) {
      nextPiapi.apiKey = body.piapiApiKey.trim();
    }
    setSetting("provider_piapi", nextPiapi);
  }

  // IOOAI
  if (typeof body.iooaiApiKey === "string" && body.iooaiApiKey.trim() && !body.iooaiApiKey.includes("••••")) {
    setSetting("provider_iooai", {
      ...getSetting<Partial<ProviderSettings>>("provider_iooai", {}),
      apiKey: body.iooaiApiKey.trim(),
    });
  }

  // RunningHub
  if (typeof body.runninghubApiKey === "string" || body.runninghubClearKey || typeof body.runninghubBaseUrl === "string") {
    const currentRh = getSetting<Partial<ProviderSettings>>("provider_runninghub", {});
    const nextRh: Partial<ProviderSettings> = { ...currentRh };
    if (body.runninghubClearKey) {
      nextRh.apiKey = "";
    } else if (body.runninghubApiKey && body.runninghubApiKey.trim() && !body.runninghubApiKey.includes("••••")) {
      nextRh.apiKey = body.runninghubApiKey.trim();
    }
    if (typeof body.runninghubBaseUrl === "string" && body.runninghubBaseUrl.trim()) {
      nextRh.baseUrl = body.runninghubBaseUrl.trim().replace(/\/+$/, "");
    }
    setSetting("provider_runninghub", nextRh);
  }

  // SiliconFlow
  if (typeof body.siliconflowApiKey === "string" || body.siliconflowClearKey || typeof body.siliconflowBaseUrl === "string") {
    const curSf = getSetting<Partial<ProviderSettings>>("provider_siliconflow", {});
    const nextSf: Partial<ProviderSettings> = { ...curSf };
    if (body.siliconflowClearKey) nextSf.apiKey = "";
    else if (body.siliconflowApiKey && body.siliconflowApiKey.trim() && !body.siliconflowApiKey.includes("••••")) {
      nextSf.apiKey = body.siliconflowApiKey.trim();
    }
    if (typeof body.siliconflowBaseUrl === "string" && body.siliconflowBaseUrl.trim()) {
      nextSf.baseUrl = body.siliconflowBaseUrl.trim().replace(/\/+$/, "");
    }
    setSetting("provider_siliconflow", nextSf);
  }

  // DeepSeek
  if (typeof body.deepseekApiKey === "string" || body.deepseekClearKey || typeof body.deepseekBaseUrl === "string") {
    const curDs = getSetting<Partial<ProviderSettings>>("provider_deepseek", {});
    const nextDs: Partial<ProviderSettings> = { ...curDs };
    if (body.deepseekClearKey) nextDs.apiKey = "";
    else if (body.deepseekApiKey && body.deepseekApiKey.trim() && !body.deepseekApiKey.includes("••••")) {
      nextDs.apiKey = body.deepseekApiKey.trim();
    }
    if (typeof body.deepseekBaseUrl === "string" && body.deepseekBaseUrl.trim()) {
      nextDs.baseUrl = body.deepseekBaseUrl.trim().replace(/\/+$/, "");
    }
    setSetting("provider_deepseek", nextDs);
  }

  // OpenRouter
  if (typeof body.openrouterApiKey === "string" || body.openrouterClearKey || typeof body.openrouterBaseUrl === "string") {
    const curOr = getSetting<Partial<ProviderSettings>>("provider_openrouter", {});
    const nextOr: Partial<ProviderSettings> = { ...curOr };
    if (body.openrouterClearKey) nextOr.apiKey = "";
    else if (body.openrouterApiKey && body.openrouterApiKey.trim() && !body.openrouterApiKey.includes("••••")) {
      nextOr.apiKey = body.openrouterApiKey.trim();
    }
    if (typeof body.openrouterBaseUrl === "string" && body.openrouterBaseUrl.trim()) {
      nextOr.baseUrl = body.openrouterBaseUrl.trim().replace(/\/+$/, "");
    }
    setSetting("provider_openrouter", nextOr);
  }

  // Groq
  if (typeof body.groqApiKey === "string" || body.groqClearKey || typeof body.groqBaseUrl === "string") {
    const curGroq = getSetting<Partial<ProviderSettings>>("provider_groq", {});
    const nextGroq: Partial<ProviderSettings> = { ...curGroq };
    if (body.groqClearKey) nextGroq.apiKey = "";
    else if (body.groqApiKey && body.groqApiKey.trim() && !body.groqApiKey.includes("••••")) {
      nextGroq.apiKey = body.groqApiKey.trim();
    }
    if (typeof body.groqBaseUrl === "string" && body.groqBaseUrl.trim()) {
      nextGroq.baseUrl = body.groqBaseUrl.trim().replace(/\/+$/, "");
    }
    setSetting("provider_groq", nextGroq);
  }

  // Custom Gateways List
  if (Array.isArray(body.customProviders)) {
    const curCustom = getSetting<Array<{ id: string; name: string; baseUrl: string; apiKey: string; icon?: string }>>(
      "custom_providers",
      [],
    );
    const existingMap = new Map(curCustom.map((c) => [c.id, c]));

    const nextCustom = body.customProviders.map((c) => {
      const existing = existingMap.get(c.id);
      let apiKey = c.apiKey?.trim() || "";
      if (apiKey.includes("••••") && existing) {
        apiKey = existing.apiKey;
      }
      return {
        id: c.id,
        name: c.name || "Cổng Tùy Chỉnh",
        baseUrl: (c.baseUrl || "").trim().replace(/\/+$/, ""),
        apiKey,
        icon: c.icon || "⚙️",
      };
    });
    setSetting("custom_providers", nextCustom);
  }

  return NextResponse.json({ ok: true });
}
