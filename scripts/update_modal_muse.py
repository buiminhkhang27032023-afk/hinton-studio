with open(r'd:\phim ai thời trang\components\canvas\api-gateways-modal.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add to BUILTIN_GATEWAYS
muse_gw = '''  {
    id: "muse",
    name: "Muse AI Gateway (MuseTalk / MuseV / MuseVoice)",
    short: "Muse AI",
    icon: "🎭",
    badge: "MUSE",
    defaultUrl: "https://api.musetalk.ai/v1",
    docUrl: "https://github.com/TMElyralab/MuseTalk",
    description: "Cổng chuyên MuseTalk (đồng bộ khẩu hình môi thời gian thực), MuseV và Voice Clone tạo giọng nói.",
  },'''

code = code.replace(
    '  {\r\n    id: "bailian",',
    muse_gw + '\r\n  {\r\n    id: "bailian",'
).replace(
    '  {\n    id: "bailian",',
    muse_gw + '\r\n  {\r\n    id: "bailian",'
)

# 2. Add to gatewaysData mapping
muse_data_map = '''        muse: {
          baseUrl: data.muse?.baseUrl || "https://api.musetalk.ai/v1",
          apiKey: data.muse?.apiKey || "",
          hasKey: data.muse?.hasKey || false,
        },'''

code = code.replace(
    '        bailian: {',
    muse_data_map + '\r\n        bailian: {'
)

# 3. Add to handleSave
muse_save = '''      } else if (currentConfig.id === "muse") {
        payload.museBaseUrl = currentConfig.baseUrl;
        if (!currentConfig.apiKey.includes("••••")) payload.museApiKey = currentConfig.apiKey;'''

code = code.replace(
    '      } else if (currentConfig.id === "bailian") {',
    muse_save + '\r\n      } else if (currentConfig.id === "bailian") {'
)

with open(r'd:\phim ai thời trang\components\canvas\api-gateways-modal.tsx', 'w', encoding='utf-8', newline='') as f:
    f.write(code)

print("Updated api-gateways-modal.tsx with Muse!")
