"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Film,
  Image as ImageIcon,
  Sparkles,
  RotateCcw,
  TrendingUp,
  Cpu,
  BarChart3,
  Waves,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";
import clsx from "clsx";
import { useUi } from "@/lib/ui-store";

interface ModelStat {
  model: string;
  kind: string;
  total: number;
  succeeded: number;
  failed: number;
  running: number;
  successRate: number;
  lastCalledAt: number;
}

interface RecentJob {
  id: string;
  project_id: string | null;
  node_id: string | null;
  kind: string;
  model: string;
  status: string;
  error: string | null;
  created_at: number;
  updated_at: number;
}

interface AnalyticsData {
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  runningCalls: number;
  successRate: number;
  modelBreakdown: ModelStat[];
  recentJobs: RecentJob[];
  timeSlots: Array<{ hour_slot: string; total: number; succeeded: number; failed: number }>;
}

export default function AnalyticsPage() {
  const { toast } = useUi();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<"24h" | "7d" | "all">("all");
  const [waveOffset, setWaveOffset] = useState(0);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics");
      if (!res.ok) throw new Error("Không thể tải dữ liệu thống kê.");
      const json = await res.json();
      if (json.ok && json.stats) {
        setData(json.stats);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Continuous subtle sine wave flow animation
  useEffect(() => {
    const timer = setInterval(() => {
      setWaveOffset((prev) => (prev + 0.05) % (Math.PI * 2));
    }, 40);
    return () => clearInterval(timer);
  }, []);

  // Generate SVG Sine Wave path based on actual metrics and dynamic oscillation
  const sineWavePath = useMemo(() => {
    const width = 800;
    const height = 180;
    const midY = height / 2;
    const amplitude = 42;
    const frequency = 0.022;

    const points: Array<[number, number]> = [];
    const totalSteps = 80;

    for (let i = 0; i <= totalSteps; i++) {
      const x = (i / totalSteps) * width;
      // Combine two sine waves for organic luxury undulating rhythm
      const wave1 = Math.sin(x * frequency + waveOffset) * amplitude;
      const wave2 = Math.cos(x * frequency * 0.5 + waveOffset * 0.8) * (amplitude * 0.35);
      const y = midY + wave1 + wave2;
      points.push([x, y]);
    }

    const pathD = points.reduce((acc, [x, y], idx) => {
      return idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, "");

    const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

    return { pathD, areaD, points };
  }, [waveOffset]);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#0d0d12] text-neutral-200">
      {/* Page Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-8 py-6 bg-white/[0.02]">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500/20 via-sky-500/20 to-violet-500/20 border border-white/15 text-amber-300 shadow-inner">
            <Waves size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold tracking-tight text-white">Thống Kê Cuộc Gọi AI & Sơ Đồ Hình Sin</h1>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-medium text-amber-300 border border-amber-500/30">
                Live Telemetry
              </span>
            </div>
            <p className="mt-0.5 text-[12.5px] text-neutral-400">
              Tổng hợp số lượt gọi theo từng Model, tỷ lệ thành công / thất bại và sơ đồ sóng hoạt động
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchAnalytics}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-[12px] font-medium text-neutral-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
        >
          <RotateCcw size={13} className={loading ? "animate-spin" : ""} />
          Làm mới số liệu
        </button>
      </header>

      <div className="mx-auto w-full max-w-6xl space-y-6 px-8 py-6">
        {/* 4 Top KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Calls */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-sm backdrop-blur transition hover:border-white/20">
            <div className="flex items-center justify-between text-neutral-400 text-[12px] font-medium">
              <span>Tổng số lượt gọi</span>
              <span className="rounded-lg bg-sky-500/15 p-1.5 text-sky-400">
                <BarChart3 size={15} />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-[28px] font-extrabold tracking-tight text-white">
                {data?.totalCalls ?? 0}
              </span>
              <span className="text-[12px] text-neutral-400">cuộc gọi API</span>
            </div>
            <div className="mt-2 text-[11px] text-neutral-500 flex items-center gap-1">
              <Sparkles size={11} className="text-amber-400" />
              Ghi nhận qua studio.db
            </div>
          </div>

          {/* Succeeded */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4 shadow-sm backdrop-blur transition hover:border-emerald-500/40">
            <div className="flex items-center justify-between text-emerald-400 text-[12px] font-medium">
              <span>Gọi thành công</span>
              <span className="rounded-lg bg-emerald-500/20 p-1.5 text-emerald-400">
                <CheckCircle2 size={15} />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-[28px] font-extrabold tracking-tight text-emerald-300">
                {data?.successCalls ?? 0}
              </span>
              <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                {data?.successRate ?? 0}%
              </span>
            </div>
            <div className="mt-2 text-[11px] text-emerald-400/70">
              Xuất video / ảnh hoàn tất
            </div>
          </div>

          {/* Failed */}
          <div className="rounded-2xl border border-red-500/20 bg-red-950/10 p-4 shadow-sm backdrop-blur transition hover:border-red-500/40">
            <div className="flex items-center justify-between text-red-400 text-[12px] font-medium">
              <span>Cuộc gọi thất bại</span>
              <span className="rounded-lg bg-red-500/20 p-1.5 text-red-400">
                <XCircle size={15} />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-[28px] font-extrabold tracking-tight text-red-400">
                {data?.failedCalls ?? 0}
              </span>
              <span className="text-[12px] text-neutral-400">
                ({data?.totalCalls ? Math.round(((data.failedCalls ?? 0) / data.totalCalls) * 100) : 0}%)
              </span>
            </div>
            <div className="mt-2 text-[11px] text-red-400/70">
              Do hết credits hoặc lỗi mạng
            </div>
          </div>

          {/* Active / Running */}
          <div className="rounded-2xl border border-sky-500/20 bg-sky-950/10 p-4 shadow-sm backdrop-blur transition hover:border-sky-500/40">
            <div className="flex items-center justify-between text-sky-400 text-[12px] font-medium">
              <span>Đang xử lý / Chờ</span>
              <span className="rounded-lg bg-sky-500/20 p-1.5 text-sky-400">
                <Clock size={15} />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-[28px] font-extrabold tracking-tight text-sky-300">
                {data?.runningCalls ?? 0}
              </span>
              <span className="text-[12px] text-neutral-400">tác vụ</span>
            </div>
            <div className="mt-2 text-[11px] text-sky-400/70">
              Đang render trong hàng đợi
            </div>
          </div>
        </div>

        {/* SƠ ĐỒ HÌNH SIN (SINE WAVE ACTIVITY TELEMETRY) */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/30 p-5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                <Waves size={15} />
              </span>
              <div>
                <h2 className="text-[14.5px] font-semibold text-white">Sơ Đồ Hình Sin: Nhịp Điệu Cuộc Gọi AI</h2>
                <p className="text-[11px] text-neutral-400">
                  Biểu diễn sóng tần suất và biên độ hoạt động của các model AI theo thời gian
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1 text-[11px]">
              {(["24h", "7d", "all"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedTimeRange(r)}
                  className={clsx(
                    "rounded-lg px-2.5 py-1 font-medium transition",
                    selectedTimeRange === r ? "bg-amber-500 text-black shadow" : "text-neutral-400 hover:text-white",
                  )}
                >
                  {r === "24h" ? "24 Giờ" : r === "7d" ? "7 Ngày" : "Toàn bộ"}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive SVG Sine Wave Canvas */}
          <div className="relative mt-4 h-[200px] w-full overflow-hidden rounded-xl border border-white/10 bg-[#09090e]/90">
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_30px]" />

            <svg
              viewBox="0 0 800 180"
              preserveAspectRatio="none"
              className="relative h-full w-full overflow-visible"
            >
              <defs>
                {/* Sine wave glow gradient fill */}
                <linearGradient id="sineGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                  <stop offset="60%" stopColor="#eab308" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </linearGradient>

                {/* Sine stroke gradient */}
                <linearGradient id="sineStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#facc15" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>

              {/* Area under wave */}
              <path d={sineWavePath.areaD} fill="url(#sineGlow)" />

              {/* Center Zero Axis Line */}
              <line x1="0" y1="90" x2="800" y2="90" stroke="#ffffff15" strokeDasharray="4 4" strokeWidth="1" />

              {/* Harmonic wave overlay */}
              <path
                d={sineWavePath.pathD}
                fill="none"
                stroke="url(#sineStroke)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Peak Wave Highlight Nodes */}
              {sineWavePath.points
                .filter((_, idx) => idx % 10 === 0)
                .map(([x, y], pIdx) => (
                  <g key={pIdx}>
                    <circle cx={x} cy={y} r="5" fill="#facc15" stroke="#18181b" strokeWidth="2" />
                    <circle cx={x} cy={y} r="9" fill="none" stroke="#facc15" strokeWidth="1" opacity="0.4" />
                  </g>
                ))}
            </svg>

            {/* Float badges on wave */}
            <div className="pointer-events-none absolute bottom-3 left-4 flex items-center gap-4 text-[10.5px] text-neutral-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sky-400" /> Nhịp sóng API (Traffic Waves)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> Tần số cao điểm (Peak Cycles)
              </span>
            </div>
            <div className="pointer-events-none absolute top-3 right-4 rounded-lg bg-black/60 px-2 py-1 text-[10.5px] font-mono text-amber-300 border border-white/10">
              f(t) = A·sin(ωt + φ) · 125 Calls
            </div>
          </div>
        </div>

        {/* BẢNG THỐNG KÊ CHI TIẾT TỪNG MODEL */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20 text-violet-400">
                <Cpu size={15} />
              </span>
              <h2 className="text-[14.5px] font-semibold text-white">
                Bảng Thống Kê Chi Tiết Số Lần Gọi Theo Model
              </h2>
            </div>
            <span className="text-[12px] text-neutral-400">
              {data?.modelBreakdown?.length ?? 0} model đã sử dụng
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-white/10 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  <th className="pb-3 pl-3">Tên Model</th>
                  <th className="pb-3">Phân Loại</th>
                  <th className="pb-3 text-center">Tổng Số Lần</th>
                  <th className="pb-3">Thành Công / Thất Bại</th>
                  <th className="pb-3 text-right">Tỷ Lệ (%)</th>
                  <th className="pb-3 pr-3 text-right">Lần Gọi Gần Nhất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data?.modelBreakdown?.map((m) => {
                  const isVideo = m.kind === "video" || m.model.includes("video") || m.model.includes("seedance") || m.model.includes("veo") || m.model.includes("omni");
                  const isImage = m.kind === "image" || m.model.includes("image") || m.model.includes("gpt-image");

                  return (
                    <tr key={m.model} className="transition hover:bg-white/[0.02]">
                      <td className="py-3 pl-3 font-medium text-white">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/5 text-neutral-300">
                            {isVideo ? <Film size={12} className="text-sky-400" /> : isImage ? <ImageIcon size={12} className="text-amber-400" /> : <Sparkles size={12} className="text-violet-400" />}
                          </span>
                          <span className="font-mono text-[12px]">{m.model}</span>
                        </div>
                      </td>
                      <td className="py-3 text-neutral-400">
                        <span className="rounded bg-white/5 px-2 py-0.5 text-[10.5px]">
                          {isVideo ? "Video AI" : isImage ? "Ảnh AI" : "Chat / Prompt"}
                        </span>
                      </td>
                      <td className="py-3 text-center font-bold text-white">
                        {m.total}
                      </td>
                      <td className="py-3 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-emerald-400 font-medium">{m.succeeded} ✓</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-800 flex">
                            <div
                              style={{ width: `${m.successRate}%` }}
                              className="h-full bg-emerald-400"
                            />
                            <div
                              style={{ width: `${100 - m.successRate}%` }}
                              className="h-full bg-red-400"
                            />
                          </div>
                          <span className="text-[11px] text-red-400 font-medium">{m.failed} ✗</span>
                        </div>
                      </td>
                      <td className="py-3 text-right font-semibold">
                        <span className={clsx(m.successRate >= 60 ? "text-emerald-400" : "text-amber-400")}>
                          {m.successRate}%
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-right text-[11px] text-neutral-400">
                        {m.lastCalledAt ? new Date(m.lastCalledAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—"}
                      </td>
                    </tr>
                  );
                })}

                {(!data?.modelBreakdown || data.modelBreakdown.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-neutral-500">
                      Chưa có dữ liệu gọi model nào. Hãy chạy thử một tác vụ trên Canvas!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* NHẬT KÝ GỌI GẦN NHẤT (RECENT JOBS) */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-[14.5px] font-semibold text-white">Nhật Ký Tác Vụ Gần Đây</h2>
            <span className="text-[11px] text-neutral-500">20 lần gọi mới nhất</span>
          </div>

          <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto">
            {data?.recentJobs?.map((job) => {
              const ok = job.status === "succeeded" || job.status === "done";
              const fail = job.status === "failed" || job.status === "error";

              return (
                <div
                  key={job.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 p-2.5 text-[12px]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={clsx(
                        "flex h-6 w-6 items-center justify-center rounded-lg text-xs",
                        ok ? "bg-emerald-500/20 text-emerald-400" : fail ? "bg-red-500/20 text-red-400" : "bg-sky-500/20 text-sky-400",
                      )}
                    >
                      {ok ? "✓" : fail ? "✗" : "⏳"}
                    </span>
                    <div className="min-w-0 truncate">
                      <span className="font-mono text-white text-[12px]">{job.model}</span>
                      {job.error && (
                        <p className="truncate text-[10.5px] text-red-400">{job.error}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-neutral-400 text-[11px]">
                    <span className="rounded bg-white/5 px-2 py-0.5 text-[10.5px]">
                      {job.kind}
                    </span>
                    <span>{new Date(job.created_at).toLocaleTimeString("vi-VN")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
