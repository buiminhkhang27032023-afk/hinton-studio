import { getDb } from "./db";
import { getJob, getJobRecovery, setJobRecovery, updateJob } from "./jobs";
import { getProvider } from "./provider";
import { persistRemoteAsset, saveAsset } from "./storage";
import { videoTaskResult, validateVideoBytes } from "./video-task";
import { getGraph, saveGraph } from "./projects";
import { fetchProviderFile } from "./provider-download";
import type { Asset } from "./types";

const active = new Map<string, Promise<unknown>>();

/** Explicit recovery only. This function never calls a model creation endpoint. */
export function recoverJob(id: string): Promise<unknown> {
  const current = active.get(id);
  if (current) return current;
  const promise = recover(id).finally(() => active.delete(id));
  active.set(id, promise);
  return promise;
}

function attach(id: string, asset: Asset) {
  const job = getJob(id)!;
  updateJob(id, { status: "succeeded", output: asset, error: null });
  const recovery = getJobRecovery(id);
  setJobRecovery(id, { providerId: recovery?.providerId, baseUrl: recovery?.baseUrl, phase: "finished" });
  if (job.projectId && job.nodeId) {
    const graph = getGraph(job.projectId);
    const node = (graph.nodes as { id: string; data?: Record<string, unknown> }[]).find((n) => n.id === job.nodeId);
    if (node) {
      node.data = { ...node.data, status: "done", error: null, result: asset,
        ...(asset.kind === "video" ? { videoUrl: asset.url } : { imageUrl: asset.url }) };
      saveGraph(job.projectId, graph);
    }
  }
  return { status: "succeeded", jobId: id, output: asset };
}

async function recover(id: string) {
  const job = getJob(id);
  if (!job) throw new Error("Không tìm thấy tác vụ trong máy.");
  if (job.status === "succeeded" && job.output) return { status: "succeeded", jobId: id, output: job.output };
  const recovery = getJobRecovery(id);
  if (job.status === "running" && job.updatedAt > Date.now() - 30_000) {
    return { status: "running", jobId: id, error: "Ứng dụng đang xử lý tác vụ này. Chờ rồi kiểm tra lại, không tạo mới." };
  }
  const persist = async (source: string, mime = "video/mp4") => {
    const name = recovery?.name ?? `Recovered ${job.providerJob ?? job.id}`;
    const originBase = recovery?.baseUrl ?? getProvider("iooai").baseUrl;
    if (/^https?:\/\//i.test(source) && recovery?.providerId === "iooai" && new URL(source).origin === new URL(originBase).origin) {
      const provider = getProvider("iooai");
      const file = await fetchProviderFile(source, originBase, provider.apiKey);
      if (!file.ok) throw new Error(`Tải tác vụ cũ lỗi HTTP ${file.status}; mã tác vụ vẫn được giữ lại.`);
      const buffer = Buffer.from(await file.arrayBuffer());
      const contentType = file.headers.get("content-type") ?? mime;
      validateVideoBytes(buffer, contentType);
      return attach(id, saveAsset({ projectId: job.projectId, name, buffer,
        mime: contentType.startsWith("video/") ? contentType.split(";")[0] : mime,
        meta: { model: job.model, jobId: id, providerJob: job.providerJob, recovered: true } }));
    }
    const asset = await persistRemoteAsset({ projectId: job.projectId, name, source, fallbackMime: mime,
      meta: { model: job.model, jobId: job.id, providerJob: job.providerJob, recovered: true } });
    return attach(id, asset);
  };
  // A completed generation with a failed download must not be generated again.
  if (recovery?.source) return persist(recovery.source, recovery.mime);
  if (!job.providerJob || !/^[\w-]+$/.test(job.providerJob)) {
    throw new Error("Thiếu mã tác vụ nhà cung cấp. Cần đối chiếu lịch sử IOOAI; không tự gửi lại lệnh tạo.");
  }
  const isIooai = recovery?.providerId === "iooai" || job.model.startsWith("iooai:") || job.model === "seedance2.0 线路二";
  if (!isIooai) throw new Error("Chỉ hỗ trợ kiểm tra mã IOOAI ở đây. Không gửi lại tác vụ của nguồn khác.");
  const provider = getProvider("iooai");
  if (!provider.apiKey) throw new Error("Thiếu khóa IOOAI để tra cứu tác vụ cũ.");
  const base = (recovery?.baseUrl ?? provider.baseUrl).replace(/\/+$/, "");
  const headers = { Authorization: `Bearer ${provider.apiKey}`, Accept: "application/json" };
  const response = await fetch(`${base}/videos/${job.providerJob}`, { headers, signal: AbortSignal.timeout(30_000), cache: "no-store" });
  if (!response.ok) throw new Error(`Tra cứu tác vụ cũ lỗi HTTP ${response.status}. Không gửi lệnh tạo mới.`);
  const info = await response.json() as Record<string, unknown>;
  const result = videoTaskResult(info);
  if (result.failed) {
    updateJob(id, { status: "failed", error: `Tác vụ thất bại: ${result.detail}. Chưa xác nhận hoàn tiền.` });
    return { status: "failed", jobId: id, error: result.detail };
  }
  if (!result.ready) {
    updateJob(id, { status: "pending", error: `Trạng thái nhà cung cấp: ${result.status || "chưa rõ"}. Chưa có file sẵn sàng; không tạo lại.` });
    return { status: "pending", jobId: id, providerStatus: result.status };
  }
  // Repeated recovery for the same provider task must reuse an existing asset.
  const found = getDb().prepare("SELECT id, url FROM assets WHERE project_id IS ? AND json_valid(meta) AND json_extract(meta, '$.providerJob') = ? LIMIT 1")
    .get(job.projectId, job.providerJob) as { id: string; url: string } | undefined;
  if (found) {
    const { getAsset } = await import("./storage");
    return attach(id, getAsset(found.id)!);
  }
  const source = result.source ?? `${base}/videos/${job.providerJob}/content`;
  const sourceUrl = new URL(source);
  if (!["http:", "https:"].includes(sourceUrl.protocol)) throw new Error("Đường dẫn kết quả không hợp lệ.");
  // Never leak the key to a result CDN or to a redirect destination.
  if (sourceUrl.origin !== new URL(base).origin) {
    setJobRecovery(id, { ...recovery, providerId: "iooai", baseUrl: base, phase: "downloading", source, mime: "video/mp4" });
    return persist(source);
  }
  const file = await fetchProviderFile(source, base, provider.apiKey);
  if (!file.ok) throw new Error(`Tải tác vụ cũ lỗi HTTP ${file.status}; mã tác vụ vẫn được giữ lại.`);
  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = file.headers.get("content-type") ?? "video/mp4";
  validateVideoBytes(buffer, mime);
  const asset = saveAsset({ projectId: job.projectId, name: recovery?.name ?? `Recovered ${job.providerJob}`,
    buffer, mime: mime.startsWith("video/") ? mime.split(";")[0] : "video/mp4",
    meta: { model: job.model, jobId: id, providerJob: job.providerJob, recovered: true } });
  return attach(id, asset);
}
