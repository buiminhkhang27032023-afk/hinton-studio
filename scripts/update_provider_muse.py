with open(r'd:\phim ai thời trang\lib\provider.ts', 'r', encoding='utf-8') as f:
    content = f.read()

muse_provider_def = '''export const MUSE_PROVIDER: ProviderSettings = {
  baseUrl: "https://api.musetalk.ai/v1",
  apiKey: "",
  proxyAssets: true,
  authHeader: "bearer",
};

export const BAILIAN_PROVIDER: ProviderSettings = {'''

content = content.replace('export const BAILIAN_PROVIDER: ProviderSettings = {', muse_provider_def)

content = content.replace(
    '  autodl: { key: "provider_autodl", fallback: AUTODL_PROVIDER },',
    '  autodl: { key: "provider_autodl", fallback: AUTODL_PROVIDER },\r\n  muse: { key: "provider_muse", fallback: MUSE_PROVIDER },'
)

content = content.replace(
    'input.providerId === "duomiapi"',
    'input.providerId === "muse"\r\n        ? "Cài đặt → Cổng Muse AI"\r\n        : input.providerId === "duomiapi"'
)

with open(r'd:\phim ai thời trang\lib\provider.ts', 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("Updated provider.ts for Muse successfully!")
