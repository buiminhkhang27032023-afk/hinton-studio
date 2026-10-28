import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { ASSET_DIR } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ project: string; file: string }> },
) {
  const { project, file } = await params;
  const safeProject = project.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeFile = path.basename(file);
  const full = path.join(ASSET_DIR, safeProject, safeFile);

  if (!full.startsWith(ASSET_DIR) || !fs.existsSync(full)) {
    return new Response("Không tìm thấy file", { status: 404 });
  }

  const ext = safeFile.split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME[ext] ?? "application/octet-stream";
  const stat = fs.statSync(full);
  const fileSize = stat.size;
  const etag = `"${fileSize.toString(36)}-${Math.floor(stat.mtimeMs).toString(36)}"`;
  // Cache in the browser: switching pages no longer re-downloads every image/video.
  const cacheHeaders = {
    "Cache-Control": "private, max-age=604800",
    ETag: etag,
    "Last-Modified": stat.mtime.toUTCString(),
    "Accept-Ranges": "bytes",
    "Content-Type": contentType,
  };

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: cacheHeaders });
  }

  // Always stream from disk (never readFileSync): a multi-hundred-MB video read
  // synchronously blocked the whole Node process and froze every other request.
  const stream = (start: number, end: number) =>
    Readable.toWeb(fs.createReadStream(full, { start, end, highWaterMark: 1 << 20 })) as ReadableStream;

  const range = request.headers.get("range");
  if (range) {
    const [rawStart, rawEnd] = range.replace(/bytes=/, "").split("-");
    let start = parseInt(rawStart, 10);
    let end = rawEnd ? parseInt(rawEnd, 10) : fileSize - 1;
    if (isNaN(start)) {
      // suffix range: bytes=-N
      const n = parseInt(rawEnd, 10);
      start = Math.max(0, fileSize - n);
      end = fileSize - 1;
    }
    end = Math.min(end, fileSize - 1);
    if (isNaN(end) || start >= fileSize || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${fileSize}` } });
    }
    return new Response(stream(start, end), {
      status: 206,
      headers: {
        ...cacheHeaders,
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  return new Response(fileSize ? stream(0, fileSize - 1) : null, {
    headers: { ...cacheHeaders, "Content-Length": String(fileSize) },
  });
}
