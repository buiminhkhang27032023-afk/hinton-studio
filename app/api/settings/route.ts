import { NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";
import { DEFAULT_PROVIDER, PIAPI_PROVIDER, getProvider } from "@/lib/provider";
import type { ProviderSettings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const provider = getProvider();
  const iooai = getProvider("iooai");
  const piapi = getProvider("piapi");
  return NextResponse.json({
    ...provider,
    // Never ship the raw key back to the browser; the UI only needs to know if one is set.
    apiKey: provider.apiKey ? `••••${provider.apiKey.slice(-4)}` : "",
    hasKey: Boolean(provider.apiKey),
    baseUrlDefault: DEFAULT_PROVIDER.baseUrl,
    language: getSetting("language", "vi"),
    iooai: { baseUrl: iooai.baseUrl, apiKey: iooai.apiKey ? `••••${iooai.apiKey.slice(-4)}` : "", hasKey: Boolean(iooai.apiKey) },
    piapi: {
      baseUrl: piapi.baseUrl,
      baseUrlDefault: PIAPI_PROVIDER.baseUrl,
      apiKey: piapi.apiKey ? `••••${piapi.apiKey.slice(-4)}` : "",
      hasKey: Boolean(piapi.apiKey),
    },
  });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as Partial<ProviderSettings> & {
    language?: string;
    iooaiApiKey?: string;
    piapiApiKey?: string;
    piapiClearKey?: boolean;
  };
  const current = getSetting<Partial<ProviderSettings>>("provider", {});

  const next: Partial<ProviderSettings> = { ...current };
  if (typeof body.baseUrl === "string" && body.baseUrl.trim()) {
    next.baseUrl = body.baseUrl.trim().replace(/\/+$/, "");
  }
  // An empty key means "keep what is stored"; the UI sends "" when untouched.
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

  // PiAPI key is stored as-is, with no connection test — the caller asked to skip that.
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

  if (typeof body.iooaiApiKey === "string" && body.iooaiApiKey.trim() && !body.iooaiApiKey.includes("••••")) {
    setSetting("provider_iooai", { ...getSetting<Partial<ProviderSettings>>("provider_iooai", {}), apiKey: body.iooaiApiKey.trim() });
  }
  return NextResponse.json({ ok: true });
}
