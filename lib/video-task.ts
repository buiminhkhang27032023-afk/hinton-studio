/** Shared across polling, recovery and offline tests. Does not submit anything. */
export function videoTaskResult(info: Record<string, unknown>) {
  const nested = info.data && typeof info.data === "object" ? info.data as Record<string, unknown> : {};
  const status = String(info.status ?? nested.status ?? "").toLowerCase();
  const done = ["completed", "succeeded", "success", "done"].includes(status);
  const failed = ["failed", "error", "cancelled", "canceled"].includes(status);
  const videos = Array.isArray(info.videos) ? info.videos : [];
  const results = Array.isArray(info.results) ? info.results : [];
  const source = [info.output_url, info.video_url, videos[0]?.url, results[0]?.url,
    nested.outputUrl, nested.output_url, nested.video_url, nested.url, info.url].find((v) => typeof v === "string" && v.length > 0) as string | undefined;
  const error = info.error;
  const detail = typeof error === "string" ? error
    : error && typeof error === "object" ? String((error as Record<string, unknown>).message ?? (error as Record<string, unknown>).code ?? "Lỗi nhà cung cấp")
    : String(info.errorMessage ?? status);
  return { status, done, failed, ready: done && info.download_ready !== false && nested.download_ready !== false, source, detail };
}

export function validateVideoBytes(buffer: Buffer, mime: string): void {
  if (buffer.length < 32) throw new Error("File video rỗng hoặc không hoàn chỉnh. Giữ mã tác vụ để tải lại.");
  const isMp4 = buffer.subarray(0, 256).includes(Buffer.from("ftyp"));
  const isWebm = buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if ((!isMp4 && !isWebm) || /(?:json|text\/|html)/i.test(mime)) {
    throw new Error("Đường dẫn kết quả chưa trả về file video hợp lệ. Không lưu trang lỗi thành MP4; giữ mã tác vụ để tải lại.");
  }
}
