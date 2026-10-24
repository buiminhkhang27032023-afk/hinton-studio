"use client";

import React, { useEffect, useState, useMemo } from "react";
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
} from "lucide-react";
import clsx from "clsx";
import { useUi } from "@/lib/ui-store";

interface ModelStat {
  rawModel: string;
  model: string;
  kind: string;
  total: number;
  succeeded: number;
  failed: number;
  running: number;
  successRate: number;
  lastCalledAt: number;
  color: string;
}

interface HourlySlot {
  slot: string;
  total: number;
  byModel: Record<string, number>;
}

interface AnalyticsData {
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  runningCalls: number;
  successRate: number;
  modelBreakdown: ModelStat[];
  activeModels: string[];
  modelColors: Record<string, string>;
  hourlySeries: HourlySlot[];
}

export default function AnalyticsPage() {
  const { toast } = useUi();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"trend" | "distribution" | "ranking">("trend");
  const [hoveredSlotIndex, setHoveredSlotIndex] = useState<number | null>(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

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

  // Top prioritized models for clean visual display matching IOOAI
  const displayModels = useMemo(() => {
    if (!data) return [];
    const priority = ["omni 可编辑视频", "omni_flash_10s", "seedance2.0 线路二", "seedance2.5 LW"];
    const all = data.activeModels || [];
    const ordered: string[] = [];

    // Add prioritized first if present
    priority.forEach((p) => {
      if (all.includes(p)) ordered.push(p);
    });
    // Add remaining
    all.forEach((m) => {
      if (!ordered.includes(m)) ordered.push(m);
    });

    return ordered.slice(0, 6);
  }, [data]);

  const hourlySeries = data?.hourlySeries || [];
  const activeModels = displayModels;
  const modelColors: Record<string, string> = data?.modelColors || {};

  // Compute maximums for chart scales
  const maxBarTotal = useMemo(() => {
    if (hourlySeries.length === 0) return 4;
    const maxVal = Math.max(...hourlySeries.map((s) => s.total));
    return Math.max(4, Math.ceil(maxVal * 1.15));
  }, [hourlySeries]);

  const maxTrendVal = useMemo(() => {
    let m = 3;
    hourlySeries.forEach((s) => {
      Object.values(s.byModel).forEach((v) => {
        if (v > m) m = v;
      });
    });
    return Math.max(3, Math.ceil(m));
  }, [hourlySeries]);

  // Compute smooth cubic bezier spline path for each model in "Xu hướng cuộc gọi" (Sơ đồ hình sin)
  const splinePaths = useMemo(() => {
    if (hourlySeries.length < 2) return {};

    const svgWidth = 860;
    const svgHeight = 220;
    const paddingLeft = 40;
    const paddingRight = 40;
    const paddingTop = 20;
    const paddingBottom = 40;

    const plotW = svgWidth - paddingLeft - paddingRight;
    const plotH = svgHeight - paddingTop - paddingBottom;
    const stepX = plotW / (hourlySeries.length - 1);

    const paths: Record<string, { pathD: string; areaD: string; points: Array<{ x: number; y: number; val: number }> }> = {};

    activeModels.forEach((modelName) => {
      const pts = hourlySeries.map((slot, idx) => {
        const val = slot.byModel[modelName] || 0;
        const x = paddingLeft + idx * stepX;
        const y = paddingTop + plotH - (val / maxTrendVal) * plotH;
        return { x, y, val };
      });

      if (pts.length === 0) return;

      // Build smooth cubic bezier curve through points
      let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i === 0 ? 0 : i - 1];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

        // Cardinal / Catmull-Rom to Cubic Bezier
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }

      const lastPt = pts[pts.length - 1];
      const firstPt = pts[0];
      const bottomY = paddingTop + plotH;
      const area = `${d} L ${lastPt.x.toFixed(1)} ${bottomY} L ${firstPt.x.toFixed(1)} ${bottomY} Z`;

      paths[modelName] = { pathD: d, areaD: area, points: pts };
    });

    return paths;
  }, [hourlySeries, activeModels, maxTrendVal]);

  // Donut chart calculations
  const donutSlices = useMemo(() => {
    const total = data?.totalCalls || 0;
    if (total === 0 || !data?.modelBreakdown) return [];

    let currentAngle = 0;
    return data.modelBreakdown.slice(0, 7).map((item) => {
      const percent = (item.total / total) * 100;
      const angle = (item.total / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle += angle;

      const r = 70;
      const cx = 100;
      const cy = 100;

      const x1 = cx + r * Math.cos((Math.PI * (startAngle - 90)) / 180);
      const y1 = cy + r * Math.sin((Math.PI * (startAngle - 90)) / 180);
      const x2 = cx + r * Math.cos((Math.PI * (endAngle - 90)) / 180);
      const y2 = cy + r * Math.sin((Math.PI * (endAngle - 90)) / 180);

      const largeArc = angle > 180 ? 1 : 0;
      const pathD = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

      return {
        ...item,
        percent: percent.toFixed(1),
        pathD,
      };
    });
  }, [data]);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#0e0f15] text-neutral-200">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] px-8 py-5 bg-[#12131b]/60 backdrop-blur">
        <div>
          <h1 className="text-[17px] font-semibold text-white tracking-tight">
            Phân tích lượt gọi mô hình
          </h1>
          <p className="mt-0.5 text-[12px] text-neutral-400">
            Giám sát thời gian thực số lượt gọi API, tỷ lệ thành công và biểu đồ xu hướng theo từng Model
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAnalytics}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[12px] font-medium text-neutral-300 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
        >
          <RotateCcw size={13} className={loading ? "animate-spin" : ""} />
          <span>Làm mới số liệu</span>
        </button>
      </div>

      <div className="mx-auto w-full max-w-6xl space-y-6 px-8 py-6">
        {/* ============================================================== */}
        {/* CHART 1: BIỂU ĐỒ CỘT XẾP CHỒNG (STACKED BAR CHART THEO GIỜ) */}
        {/* ============================================================== */}
        <div className="relative rounded-2xl border border-white/[0.08] bg-[#141620] p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-white">Phân tích lượt gọi mô hình</h2>
            <div className="text-[11px] text-neutral-400">
              Đơn vị: Cuộc gọi / Giờ
            </div>
          </div>

          {/* SVG Stacked Bar Chart */}
          <div className="relative h-[220px] w-full">
            <svg viewBox="0 0 860 200" preserveAspectRatio="none" className="h-full w-full">
              {/* Y Axis Grid lines and labels */}
              {[0, 1, 2, 3, 4].map((step) => {
                const y = 170 - (step / 4) * 150;
                return (
                  <g key={step}>
                    <line
                      x1="45"
                      y1={y}
                      x2="850"
                      y2={y}
                      stroke="rgba(255,255,255,0.06)"
                      strokeDasharray={step === 0 ? "none" : "2,4"}
                    />
                    <text
                      x="35"
                      y={y + 3.5}
                      textAnchor="end"
                      fill="#73768a"
                      fontSize="10"
                      fontFamily="sans-serif"
                    >
                      {step}
                    </text>
                  </g>
                );
              })}

              {/* Stacked Bars per Hour Slot */}
              {hourlySeries.map((slot, idx) => {
                const totalSlots = hourlySeries.length;
                const slotWidth = 780 / totalSlots;
                const barWidth = 38;
                const xCenter = 55 + idx * slotWidth + slotWidth / 2;
                const x = xCenter - barWidth / 2;

                let currentY = 170;

                return (
                  <g
                    key={slot.slot}
                    className="cursor-pointer transition-opacity"
                    onMouseEnter={() => setHoveredBarIndex(idx)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                  >
                    {/* Background hover column */}
                    {hoveredBarIndex === idx && (
                      <rect
                        x={xCenter - slotWidth / 2}
                        y={20}
                        width={slotWidth}
                        height={150}
                        fill="rgba(255,255,255,0.03)"
                        rx={4}
                      />
                    )}

                    {/* Stacked segments for each model */}
                    {activeModels.map((mName) => {
                      const count = slot.byModel[mName] || 0;
                      if (count <= 0) return null;
                      const segmentHeight = (count / maxBarTotal) * 150;
                      currentY -= segmentHeight;
                      const segColor = modelColors[mName] || "#38bdf8";

                      return (
                        <rect
                          key={mName}
                          x={x}
                          y={currentY}
                          width={barWidth}
                          height={Math.max(2, segmentHeight)}
                          fill={segColor}
                          rx={1.5}
                          className="transition-all hover:brightness-125"
                        />
                      );
                    })}

                    {/* X-axis slot label */}
                    <text
                      x={xCenter}
                      y={188}
                      textAnchor="middle"
                      fill="#73768a"
                      fontSize="10"
                      fontFamily="sans-serif"
                    >
                      {slot.slot}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip for Bar Chart */}
            {hoveredBarIndex !== null && hourlySeries[hoveredBarIndex] && (
              <div
                className="pointer-events-none absolute top-4 z-20 rounded-xl border border-white/10 bg-[#1e202c]/95 p-3 text-[11.5px] shadow-2xl backdrop-blur-md transition-all"
                style={{
                  left: `${Math.min(75, Math.max(15, (hoveredBarIndex / hourlySeries.length) * 100))}%`,
                }}
              >
                <div className="font-semibold text-white border-b border-white/10 pb-1.5 mb-2">
                  {hourlySeries[hoveredBarIndex].slot}
                </div>
                <div className="text-neutral-400 mb-1 flex justify-between gap-4">
                  <span>Tổng cộng:</span>
                  <span className="font-bold text-white">{hourlySeries[hoveredBarIndex].total}</span>
                </div>
                <div className="space-y-1">
                  {activeModels.map((m) => {
                    const c = hourlySeries[hoveredBarIndex].byModel[m] || 0;
                    return (
                      <div key={m} className="flex items-center justify-between gap-4 text-neutral-300">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="inline-block h-2 w-2 rounded-sm"
                            style={{ backgroundColor: modelColors[m] || "#38bdf8" }}
                          />
                          <span className="truncate max-w-[150px]">{m}</span>
                        </div>
                        <span className="font-medium text-white">{c}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Model Legends Below Bar Chart */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-5 pt-3 border-t border-white/[0.05] text-[11.5px] text-neutral-400">
            {activeModels.map((m) => (
              <div key={m} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: modelColors[m] || "#38bdf8" }}
                />
                <span className="text-neutral-300">{m}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ============================================================== */}
        {/* CHART 2: CARD PHÂN TÍCH LƯỢT GỌI & TAB SWITCHER (XU HƯỚNG/SƠ ĐỒ HÌNH SIN) */}
        {/* ============================================================== */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#141620] p-6 shadow-xl">
          {/* Card Header with Glowing Icon & Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-500/20 via-purple-500/20 to-sky-500/20 border border-white/10 text-pink-400">
                <Activity size={18} />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-semibold text-white">Phân tích lượt gọi mô hình</h3>
                <span className="text-neutral-500">|</span>
                <span className="text-[12.5px] text-neutral-400">
                  Tổng cộng: <strong className="text-white font-semibold">{data?.totalCalls || 0}</strong>
                </span>
              </div>
            </div>

            {/* 3 Tabs: Xu hướng cuộc gọi | Phân bổ số lượt gọi | Xếp hạng số lượt gọi */}
            <div className="flex items-center rounded-xl border border-white/[0.08] bg-[#0c0d13] p-1 text-[12px]">
              <button
                type="button"
                onClick={() => setActiveTab("trend")}
                className={clsx(
                  "rounded-lg px-3.5 py-1.5 font-medium transition",
                  activeTab === "trend"
                    ? "bg-[#272a3a] text-white shadow"
                    : "text-neutral-400 hover:text-white",
                )}
              >
                Xu hướng cuộc gọi
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("distribution")}
                className={clsx(
                  "rounded-lg px-3.5 py-1.5 font-medium transition",
                  activeTab === "distribution"
                    ? "bg-[#272a3a] text-white shadow"
                    : "text-neutral-400 hover:text-white",
                )}
              >
                Phân bổ số lượt gọi
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ranking")}
                className={clsx(
                  "rounded-lg px-3.5 py-1.5 font-medium transition",
                  activeTab === "ranking"
                    ? "bg-[#272a3a] text-white shadow"
                    : "text-neutral-400 hover:text-white",
                )}
              >
                Xếp hạng số lượt gọi
              </button>
            </div>
          </div>

          {/* TAB 1: XU HƯỚNG CUỘC GỌI (SMOOTH SPLINE / SƠ ĐỒ HÌNH SIN) */}
          {activeTab === "trend" && (
            <div className="mt-5">
              <div className="mb-2 text-[13.5px] font-medium text-neutral-300">
                Xu hướng cuộc gọi
              </div>

              {/* Smooth Bezier Spline Curves Canvas */}
              <div
                className="relative h-[250px] w-full cursor-crosshair select-none"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left - 40;
                  const w = rect.width - 80;
                  if (w > 0 && hourlySeries.length > 1) {
                    const idx = Math.round((x / w) * (hourlySeries.length - 1));
                    setHoveredSlotIndex(Math.max(0, Math.min(hourlySeries.length - 1, idx)));
                  }
                }}
                onMouseLeave={() => setHoveredSlotIndex(null)}
              >
                <svg viewBox="0 0 860 220" preserveAspectRatio="none" className="h-full w-full">
                  {/* Y-axis horizontal grid lines (0, 0.5, 1, 1.5, 2, 2.5, 3) */}
                  {[0, 0.5, 1, 1.5, 2, 2.5, 3].map((val) => {
                    const y = 180 - (val / 3) * 160;
                    return (
                      <g key={val}>
                        <line
                          x1="40"
                          y1={y}
                          x2="820"
                          y2={y}
                          stroke="rgba(255,255,255,0.05)"
                          strokeDasharray={val === 0 ? "none" : "3,3"}
                        />
                        <text
                          x="32"
                          y={y + 3.5}
                          textAnchor="end"
                          fill="#73768a"
                          fontSize="9.5"
                          fontFamily="sans-serif"
                        >
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Vertical highlight band when hovered (Exactly as shown at 10-25 00:00 in screenshot) */}
                  {hoveredSlotIndex !== null && (
                    <g>
                      {(() => {
                        const stepX = (860 - 80) / (hourlySeries.length - 1);
                        const bandX = 40 + hoveredSlotIndex * stepX - stepX / 2;
                        return (
                          <rect
                            x={Math.max(40, bandX)}
                            y={20}
                            width={stepX}
                            height={160}
                            fill="rgba(255, 255, 255, 0.05)"
                          />
                        );
                      })()}
                    </g>
                  )}

                  {/* Render smooth spline curve for each active model */}
                  {activeModels.map((mName) => {
                    const modelSpline = splinePaths[mName];
                    if (!modelSpline) return null;
                    const strokeColor = modelColors[mName] || "#38bdf8";

                    return (
                      <g key={mName}>
                        {/* Smooth Line */}
                        <path
                          d={modelSpline.pathD}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {/* Dot on hovered point */}
                        {hoveredSlotIndex !== null && modelSpline.points[hoveredSlotIndex] && (
                          <circle
                            cx={modelSpline.points[hoveredSlotIndex].x}
                            cy={modelSpline.points[hoveredSlotIndex].y}
                            r="4.5"
                            fill={strokeColor}
                            stroke="#141620"
                            strokeWidth="2"
                          />
                        )}
                      </g>
                    );
                  })}

                  {/* X Axis labels */}
                  {hourlySeries.map((slot, idx) => {
                    const stepX = (860 - 80) / (hourlySeries.length - 1);
                    const x = 40 + idx * stepX;
                    return (
                      <text
                        key={slot.slot}
                        x={x}
                        y={205}
                        textAnchor="middle"
                        fill="#73768a"
                        fontSize="10"
                        fontFamily="sans-serif"
                      >
                        {slot.slot}
                      </text>
                    );
                  })}
                </svg>

                {/* Floating Tooltip Box matching IOOAI screenshot */}
                {hoveredSlotIndex !== null && hourlySeries[hoveredSlotIndex] && (
                  <div
                    className="pointer-events-none absolute z-30 rounded-xl border border-white/10 bg-[#252836]/95 px-3.5 py-3 text-[11px] shadow-2xl backdrop-blur-md"
                    style={{
                      right: "30px",
                      bottom: "40px",
                      minWidth: "180px",
                    }}
                  >
                    <div className="font-semibold text-white mb-1.5">
                      {hourlySeries[hoveredSlotIndex].slot}
                    </div>
                    <div className="flex justify-between items-center text-neutral-300 mb-2 border-b border-white/10 pb-1.5">
                      <span>Tổng cộng:</span>
                      <span className="font-bold text-white">
                        {hourlySeries[hoveredSlotIndex].total}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {activeModels.map((m) => {
                        const cnt = hourlySeries[hoveredSlotIndex].byModel[m] || 0;
                        return (
                          <div key={m} className="flex items-center justify-between gap-3 text-neutral-300">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="inline-block h-2 w-2 rounded-sm"
                                style={{ backgroundColor: modelColors[m] || "#38bdf8" }}
                              />
                              <span className="truncate max-w-[130px]">{m}</span>
                            </div>
                            <span className="font-semibold text-white">{cnt}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Legends below Line Chart */}
              <div className="mt-2 flex flex-wrap items-center justify-center gap-5 pt-3 border-t border-white/[0.05] text-[11.5px] text-neutral-400">
                {activeModels.map((m) => (
                  <div key={m} className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-sm"
                      style={{ backgroundColor: modelColors[m] || "#38bdf8" }}
                    />
                    <span className="text-neutral-300">{m}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: PHÂN BỔ SỐ LƯỢT GỌI (DONUT CHART) */}
          {activeTab === "distribution" && (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="flex justify-center">
                <div className="relative h-[210px] w-[210px]">
                  <svg viewBox="0 0 200 200" className="h-full w-full">
                    {donutSlices.map((slice) => (
                      <path
                        key={slice.model}
                        d={slice.pathD}
                        fill={modelColors[slice.model] || "#38bdf8"}
                        className="transition-opacity hover:opacity-85"
                      />
                    ))}
                    {/* Inner hole for donut */}
                    <circle cx="100" cy="100" r="46" fill="#141620" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-[20px] font-bold text-white tracking-tight">
                      {data?.totalCalls || 0}
                    </span>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider">
                      Cuộc gọi
                    </span>
                  </div>
                </div>
              </div>

              {/* Breakdown Legend with Percentages */}
              <div className="space-y-2.5">
                <div className="text-[12.5px] font-medium text-neutral-300 mb-2">
                  Tỷ lệ đóng góp theo Model
                </div>
                {donutSlices.map((s) => (
                  <div
                    key={s.model}
                    className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5 text-[12px] transition hover:bg-white/[0.05]"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: modelColors[s.model] || "#38bdf8" }}
                      />
                      <span className="text-white font-medium">{s.model}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-neutral-400">{s.total} lượt</span>
                      <span className="font-semibold text-amber-300">{s.percent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: XẾP HẠNG SỐ LƯỢT GỌI (LEADERBOARD TABLE) */}
          {activeTab === "ranking" && (
            <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.08]">
              <table className="w-full text-left text-[12.5px]">
                <thead className="border-b border-white/[0.08] bg-[#0d0e14] text-[11px] uppercase tracking-wider text-neutral-400">
                  <tr>
                    <th className="px-4 py-3">Hạng</th>
                    <th className="px-4 py-3">Tên Model</th>
                    <th className="px-4 py-3">Loại</th>
                    <th className="px-4 py-3 text-right">Tổng gọi</th>
                    <th className="px-4 py-3 text-right">Thành công</th>
                    <th className="px-4 py-3 text-right">Thất bại</th>
                    <th className="px-4 py-3 text-right">Tỷ lệ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] bg-[#12131b]/60">
                  {data?.modelBreakdown.map((item, idx) => (
                    <tr key={item.rawModel} className="transition hover:bg-white/[0.03]">
                      <td className="px-4 py-3 font-semibold text-neutral-400">
                        #{idx + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-white flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-sm"
                          style={{ backgroundColor: modelColors[item.model] || "#38bdf8" }}
                        />
                        {item.model}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] text-neutral-300 uppercase">
                          {item.kind}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-white">
                        {item.total}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-400">
                        {item.succeeded}
                      </td>
                      <td className="px-4 py-3 text-right text-red-400">
                        {item.failed}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-amber-300">
                          {item.successRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
