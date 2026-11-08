"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { Asset, JobRecord } from "@/lib/types";
import { useStudio } from "@/lib/studio-store";

export function JobRecoveryPanel({ nodeId, onRecovered }: { nodeId: string; onRecovered: (asset: Asset) => void }) {
  const projectId = useStudio((state) => state.project?.id);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let valid = true;
    setJobs([]);
    setMessage("");
    if (projectId) api.jobs.list(projectId).then((all) => {
      if (valid) setJobs(all.filter((job) => job.nodeId === nodeId));
    }).catch(() => { if (valid) setMessage("Không đọc được lịch sử trong máy."); });
    return () => { valid = false; };
  }, [nodeId, projectId]);

  const recover = async (id: string) => {
    if (busy) return;
    setBusy(id);
    setMessage("Đang tra cứu tác vụ cũ; không gửi lệnh tạo mới…");
    try {
      const result = await api.jobs.recover(id);
      if (result.output) {
        onRecovered(result.output);
        setMessage("Đã lấy lại kết quả từ tác vụ cũ.");
      } else {
        setMessage(result.error ?? `Chưa có file sẵn sàng (${result.providerStatus ?? result.status}). Không tạo lại.`);
      }
      if (projectId) setJobs((await api.jobs.list(projectId)).filter((job) => job.nodeId === nodeId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không lấy được kết quả cũ.");
    } finally {
      setBusy(null);
    }
  };
  if (!jobs.length && !message) return null;
  return <div className="mb-3 rounded-xl border border-ink-700 p-3 text-[12px]">
    <p className="font-medium text-ink-200">Các yêu cầu đã gửi</p>
    <p className="mt-1 text-ink-500">Kiểm tra theo mã cũ, không tạo video mới. Trạng thái không xác nhận số tiền đã trừ hoặc hoàn.</p>
    {jobs.map((job) => <div key={job.id} className="mt-3 border-t border-ink-700 pt-2">
      <div className="break-words text-ink-300">{job.model}</div>
      <div className="text-ink-500">{new Date(job.createdAt).toLocaleString("vi-VN")} · {job.status === "pending" ? "Chưa xác nhận kết quả" : job.status === "running" ? "Đang chờ kết quả" : job.status === "failed" ? "Có lỗi" : job.status === "succeeded" ? "Đã lưu kết quả" : "Đang chuẩn bị"}</div>
      {job.providerJob && <div className="break-all text-[10px] text-ink-500">{job.providerJob}</div>}
      {job.error && <p className="mt-1 break-words text-amber-300">{job.error}</p>}
      {job.status !== "succeeded" && <button type="button" disabled={Boolean(busy)} onClick={() => recover(job.id)} className="mt-2 rounded-lg border border-ink-600 px-2 py-1.5 text-ink-200 disabled:opacity-50">
        {busy === job.id ? "Đang kiểm tra…" : "Kiểm tra / tải kết quả cũ"}
      </button>}
    </div>)}
    {message && <p className="mt-3 break-words text-amber-300" role="status">{message}</p>}
  </div>;
}
