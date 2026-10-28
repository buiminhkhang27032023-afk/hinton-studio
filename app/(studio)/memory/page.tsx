"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  RotateCcw,
  Sparkles,
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  ListOrdered,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  ArrowUpRight,
  Search,
  Filter,
  Copy,
  Check,
  Play,
  Download,
  Eye,
  X,
  ExternalLink,
  Layers,
  Coins,
  Cpu,
  Zap,
} from "lucide-react";
import clsx from "clsx";
import { useUi } from "@/lib/ui-store";

interface ModelStat {
  rawModel: string;
  model: string;
  provider: string;
  kind: string;
  total: number;
  succeeded: number;
  failed: number;
  running: number;
  successRate: number;
  unitCostRmb: number;
  unitCostVnd: number;
  totalSpentRmb: number;
  totalSpentVnd: number;
  lastCalledAt: number;
  color: string;
}

interface HourlySlot {
  slot: string;
  total: number;
  byModel: Record<string, number>;
}

interface TaskLog {
  id: string;
  taskId: string;
  projectId: string | null;
  projectName: string;
  nodeId: string | null;
  kind: string;
  rawModel: string;
  model: string;
  provider: string;
  status: string;
  prompt: string;
  fullPrompt: string;
  seconds: string;
  resolution: string;
  aspect: string;
  inputImages: string[];
  outputUrl: string | null;
  error: string | null;
  costRmb: number;
  costVnd: number;
  elapsedSec: number;
  createdAt: number;
  updatedAt: number;
}

interface AnalyticsData {
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  runningCalls: number;
  successRate: number;
  totalSpentRmb: number;
  totalSpentVnd: number;
  avgLatencySec: number;
  modelBreakdown: ModelStat[];
  activeModels: string[];
  modelColors: Record<string, string>;
  hourlySeries: HourlySlot[];
  taskLogs: TaskLog[];
}

export default function MemoryAnalyticsPage() {
  const { tr } = useUi();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"logs" | "trends" | "models">("logs");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters for Task Logs
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModel, setSelectedModel] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "24h">("all");

  // Video Preview Modal
  const [previewTask, setPreviewTask] = useState<TaskLog | null>(null);
  const [activePromptModal, setActivePromptModal] = useState<TaskLog | null>(null);

  // Interactive Hover for Line Chart
  const [hoveredSlotIndex, setHoveredSlotIndex] = useState<number | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/analytics");
      const json = await res.json();
      if (json.ok && json.stats) {
        setData(json.stats);
      }
    } catch (e) {
      console.error("Lỗi tải thống kê:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const copyToClipboard = (text: string, idKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(idKey);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewTask(null);
        setActivePromptModal(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filtered Task Logs
  const filteredLogs = useMemo(() => {
    if (!data?.taskLogs) return [];
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    return data.taskLogs.filter((t) => {
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchId = t.taskId.toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
        const matchModel = t.model.toLowerCase().includes(q) || t.provider.toLowerCase().includes(q);
        const matchPrompt = (t.fullPrompt || t.prompt || "").toLowerCase().includes(q);
        const matchProject = t.projectName.toLowerCase().includes(q);
        if (!matchId && !matchModel && !matchPrompt && !matchProject) return false;
      }

      // Model filter
      if (selectedModel !== "all" && t.model !== selectedModel) return false;

      // Status filter
      if (selectedStatus !== "all") {
        if (selectedStatus === "succeeded" && !["succeeded", "done", "completed"].includes(t.status)) return false;
        if (selectedStatus === "failed" && !["failed", "error", "cancelled"].includes(t.status)) return false;
        if (selectedStatus === "running" && !["running", "queued", "pending", "in_progress"].includes(t.status)) return false;
      }

      // Time filter
      if (timeFilter === "24h" && now - t.createdAt > oneDay) return false;
      if (timeFilter === "today") {
        const d = new Date(t.createdAt);
        const today = new Date();
        if (d.getDate() !== today.getDate() || d.getMonth() !== today.getMonth() || d.getFullYear() !== today.getFullYear()) {
          return false;
        }
      }

      return true;
    });
  }, [data?.taskLogs, searchTerm, selectedModel, selectedStatus, timeFilter]);

  // Derived Model Options for filter dropdown
  const modelOptions = useMemo(() => {
    if (!data?.modelBreakdown) return [];
    return data.modelBreakdown.map((m) => m.model);
  }, [data?.modelBreakdown]);

  // Top model by calls
  const topModel = useMemo(() => {
    if (!data?.modelBreakdown?.length) return null;
    return [...data.modelBreakdown].sort((a, b) => b.total - a.total)[0];
  }, [data?.modelBreakdown]);

  // Chart computations
  const maxHourlyCount = useMemo(() => {
    if (!data?.hourlySeries?.length) return 10;
    const maxVal = Math.max(...data.hourlySeries.map((s) => s.total));
    return Math.max(10, Math.ceil(maxVal * 1.25));
  }, [data?.hourlySeries]);

  const splinePoints = useMemo(() => {
    if (!data?.hourlySeries?.length) return { pathD: "", areaD: "", points: [] };
    const series = data.hourlySeries;
    const n = series.length;
    if (n === 0) return { pathD: "", areaD: "", points: [] };

    const svgWidth = 760;
    const svgHeight = 220;
    const padX = 40;
    const padY = 25;
    const w = svgWidth - padX * 2;
    const h = svgHeight - padY * 2;

    const pts = series.map((s, idx) => {
      const x = padX + (idx / Math.max(1, n - 1)) * w;
      const y = padY + h - (s.total / maxHourlyCount) * h;
      return { x, y, total: s.total, slot: s.slot };
    });

    let pathD = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) * 0.5;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) * 0.5;
      const cp2y = p1.y;
      pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }

    const first = pts[0];
    const last = pts[pts.length - 1];
    const bottomY = padY + h;
    const areaD = `${pathD} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;

    return { pathD, areaD, points: pts };
  }, [data?.hourlySeries, maxHourlyCount]);

  return (
    <div className="flex h-screen w-full flex-col overflow-y-auto bg-[#0a0a0f] text-neutral-100 font-sans selection:bg-amber-500/30">
      {/* 1. Header Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.08] bg-[#0c0c14]/90 px-6 py-3.5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-transparent border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <Activity className="h-5 w-5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[17px] font-bold tracking-tight text-white flex items-center gap-2">
                HINTON studio <span className="text-amber-400/90 text-sm font-normal">· Thống Kê & Nhật Ký AI</span>
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Telemetry
              </span>
            </div>
            <p className="text-[11.5px] text-neutral-400">
              Giám sát chi phí, hiệu năng và lịch sử thực thi tác vụ AI theo chuẩn console IOOAI.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="https://console.iooai.cn/usage-logs/task"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11.5px] font-medium text-neutral-300 transition-all hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-200"
          >
            <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
            <span>Mở Console IOOAI</span>
          </a>

          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className={clsx(
              "flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11.5px] font-medium text-neutral-200 transition-all hover:border-white/20 hover:bg-white/[0.08]",
              loading && "opacity-60 cursor-not-allowed",
            )}
          >
            <RotateCcw className={clsx("h-3.5 w-3.5 text-neutral-300", loading && "animate-spin text-amber-400")} />
            <span>{loading ? "Đang đồng bộ..." : "Làm mới"}</span>
          </button>
        </div>
      </header>

      {/* 2. Main Content Body */}
      <main className="flex-1 space-y-6 p-6 max-w-[1440px] w-full mx-auto">
        {/* Top 4 Metric Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Cost */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12121e] to-[#0e0e17] p-5 shadow-lg transition-all hover:border-amber-500/30">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="font-medium uppercase tracking-wider text-[11px] text-neutral-400 flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-amber-400" />
                Tổng chi phí tiêu thụ
              </span>
              <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-500/20">
                Pay-as-you-go
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-white">
                ¥{data?.totalSpentRmb?.toFixed(2) ?? "0.00"}
              </span>
              <span className="text-xs font-semibold text-amber-400/90">
                (~{(data?.totalSpentVnd ?? 0).toLocaleString("vi-VN")} đ)
              </span>
            </div>
            <p className="mt-2 text-[11px] text-neutral-400">
              Tổng tiền thực tế từ toàn bộ các model đã chạy thành công trên cụm API.
            </p>
          </div>

          {/* Card 2: Total Calls & Success Rate */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12121e] to-[#0e0e17] p-5 shadow-lg transition-all hover:border-emerald-500/30">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="font-medium uppercase tracking-wider text-[11px] text-neutral-400 flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
                Tổng tác vụ đã gọi
              </span>
              <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300 border border-emerald-500/20">
                {data?.successRate ?? 0}% Thành công
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-white">{data?.totalCalls ?? 0}</span>
              <span className="text-xs text-neutral-400">lượt gọi</span>
            </div>
            <div className="mt-3 flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="h-3 w-3" /> {data?.successCalls ?? 0} thành công
              </span>
              <span className="flex items-center gap-1 text-rose-400 font-medium">
                <XCircle className="h-3 w-3" /> {data?.failedCalls ?? 0} thất bại
              </span>
            </div>
          </div>

          {/* Card 3: Avg Latency */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12121e] to-[#0e0e17] p-5 shadow-lg transition-all hover:border-cyan-500/30">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="font-medium uppercase tracking-wider text-[11px] text-neutral-400 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
                Tốc độ xử lý trung bình
              </span>
              <span className="rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-medium text-cyan-300 border border-cyan-500/20">
                GPU Latency
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-white">
                {data?.avgLatencySec ?? 38}s
              </span>
              <span className="text-xs text-neutral-400">/ tác vụ</span>
            </div>
            <p className="mt-2 text-[11px] text-neutral-400">
              Thời gian từ lúc đẩy lệnh lên GPU cluster cho tới khi hoàn tất tải file video.
            </p>
          </div>

          {/* Card 4: Top Model */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12121e] to-[#0e0e17] p-5 shadow-lg transition-all hover:border-purple-500/30">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="font-medium uppercase tracking-wider text-[11px] text-neutral-400 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-purple-400" />
                Mô hình phổ biến nhất
              </span>
              <span className="rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-300 border border-purple-500/20">
                Top 1 Gọi
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="truncate text-lg font-bold tracking-tight text-white" title={topModel?.model}>
                {topModel?.model ?? "omni_flash_10s"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-400">
              <span>Đã gọi {topModel?.total ?? 0} lần</span>
              <span className="text-purple-300 font-medium">{topModel?.provider ?? "AI Engine"}</span>
            </div>
          </div>
        </section>

        {/* 3. Navigation Tabs */}
        <section className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("logs")}
              className={clsx(
                "relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all",
                activeTab === "logs"
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.1)]"
                  : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200 border border-transparent",
              )}
            >
              <ListOrdered className="h-4 w-4" />
              <span>Nhật ký tác vụ (Task Usage Logs)</span>
              <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-neutral-300 font-mono">
                {filteredLogs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("trends")}
              className={clsx(
                "relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all",
                activeTab === "trends"
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.1)]"
                  : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200 border border-transparent",
              )}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Biểu đồ xu hướng (Call Trends)</span>
            </button>

            <button
              onClick={() => setActiveTab("models")}
              className={clsx(
                "relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all",
                activeTab === "models"
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.1)]"
                  : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200 border border-transparent",
              )}
            >
              <PieIcon className="h-4 w-4" />
              <span>Phân bổ & Bảng giá Model</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span>Thời gian:</span>
            <div className="inline-flex rounded-lg border border-white/10 bg-[#0e0e17] p-0.5">
              {(["all", "24h", "today"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeFilter(t)}
                  className={clsx(
                    "rounded-md px-2.5 py-1 text-[11px] font-medium transition-all",
                    timeFilter === t ? "bg-amber-500/20 text-amber-300 font-semibold" : "text-neutral-400 hover:text-white",
                  )}
                >
                  {t === "all" ? "Toàn bộ" : t === "24h" ? "24 giờ qua" : "Hôm nay"}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* TAB 1: TASK USAGE LOGS (Referenced from console.iooai.cn/usage-logs/task) */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#0d0d16] p-3.5">
              <div className="flex flex-1 items-center gap-2 min-w-[280px]">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm theo Task ID, từ khóa prompt, tên dự án..."
                    className="w-full rounded-xl border border-white/10 bg-[#141422] py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Model Select */}
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-neutral-400" />
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="rounded-xl border border-white/10 bg-[#141422] px-3 py-2 text-xs text-neutral-200 focus:border-amber-500/50 focus:outline-none"
                  >
                    <option value="all">Tất cả mô hình ({modelOptions.length})</option>
                    {modelOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Select */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="rounded-xl border border-white/10 bg-[#141422] px-3 py-2 text-xs text-neutral-200 focus:border-amber-500/50 focus:outline-none"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="succeeded">Thành công (Succeeded)</option>
                  <option value="running">Đang xử lý (Running)</option>
                  <option value="failed">Thất bại (Failed)</option>
                </select>
              </div>
            </div>

            {/* Task Logs Table */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c14] shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] bg-[#11111c] text-neutral-400 font-semibold text-[11px] uppercase tracking-wider">
                      <th className="py-3.5 pl-4 pr-3">Mã Tác Vụ (Task ID)</th>
                      <th className="py-3.5 px-3">Mô Hình & Nền Tảng</th>
                      <th className="py-3.5 px-3">Dự Án</th>
                      <th className="py-3.5 px-3">Thông Số</th>
                      <th className="py-3.5 px-3">Chi Phí</th>
                      <th className="py-3.5 px-3">Thời Gian / Độ Trễ</th>
                      <th className="py-3.5 px-3">Trạng Thái</th>
                      <th className="py-3.5 pl-3 pr-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-neutral-500">
                          Không tìm thấy tác vụ nào khớp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((task) => {
                        const isSucceeded = ["succeeded", "done", "completed"].includes(task.status);
                        const isFailed = ["failed", "error", "cancelled"].includes(task.status);
                        const isRunning = ["running", "queued", "pending", "in_progress"].includes(task.status);

                        return (
                          <tr
                            key={task.id}
                            className="group transition-colors hover:bg-white/[0.02]"
                          >
                            {/* Task ID with Copy */}
                            <td className="py-3 pl-4 pr-3 font-mono text-[11px] text-neutral-300">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate max-w-[130px] font-medium" title={task.taskId}>
                                  {task.taskId.startsWith("task_") ? task.taskId : task.taskId.slice(0, 16)}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(task.taskId, `task-${task.id}`)}
                                  className="text-neutral-500 opacity-0 group-hover:opacity-100 hover:text-amber-400 transition-opacity"
                                  title="Sao chép Task ID"
                                >
                                  {copiedId === `task-${task.id}` ? (
                                    <Check className="h-3 w-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Model & Engine */}
                            <td className="py-3 px-3">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                                  <span
                                    className="h-2 w-2 rounded-full shrink-0"
                                    style={{
                                      backgroundColor: data?.modelColors[task.model] || "#eab308",
                                    }}
                                  />
                                  <span className="truncate max-w-[160px]" title={task.model}>
                                    {task.model}
                                  </span>
                                </span>
                                <span className="text-[10px] text-neutral-400 font-mono pl-3.5">
                                  {task.provider}
                                </span>
                              </div>
                            </td>

                            {/* Project Link */}
                            <td className="py-3 px-3 text-neutral-300">
                              {task.projectId ? (
                                <Link
                                  href={`/canvas/${task.projectId}`}
                                  className="hover:text-amber-300 hover:underline flex items-center gap-1 truncate max-w-[150px]"
                                  title={task.projectName}
                                >
                                  <span className="truncate">{task.projectName}</span>
                                  <ArrowUpRight className="h-2.5 w-2.5 text-neutral-500" />
                                </Link>
                              ) : (
                                <span className="text-neutral-500">—</span>
                              )}
                            </td>

                            {/* Specs (Seconds, Res, Ratio) */}
                            <td className="py-3 px-3 text-neutral-300">
                              <div className="flex items-center gap-1.5">
                                <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[10.5px] font-mono text-neutral-300 border border-white/[0.05]">
                                  {task.seconds || "10s"}
                                </span>
                                <span className="text-[10px] text-neutral-400 font-mono">
                                  {task.resolution || "720p"}
                                </span>
                              </div>
                            </td>

                            {/* Cost */}
                            <td className="py-3 px-3">
                              {isFailed ? (
                                <span className="text-neutral-500 font-mono">¥0.00</span>
                              ) : (
                                <div className="flex flex-col">
                                  <span className="font-mono font-bold text-amber-300">
                                    ¥{task.costRmb.toFixed(2)}
                                  </span>
                                  <span className="text-[9.5px] text-neutral-400 font-mono">
                                    ~{task.costVnd.toLocaleString("vi-VN")}đ
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Timestamp & Latency */}
                            <td className="py-3 px-3 text-neutral-400">
                              <div className="flex flex-col gap-0.5 text-[10.5px]">
                                <span className="text-neutral-300">
                                  {new Date(task.createdAt).toLocaleTimeString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </span>
                                <span className="font-mono text-neutral-400 text-[10px]">
                                  {task.elapsedSec > 0 ? `Độ trễ: ${task.elapsedSec}s` : ""}
                                </span>
                              </div>
                            </td>

                            {/* Status Badge */}
                            <td className="py-3 px-3">
                              {isSucceeded && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                  Thành công
                                </span>
                              )}
                              {isRunning && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/20 animate-pulse">
                                  <Clock className="h-2.5 w-2.5" />
                                  Đang xử lý
                                </span>
                              )}
                              {isFailed && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/20">
                                  <XCircle className="h-2.5 w-2.5" />
                                  Thất bại
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3 pl-3 pr-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {task.outputUrl && (
                                  <button
                                    onClick={() => setPreviewTask(task)}
                                    className="flex items-center gap-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 px-2.5 py-1 text-[11px] font-medium transition-all border border-amber-500/30"
                                    title="Xem video thành phẩm"
                                  >
                                    <Play className="h-3 w-3 fill-amber-300 text-amber-300" />
                                    <span>Xem</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => setActivePromptModal(task)}
                                  className="rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 p-1.5 transition-all"
                                  title="Xem Prompt câu lệnh"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CALL TRENDS & HOURLY CHARTS (IOOAI Stacked Bar & Sine/Spline) */}
        {activeTab === "trends" && (
          <div className="space-y-6">
            {/* 1. Spline Bezier Trend Chart */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c14] p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                    Xu hướng cuộc gọi thời gian thực (Cubic Bezier Spline)
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-neutral-400">
                  {data?.hourlySeries?.length ?? 0} mốc thời gian gần nhất
                </span>
              </div>

              <div className="relative mt-4 h-[240px] w-full overflow-hidden">
                <svg
                  viewBox="0 0 760 220"
                  preserveAspectRatio="none"
                  className="h-full w-full overflow-visible"
                >
                  <defs>
                    <linearGradient id="spline-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00b4d8" stopOpacity="0.35" />
                      <stop offset="60%" stopColor="#00b4d8" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#00b4d8" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="spline-stroke" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#00b4d8" />
                      <stop offset="50%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#818cf8" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                    const y = 25 + (1 - ratio) * 170;
                    return (
                      <g key={i}>
                        <line x1="40" y1={y} x2="720" y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                        <text x="32" y={y + 3} textAnchor="end" fill="#737373" fontSize="9" fontFamily="monospace">
                          {Math.round(ratio * maxHourlyCount)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Spline Area & Stroke */}
                  {splinePoints.areaD && <path d={splinePoints.areaD} fill="url(#spline-fill)" />}
                  {splinePoints.pathD && (
                    <path
                      d={splinePoints.pathD}
                      fill="none"
                      stroke="url(#spline-stroke)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Hover Band */}
                  {hoveredSlotIndex !== null && splinePoints.points[hoveredSlotIndex] && (
                    <g>
                      <line
                        x1={splinePoints.points[hoveredSlotIndex].x}
                        y1="25"
                        x2={splinePoints.points[hoveredSlotIndex].x}
                        y2="195"
                        stroke="#00b4d8"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                        opacity="0.8"
                      />
                    </g>
                  )}

                  {/* Points on Line */}
                  {splinePoints.points.map((pt, idx) => (
                    <circle
                      key={idx}
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredSlotIndex === idx ? "5" : "3.5"}
                      fill="#0a0a0f"
                      stroke="#00b4d8"
                      strokeWidth={hoveredSlotIndex === idx ? "2.5" : "1.8"}
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredSlotIndex(idx)}
                      onMouseLeave={() => setHoveredSlotIndex(null)}
                    />
                  ))}
                </svg>

                {/* X Axis Labels */}
                <div className="absolute bottom-0 left-[40px] right-[40px] flex justify-between text-[10px] font-mono text-neutral-400">
                  {data?.hourlySeries?.map((s, idx) => (
                    <span
                      key={idx}
                      className={clsx(
                        "cursor-pointer transition-colors",
                        hoveredSlotIndex === idx && "text-cyan-400 font-bold",
                      )}
                      onMouseEnter={() => setHoveredSlotIndex(idx)}
                      onMouseLeave={() => setHoveredSlotIndex(null)}
                    >
                      {s.slot.split(" ")[1] || s.slot}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Stacked Bar Chart per Model */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c14] p-5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                    Phân bố lượt gọi theo từng Model (Stacked Hourly Bar)
                  </h3>
                </div>

                {/* Model Legend */}
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  {data?.activeModels.slice(0, 5).map((m) => (
                    <span key={m} className="flex items-center gap-1.5 text-neutral-300">
                      <span
                        className="h-2 w-2 rounded-sm"
                        style={{ backgroundColor: data.modelColors[m] || "#f59e0b" }}
                      />
                      <span>{m}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Stacked Bars */}
              <div className="mt-5 grid grid-cols-8 gap-3 items-end h-[160px] pt-4 px-2">
                {data?.hourlySeries?.map((slot, idx) => {
                  const barHeightPct = Math.min(100, Math.round((slot.total / maxHourlyCount) * 100));

                  return (
                    <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                      <span className="text-[9.5px] font-mono text-neutral-400 group-hover:text-amber-300">
                        {slot.total}
                      </span>
                      <div className="w-full max-w-[36px] bg-white/[0.04] rounded-t-lg overflow-hidden flex flex-col-reverse transition-all group-hover:brightness-110" style={{ height: `${Math.max(6, barHeightPct)}%` }}>
                        {data.activeModels.map((m) => {
                          const count = slot.byModel[m] || 0;
                          if (count === 0) return null;
                          const segmentPct = Math.round((count / Math.max(1, slot.total)) * 100);

                          return (
                            <div
                              key={m}
                              style={{
                                height: `${segmentPct}%`,
                                backgroundColor: data.modelColors[m] || "#f59e0b",
                              }}
                              title={`${m}: ${count} lượt`}
                            />
                          );
                        })}
                      </div>
                      <span className="text-[9px] font-mono text-neutral-400 truncate max-w-[45px]">
                        {slot.slot.split(" ")[1]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MODEL DISTRIBUTION & PRICING BREAKDOWN */}
        {activeTab === "models" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left: Models Performance & Cost Leaderboard */}
            <div className="lg:col-span-2 rounded-2xl border border-white/[0.08] bg-[#0c0c14] p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                    Bảng Thống Kê & Chi Phí Từng Mô Hình
                  </h3>
                </div>
                <span className="text-[11px] text-neutral-400">
                  {data?.modelBreakdown?.length ?? 0} mô hình đã sử dụng
                </span>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-neutral-400 font-semibold text-[10.5px] uppercase">
                      <th className="py-2.5 pr-2">Mô hình AI</th>
                      <th className="py-2.5 px-2">Đơn giá / Lượt</th>
                      <th className="py-2.5 px-2">Tổng số lượt</th>
                      <th className="py-2.5 px-2">Thành công</th>
                      <th className="py-2.5 px-2 text-right">Tổng chi phí</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {data?.modelBreakdown.map((m) => (
                      <tr key={m.rawModel} className="hover:bg-white/[0.02]">
                        <td className="py-3 pr-2 font-medium text-neutral-200 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                          <div className="flex flex-col">
                            <span className="font-semibold text-white">{m.model}</span>
                            <span className="text-[10px] text-neutral-400">{m.provider}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 font-mono text-neutral-300">
                          ¥{m.unitCostRmb.toFixed(2)}
                          <span className="block text-[9.5px] text-neutral-400">
                            ~{m.unitCostVnd.toLocaleString("vi-VN")}đ
                          </span>
                        </td>
                        <td className="py-3 px-2 font-mono text-neutral-200 font-bold">{m.total}</td>
                        <td className="py-3 px-2 font-mono">
                          <span className="text-emerald-400">{m.successRate}%</span>
                          <span className="text-neutral-400 text-[10px] ml-1">({m.succeeded})</span>
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-bold text-amber-300">
                          ¥{m.totalSpentRmb.toFixed(2)}
                          <span className="block text-[9.5px] text-neutral-400">
                            ~{m.totalSpentVnd.toLocaleString("vi-VN")}đ
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Percentage Share Cards */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c14] p-5 shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200 mb-3 flex items-center gap-2">
                  <PieIcon className="h-4 w-4 text-purple-400" />
                  Tỷ lệ thị phần cuộc gọi
                </h3>
                <div className="space-y-3">
                  {data?.modelBreakdown.slice(0, 6).map((m) => {
                    const pct = data.totalCalls > 0 ? Math.round((m.total / data.totalCalls) * 100) : 0;
                    return (
                      <div key={m.model} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-300 truncate max-w-[170px]">{m.model}</span>
                          <span className="font-mono text-neutral-400">{pct}% ({m.total})</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: m.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. MODAL: Video Preview (Smooth Backdrop Blur & Video Player) */}
      {previewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-[#0f0f18] shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4 bg-[#141422]">
              <div className="flex items-center gap-2.5">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: data?.modelColors[previewTask.model] || "#eab308" }}
                />
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {previewTask.model}
                    <span className="text-xs text-neutral-400 font-normal">· {previewTask.seconds || "15s"}</span>
                  </h3>
                  <p className="text-[11px] font-mono text-neutral-400">{previewTask.taskId}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {previewTask.outputUrl && (
                  <a
                    href={previewTask.outputUrl}
                    download
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-white/10 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Tải video</span>
                  </a>
                )}
                <button
                  onClick={() => setPreviewTask(null)}
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
              {/* Left 2 Cols: Video Player */}
              <div className="md:col-span-2 bg-black flex items-center justify-center p-4 min-h-[360px]">
                {previewTask.outputUrl ? (
                  <video
                    src={previewTask.outputUrl}
                    controls
                    autoPlay
                    loop
                    className="max-h-[480px] w-auto rounded-xl shadow-lg border border-white/10"
                  />
                ) : (
                  <p className="text-neutral-500 text-xs">Video không khả dụng hoặc đã bị xóa.</p>
                )}
              </div>

              {/* Right Col: Details & Prompt */}
              <div className="p-5 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/[0.08] bg-[#0c0c14] space-y-4">
                <div className="space-y-3">
                  <div>
                    <span className="text-[10.5px] uppercase tracking-wider text-neutral-400 font-semibold">
                      Kịch bản câu lệnh (Prompt)
                    </span>
                    <p className="mt-1.5 text-xs text-neutral-300 max-h-[180px] overflow-y-auto rounded-lg bg-white/[0.02] p-2.5 border border-white/[0.05] leading-relaxed">
                      {previewTask.fullPrompt || previewTask.prompt || "Không có nội dung prompt."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-white/[0.03] p-2 border border-white/[0.05]">
                      <span className="text-[10px] text-neutral-400 block">Chi phí:</span>
                      <span className="font-bold text-amber-300 font-mono">¥{previewTask.costRmb.toFixed(2)}</span>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] p-2 border border-white/[0.05]">
                      <span className="text-[10px] text-neutral-400 block">Thời gian render:</span>
                      <span className="font-bold text-cyan-300 font-mono">{previewTask.elapsedSec}s</span>
                    </div>
                  </div>
                </div>

                {previewTask.projectId && (
                  <Link
                    href={`/canvas/${previewTask.projectId}`}
                    className="flex items-center justify-center gap-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 py-2.5 text-xs font-semibold transition-all shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                  >
                    <span>Mở Dự Án Canvas</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: Full Prompt Viewer */}
      {activePromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f18] p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Chi Tiết Kịch Bản Tác Vụ
              </h3>
              <button
                onClick={() => setActivePromptModal(null)}
                className="rounded-lg p-1 text-neutral-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Task ID: <span className="font-mono text-neutral-300">{activePromptModal.taskId}</span></span>
                <button
                  onClick={() => copyToClipboard(activePromptModal.fullPrompt || activePromptModal.prompt, "modal-prompt")}
                  className="flex items-center gap-1 text-amber-300 hover:underline"
                >
                  {copiedId === "modal-prompt" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedId === "modal-prompt" ? "Đã chép" : "Sao chép"}</span>
                </button>
              </div>

              <div className="max-h-[300px] overflow-y-auto rounded-xl bg-black/40 p-4 border border-white/[0.06] text-xs text-neutral-200 leading-relaxed font-sans whitespace-pre-wrap selection:bg-amber-500/30">
                {activePromptModal.fullPrompt || activePromptModal.prompt}
              </div>
            </div>

            {activePromptModal.error && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300">
                <span className="font-bold">Lỗi từ máy chủ:</span> {activePromptModal.error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
