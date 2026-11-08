with open(r'd:\phim ai thời trang\app\api\settings\route.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Add MUSE_PROVIDER import
code = code.replace(
    '  BAILIAN_PROVIDER,',
    '  BAILIAN_PROVIDER,\r\n  MUSE_PROVIDER,'
).replace(
    '  BAILIAN_PROVIDER,\n',
    '  BAILIAN_PROVIDER,\r\n  MUSE_PROVIDER,\r\n'
)

# Add const muse = getProvider("muse");
code = code.replace(
    '  const bailian = getProvider("bailian");',
    '  const bailian = getProvider("bailian");\r\n  const muse = getProvider("muse");'
)

# Add muse to GET response
muse_entry = '''    muse: {
      baseUrl: muse.baseUrl || "https://api.musetalk.ai/v1",
      apiKey: muse.apiKey ? `••••${muse.apiKey.slice(-4)}` : "",
      hasKey: Boolean(muse.apiKey),
    },'''
code = code.replace(
    '    bailian: {',
    muse_entry + '\r\n    bailian: {'
)

# Add interface types
code = code.replace(
    '    bailianApiKey?: string;',
    '    museApiKey?: string;\r\n    museBaseUrl?: string;\r\n    museClearKey?: boolean;\r\n    bailianApiKey?: string;'
)

# Add handler in PUT
muse_put = '''  // Muse AI Gateway
  if (typeof body.museApiKey === "string" || body.museClearKey || typeof body.museBaseUrl === "string") {
    const curMuse = getSetting<Partial<ProviderSettings>>("provider_muse", {});
    const nextMuse: Partial<ProviderSettings> = { ...curMuse };
    if (body.museClearKey) nextMuse.apiKey = "";
    else if (body.museApiKey && body.museApiKey.trim() && !body.museApiKey.includes("••••")) {
      nextMuse.apiKey = body.museApiKey.trim();
    }
    if (typeof body.museBaseUrl === "string" && body.museBaseUrl.trim()) {
      nextMuse.baseUrl = body.museBaseUrl.trim().replace(/\\/+$/, "");
    }
    setSetting("provider_muse", nextMuse);
  }
'''

code = code.replace(
    '  // Alibaba Bailian',
    muse_put + '\r\n  // Alibaba Bailian'
)

with open(r'd:\phim ai thời trang\app\api\settings\route.ts', 'w', encoding='utf-8', newline='') as f:
    f.write(code)

print("Updated app/api/settings/route.ts with Muse!")
