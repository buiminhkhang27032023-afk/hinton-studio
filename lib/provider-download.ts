/** Follow signed-media redirects without forwarding the API key to a CDN. */
export async function fetchProviderFile(source: string, base: string, apiKey: string): Promise<Response> {
  let url = new URL(source);
  const trustedOrigin = new URL(base).origin;
  for (let hop = 0; hop < 6; hop++) {
    if (url.protocol !== "https:") throw new Error("Kết quả phải dùng HTTPS.");
    const response = await fetch(url.toString(), {
      headers: url.origin === trustedOrigin ? { Authorization: `Bearer ${apiKey}` } : {},
      redirect: "manual", signal: AbortSignal.timeout(180_000),
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location) throw new Error("Đường dẫn tải thiếu địa chỉ chuyển hướng.");
    await response.body?.cancel();
    url = new URL(location, url);
  }
  throw new Error("Đường dẫn tải chuyển hướng quá nhiều lần.");
}
