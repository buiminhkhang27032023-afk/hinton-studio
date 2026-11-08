import os

# 1. Patch lib/provider.ts
with open('d:/phim ai thời trang/lib/provider.ts', 'r', encoding='utf-8') as f:
    c = f.read()

eleven_def = """export const ELEVENLABS_PROVIDER: ProviderSettings = {
  baseUrl: "https://api.elevenlabs.io/v1",
  apiKey: "",
  proxyAssets: true,
  authHeader: "x-api-key",
};
"""

if 'ELEVENLABS_PROVIDER' not in c:
    c = c.replace('export const AUTODL_PROVIDER:', eleven_def + '\nexport const AUTODL_PROVIDER:')
    c = c.replace('  muse: { key: "provider_muse", fallback: MUSE_PROVIDER },', '  muse: { key: "provider_muse", fallback: MUSE_PROVIDER },\n  elevenlabs: { key: "provider_elevenlabs", fallback: ELEVENLABS_PROVIDER },')
    
    old_get = '''export function getProvider(id: string = "openai-compatible"): ProviderSettings {
  const normId = (id || "openai-compatible").toLowerCase();
  const entry = PROVIDER_SETTING_KEY[normId];'''

    new_get = '''export function getProvider(id: string = "openai-compatible"): ProviderSettings {
  const normId = (id || "openai-compatible").toLowerCase();
  if (normId === "elevenlabs") {
    const prov = { ...ELEVENLABS_PROVIDER, ...getSetting<Partial<ProviderSettings>>("provider_elevenlabs", {}) };
    if (!prov.apiKey) {
      prov.apiKey = getSetting<string>("elevenlabs_api_key", "") || process.env.ELEVENLABS_API_KEY || "";
    }
    return prov;
  }
  const entry = PROVIDER_SETTING_KEY[normId];'''
    c = c.replace(old_get, new_get)

    with open('d:/phim ai thời trang/lib/provider.ts', 'w', encoding='utf-8') as f:
        f.write(c)
    print('lib/provider.ts patched')
else:
    print('lib/provider.ts already has ELEVENLABS_PROVIDER')

# 2. Patch app/api/settings/test-gateway/route.ts
with open('d:/phim ai thời trang/app/api/settings/test-gateway/route.ts', 'r', encoding='utf-8') as f:
    tg = f.read()

eleven_test = """    const isElevenLabs = body.providerId === "elevenlabs" || baseUrl.includes("elevenlabs");

    if (isElevenLabs) {
      try {
        const testRes = await fetch("https://api.elevenlabs.io/v1/user", {
          method: "GET",
          headers: {
            "xi-api-key": apiKey,
          },
          signal: AbortSignal.timeout(10000),
        });
        const data = await testRes.json().catch(() => ({}));
        if (testRes.ok) {
          const charCount = data.subscription?.character_count ?? 0;
          const charLimit = data.subscription?.character_limit ?? 0;
          const tier = data.subscription?.tier || "active";
          return NextResponse.json({
            ok: true,
            status: 200,
            message: `Kết nối ElevenLabs thành công! Gói: ${tier.toUpperCase()} • Đã dùng: ${charCount}/${charLimit} ký tự. Sẵn sàng lồng tiếng Multilingual v2 & SFX!`,
            account: data,
          });
        }
        return NextResponse.json({
          ok: false,
          error: `ElevenLabs báo lỗi (${testRes.status}): ${data.detail?.message || data.detail?.status || JSON.stringify(data.detail) || "Khóa API không hợp lệ hoặc đã hết hạn."}`,
        });
      } catch (err: unknown) {
        return NextResponse.json({
          ok: false,
          error: `Không thể kết nối đến ElevenLabs: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }
"""

if 'const isElevenLabs' not in tg:
    target = '    const isRunningHub = body.providerId === "runninghub" || baseUrl.includes("runninghub");'
    tg = tg.replace(target, target + '\n' + eleven_test)
    with open('d:/phim ai thời trang/app/api/settings/test-gateway/route.ts', 'w', encoding='utf-8') as f:
        f.write(tg)
    print('app/api/settings/test-gateway/route.ts patched')
else:
    print('test-gateway already has isElevenLabs')

# 3. Patch components/canvas/api-gateways-modal.tsx
with open('d:/phim ai thời trang/components/canvas/api-gateways-modal.tsx', 'r', encoding='utf-8') as f:
    mod = f.read()

if 'elevenlabs: {' not in mod:
    target_map = """        autodl: {
          baseUrl: data.autodl?.baseUrl || "https://uXXXX-8188.westc.gpuhub.com",
          apiKey: data.autodl?.apiKey || "autodl",
          hasKey: data.autodl?.hasKey || false,
        },"""
    rep_map = target_map + """\n        elevenlabs: {
          baseUrl: "https://api.elevenlabs.io/v1",
          apiKey: data.elevenlabs?.apiKey || (data.elevenlabsApiKey ? (data.elevenlabsApiKey.startsWith("••••") ? data.elevenlabsApiKey : `••••${data.elevenlabsApiKey.slice(-4)}`) : (data.hasElevenLabsKey ? "••••••••" : "")),
          hasKey: data.hasElevenLabsKey || Boolean(data.elevenlabsApiKey) || false,
        },"""
    mod = mod.replace(target_map, rep_map)

if 'payload.elevenlabsApiKey' not in mod:
    target_save = """      } else if (currentConfig.id === "autodl") {
        payload.autodlBaseUrl = currentConfig.baseUrl;
        if (!currentConfig.apiKey.includes("••••")) payload.autodlApiKey = currentConfig.apiKey;"""
    rep_save = target_save + """\n      } else if (currentConfig.id === "elevenlabs") {
        if (!currentConfig.apiKey.includes("••••")) {
          payload.elevenlabsApiKey = currentConfig.apiKey;
        }"""
    mod = mod.replace(target_save, rep_save)

with open('d:/phim ai thời trang/components/canvas/api-gateways-modal.tsx', 'w', encoding='utf-8') as f:
    mod = f.write(mod)
print('api-gateways-modal.tsx patched')

# 4. Patch app/api/settings/route.ts
with open('d:/phim ai thời trang/app/api/settings/route.ts', 'r', encoding='utf-8') as f:
    sett = f.read()

# Make sure GET returns elevenlabs config object as well
if 'elevenlabs: {' not in sett:
    target_get = """    autodl: {
      baseUrl: autodl.baseUrl,
      apiKey: autodl.apiKey ? `••••${autodl.apiKey.slice(-4)}` : "",
      hasKey: Boolean(autodl.apiKey),
    },"""
    rep_get = target_get + """\n    elevenlabs: {
      baseUrl: "https://api.elevenlabs.io/v1",
      apiKey: (getSetting<string>("elevenlabs_api_key", "") || process.env.ELEVENLABS_API_KEY || "") ? `••••${(getSetting<string>("elevenlabs_api_key", "") || process.env.ELEVENLABS_API_KEY || "").slice(-4)}` : "",
      hasKey: Boolean(getSetting<string>("elevenlabs_api_key", "") || process.env.ELEVENLABS_API_KEY),
    },"""
    sett = sett.replace(target_get, rep_get)

# In PUT, guard against ••••
old_put_eleven = """  // ElevenLabs API Key
  if (typeof body.elevenlabsApiKey === "string") {
    if (body.elevenlabsApiKey.trim()) {
      setSetting("elevenlabs_api_key", body.elevenlabsApiKey.trim());
    } else {
      setSetting("elevenlabs_api_key", "");
    }
  }"""

new_put_eleven = """  // ElevenLabs API Key
  if (typeof body.elevenlabsApiKey === "string" && !body.elevenlabsApiKey.includes("••••")) {
    const trimmed = body.elevenlabsApiKey.trim();
    setSetting("elevenlabs_api_key", trimmed);
    setSetting("provider_elevenlabs", {
      ...getSetting<Partial<ProviderSettings>>("provider_elevenlabs", {}),
      baseUrl: "https://api.elevenlabs.io/v1",
      apiKey: trimmed,
      authHeader: "x-api-key",
    });
  }"""
sett = sett.replace(old_put_eleven, new_put_eleven)

with open('d:/phim ai thời trang/app/api/settings/route.ts', 'w', encoding='utf-8') as f:
    f.write(sett)
print('settings route.ts patched')
