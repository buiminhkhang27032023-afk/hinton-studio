import { createHash } from "node:crypto";
import { getSetting, setSetting } from "./db";
import { getProvider } from "./provider";
import { localUrlToDataUri } from "./storage";

// User-authorized staging on the connected PiAPI account; files expire after 24h.
export async function prepareReferenceImages(sources: unknown[]): Promise<string[]> {
  if (!sources.length || sources.length > 7) throw new Error("Cần 1–7 ảnh tham chiếu.");
  const urls: string[] = [];
  for (const source of sources) {
    if (typeof source !== "string") throw new Error("Ảnh tham chiếu không hợp lệ.");
    if (source.startsWith("https://")) { urls.push(source); continue; }
    const inline = localUrlToDataUri(source);
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(inline);
    if (!match) throw new Error("Không đọc được ảnh PNG/JPEG/WebP từ thư viện.");
    const bytes = Buffer.from(match[2], "base64");
    if (bytes.length > 7 * 1024 * 1024) throw new Error("Ảnh tham chiếu phải nhỏ hơn 7 MB.");
    const provider = getProvider("piapi");
    if (!provider.apiKey) throw new Error("Thiếu key PiAPI để upload ảnh tạm.");
    const hash = createHash("sha256").update(provider.apiKey).update(bytes).digest("hex");
    const cacheKey = `reference_upload:${hash}`;
    const cached = getSetting<{ url: string; expires: number } | null>(cacheKey, null);
    if (cached && cached.expires > Date.now()) { urls.push(cached.url); continue; }
    const response = await fetch("https://upload.theapi.app/api/ephemeral_resource", {
      method: "POST", headers: { "Content-Type": "application/json", "x-api-key": provider.apiKey },
      body: JSON.stringify({ file_name: `reference-${hash.slice(0, 16)}.${match[1] === "jpeg" ? "jpg" : match[1]}`, file_data: inline }),
      signal: AbortSignal.timeout(120_000),
    });
    const payload = await response.json() as { code?: number; data?: { url?: string }; message?: string };
    if (!response.ok || (payload.code != null && payload.code !== 200) || !payload.data?.url?.startsWith("https://")) {
      if (response.status === 403 || payload.code === 403) throw new Error("Tài khoản PiAPI chưa có quyền upload ảnh tạm (cần Creator/Pro). Chưa gửi yêu cầu tạo video IOOAI.");
      throw new Error(`Upload ảnh thất bại (HTTP ${response.status}): ${payload.message ?? "không có URL"}`);
    }
    setSetting(cacheKey, { url: payload.data.url, expires: Date.now() + 23 * 60 * 60 * 1000 });
    urls.push(payload.data.url);
  }
  return urls;
}
