import { createHash } from "node:crypto";
import { getSetting, setSetting } from "./db";
import { getProvider } from "./provider";
import { hasPublicBase, toProviderUrl } from "./public-url";
import { localUrlToDataUri } from "./storage";

/**
 * Providers that generate video from reference images (IOOAI, PiAPI) refuse
 * localhost URLs — they need a public https URL. Two paths are supported:
 *
 *   1. A public base URL (Cloudflare tunnel / your own host) — we just rewrite
 *      the local path onto it. Preferred: no upload, no size limit.
 *   2. PiAPI's ephemeral upload endpoint, which works on paid plans.
 */

const UPLOAD_ENDPOINT = "https://upload.theapi.app/api/ephemeral_resource";

export async function prepareReferenceImages(sources: unknown[]): Promise<string[]> {
  if (!sources.length || sources.length > 7) {
    throw new Error("Cần 1–7 ảnh tham chiếu.");
  }

  const usingTunnel = hasPublicBase();
  const urls: string[] = [];

  for (const source of sources) {
    if (typeof source !== "string") throw new Error("Ảnh tham chiếu không hợp lệ.");

    // Already a public URL.
    if (/^https:\/\//i.test(source)) {
      urls.push(source);
      continue;
    }

    // Preferred path: serve the file through our own public base URL.
    if (usingTunnel) {
      const publicUrl = toProviderUrl(source);
      if (/^https:\/\//i.test(publicUrl) && !publicUrl.includes("localhost")) {
        urls.push(publicUrl);
        continue;
      }
    }

    // Fallback: upload to PiAPI for a temporary public URL.
    urls.push(await uploadToPiApi(source));
  }

  return urls;
}

async function uploadToPiApi(source: string): Promise<string> {
  const inline = localUrlToDataUri(source);
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(inline);
  if (!match) throw new Error("Không đọc được ảnh PNG/JPEG/WebP từ thư viện.");

  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > 7 * 1024 * 1024) throw new Error("Ảnh tham chiếu phải nhỏ hơn 7 MB.");

  const provider = getProvider("piapi");
  if (!provider.apiKey) throw new Error("Thiếu key PiAPI và chưa có URL công khai.");

  const hash = createHash("sha256").update(provider.apiKey).update(bytes).digest("hex");
  const cacheKey = `reference_upload:${hash}`;
  const cached = getSetting<{ url: string; expires: number } | null>(cacheKey, null);
  if (cached && cached.expires > Date.now()) return cached.url;

  const response = await fetch(UPLOAD_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": provider.apiKey },
    body: JSON.stringify({
      file_name: `reference-${hash.slice(0, 16)}.${match[1] === "jpeg" ? "jpg" : match[1]}`,
      file_data: inline,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  const payload = (await response.json()) as {
    code?: number;
    data?: { url?: string };
    message?: string;
  };

  if (!response.ok || (payload.code != null && payload.code !== 200) || !payload.data?.url?.startsWith("https://")) {
    if (response.status === 403 || payload.code === 403) {
      throw new Error(
        "Ảnh tham chiếu cần URL công khai. Bật Cloudflare Tunnel ở Cài đặt → Ảnh tham chiếu, hoặc nâng gói PiAPI lên Creator/Pro để upload ảnh tạm.",
      );
    }
    throw new Error(`Upload ảnh thất bại (HTTP ${response.status}): ${payload.message ?? "không có URL"}`);
  }

  setSetting(cacheKey, { url: payload.data.url, expires: Date.now() + 23 * 60 * 60 * 1000 });
  return payload.data.url;
}