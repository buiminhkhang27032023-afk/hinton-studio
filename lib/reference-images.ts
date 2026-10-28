import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getSetting, setSetting } from "./db";
import { getProvider } from "./provider";
import { hasPublicBase, toProviderUrl } from "./public-url";
import { localUrlToDataUri, resolveLocalAssetPath } from "./storage";

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

    // 2. High-speed Tencent Cloud CDN via RunningHub
    try {
      urls.push(await uploadToRunningHub(source));
      continue;
    } catch (rhErr) {
      console.warn("RunningHub upload fallback failed:", rhErr);
    }

    // 3. Fallback: upload to PiAPI for a temporary public URL.
    urls.push(await uploadToPiApi(source));
  }

  return urls;
}

export async function prepareReferenceMedia(source: string): Promise<string> {
  if (!source) return "";
  if (/^https:\/\//i.test(source)) return source;
  if (hasPublicBase()) {
    const publicUrl = toProviderUrl(source);
    if (/^https:\/\//i.test(publicUrl) && !publicUrl.includes("localhost")) {
      return publicUrl;
    }
  }
  return await uploadToRunningHub(source);
}

export async function uploadToRunningHub(source: string): Promise<string> {
  let bytes: Buffer;
  let mime = "image/jpeg";
  let ext = "jpg";

  if (source.startsWith("/api/files/")) {
    const fullPath = resolveLocalAssetPath(source);
    if (!fullPath || !fs.existsSync(fullPath)) throw new Error("Không tìm thấy tệp trong thư viện.");
    bytes = fs.readFileSync(fullPath);
    const extname = path.extname(fullPath).slice(1).toLowerCase();
    if (extname === "mp4") mime = "video/mp4";
    else if (extname === "webm") mime = "video/webm";
    else if (extname === "mov") mime = "video/quicktime";
    else if (extname === "png") mime = "image/png";
    else if (extname === "webp") mime = "image/webp";
    else if (extname === "gif") mime = "image/gif";
    else mime = "image/jpeg";
    ext = extname || "jpg";
  } else if (source.startsWith("data:")) {
    const commaIdx = source.indexOf(",");
    if (commaIdx === -1) throw new Error("Dữ liệu tệp không hợp lệ.");
    const prefix = source.slice(0, commaIdx);
    const base64Data = source.slice(commaIdx + 1);
    const mimeMatch = /^data:([^;,]+)/i.exec(prefix);
    mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    ext = mime.includes("png") ? "png" : mime.includes("mp4") ? "mp4" : mime.includes("webp") ? "webp" : "jpg";
    bytes = Buffer.from(base64Data, "base64");
  } else if (/^https?:\/\//i.test(source)) {
    return source;
  } else {
    throw new Error("Định dạng tệp không hợp lệ.");
  }

  const provider = getProvider("runninghub");
  if (!provider.apiKey) throw new Error("Thiếu key RunningHub.");

  const hash = createHash("sha256").update(bytes).digest("hex");
  const cacheKey = `rh_upload:${hash}`;
  const cached = getSetting<{ url: string; expires: number } | null>(cacheKey, null);
  if (cached && cached.expires > Date.now()) return cached.url;

  const formData = new FormData();
  const blob = new Blob([bytes as unknown as BlobPart], { type: mime });
  formData.append("file", blob, `ref-${hash.slice(0, 16)}.${ext}`);

  const response = await fetch("https://www.runninghub.cn/openapi/v2/media/upload/binary", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      Host: "www.runninghub.cn",
    },
    body: formData,
    signal: AbortSignal.timeout(120_000),
  });

  const payload = (await response.json()) as {
    code?: number;
    data?: { download_url?: string };
    msg?: string;
  };

  if (!response.ok || payload.code !== 0 || !payload.data?.download_url?.startsWith("https://")) {
    throw new Error(`RunningHub upload thất bại: ${payload.msg ?? response.statusText}`);
  }

  const url = payload.data.download_url;
  setSetting(cacheKey, { url, expires: Date.now() + 23 * 60 * 60 * 1000 });
  return url;
}

async function uploadToPiApi(source: string): Promise<string> {
  const inline = localUrlToDataUri(source);
  if (!inline.startsWith("data:image/")) throw new Error("Không đọc được ảnh từ thư viện.");
  const commaIdx = inline.indexOf(",");
  if (commaIdx === -1) throw new Error("Dữ liệu ảnh không hợp lệ.");

  const prefix = inline.slice(0, commaIdx);
  const base64Data = inline.slice(commaIdx + 1);
  const mimeMatch = /^data:(image\/(png|jpeg|webp|gif))/i.exec(prefix);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const bytes = Buffer.from(base64Data, "base64");
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
      file_name: `reference-${hash.slice(0, 16)}.${ext}`,
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