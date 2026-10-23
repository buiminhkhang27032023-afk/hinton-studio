"use client";

import { withBasePath } from "@/lib/base-path";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Network,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  Play,
  Pause,
  Search,
  Crosshair,
  Volume2,
  VolumeX,
  Code2,
  ArrowRight,
  ArrowLeft,
  Flame,
  RefreshCw,
  X,
  Copy,
  Check,
  Compass,
  Activity,
  FolderGit2,
  Bug,
} from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { useUi } from "@/lib/ui-store";
import { SpiderWebResponse, WebNode3D } from "@/lib/brain-graph";
import { NeuralBrainCanvas } from "@/components/neural/NeuralBrainCanvas";
import { GrokbotSpiderDashboard } from "@/components/neural/GrokbotSpiderDashboard";

export default function SpiderBrainPage() {
  const { tr, toast } = useUi();

  const [displayStyle, setDisplayStyle] = useState<"grokbot_bento" | "three_web">("three_web");
  const [target, setTarget] = useState<"seecut" | "studio">("seecut");
  const [data, setData] = useState<SpiderWebResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedNode, setSelectedNode] = useState<WebNode3D | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRotate, setAutoRotate] = useState(false);
  const [autoCrawl, setAutoCrawl] = useState(true);
  const [pulseTrigger, setPulseTrigger] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch codebase spider web data - ONLY DEPENDS ON targetName, NEVER on selectedNode
  const fetchData = useCallback(async (targetName: "seecut" | "studio") => {
    setLoading(true);
    try {
      const res = await fetch(withBasePath(`/api/codebase-brain?target=${targetName}`));
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        toast(json.error || "Không thể tải cấu trúc mạng nhện", "error");
      }
    } catch {
      toast("Lỗi kết nối máy chủ quét mã nguồn", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initial and target-change load only
  useEffect(() => {
    fetchData(target);
    setSelectedNode(null);
  }, [target, fetchData]);

  // Copy code snippet
  const handleCopyCode = () => {
    if (!selectedNode?.snippet) return;
    navigator.clipboard.writeText(selectedNode.snippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast("Đã sao chép đoạn mã vào clipboard", "success");
  };

  // Trigger pulse wave
  const handleFirePulse = () => {
    setPulseTrigger((prev) => prev + 1);
    toast("⚡ Đã kích hoạt xung tơ nhện toàn mạng lưới!", "success");
  };

  // Top Hubs sorted strictly by connection degree ("càng nối nhiều cái cục đấy càng to")
  const topHubs = useMemo(() => {
    if (!data?.nodes) return [];
    return [...data.nodes].sort((a, b) => b.degree - a.degree).slice(0, 4);
  }, [data]);

  // Search filtered results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !data?.nodes) return [];
    const q = searchQuery.toLowerCase();
    return data.nodes
      .filter((n) => n.name.toLowerCase().includes(q) || n.file.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQuery, data]);

  return (
    <div className="relative flex h-[calc(100vh-3.5rem)] w-full flex-col overflow-hidden bg-ink-950 text-ink-100">
      {/* TOP CYBER HUD BAR */}
      <header className="z-20 flex flex-wrap items-center justify-between gap-3 border-b border-ink-800/80 bg-ink-900/80 px-4 py-2.5 backdrop-blur-md">
        {/* Title & Target Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-sky-500/20 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.25)]">
              <span className="text-lg">🕷️</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-wide text-ink-100 uppercase">
                  Mạng Nhện Quét Mã Nguồn 3D
                </h1>
                <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-mono font-medium text-cyan-400">
                  Spider Web Crawler
                </span>
              </div>
              <p className="text-[11px] text-ink-400">
                Nhện 3D bò dọc tơ nối giữa các thư mục & tập tin mã nguồn
              </p>
            </div>
          </div>

          {/* Dataset Switcher Pill */}
          <div className="ml-2 flex items-center rounded-lg border border-ink-700/80 bg-ink-850 p-0.5">
            <button
              onClick={() => setTarget("seecut")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                target === "seecut"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-ink-400 hover:text-ink-200"
              }`}
            >
              <Cpu size={13} />
              <span>SeeCut AI Engine (Python)</span>
              {target === "seecut" && data?.stats && (
                <span className="rounded bg-cyan-900/60 px-1 text-[10px] text-cyan-300">
                  {data.stats.totalNodes} nốt
                </span>
              )}
            </button>

            <button
              onClick={() => setTarget("studio")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                target === "studio"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                  : "text-ink-400 hover:text-ink-200"
              }`}
            >
              <Layers size={13} />
              <span>Hinton Studio Core (TS)</span>
              {target === "studio" && data?.stats && (
                <span className="rounded bg-purple-900/60 px-1 text-[10px] text-purple-300">
                  {data.stats.totalNodes} nốt
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Spider Controls & Global Actions */}
        <div className="flex items-center gap-2">
          {/* Display Style Switcher */}
          <div className="flex items-center rounded-lg border border-pink-500/40 bg-ink-850 p-0.5">
            <button
              onClick={() => setDisplayStyle("grokbot_bento")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition ${
                displayStyle === "grokbot_bento"
                  ? "bg-pink-500/25 text-pink-300 border border-pink-500/50 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                  : "text-ink-400 hover:text-ink-200"
              }`}
            >
              <span>🕷️ Bento Spider (Chuẩn Ảnh Mẫu)</span>
            </button>
            <button
              onClick={() => setDisplayStyle("three_web")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition ${
                displayStyle === "three_web"
                  ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(56,189,248,0.3)]"
                  : "text-ink-400 hover:text-ink-200"
              }`}
            >
              <span>🕸️ Mạng Nhện 3D</span>
            </button>
          </div>

          {/* Auto Crawl Toggle Button */}
          {displayStyle === "three_web" && (
            <button
              onClick={() => setAutoCrawl(!autoCrawl)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                autoCrawl
                  ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                  : "border-ink-700 bg-ink-850 text-ink-400 hover:text-ink-200"
              }`}
              title="Bật/Tắt chế độ nhện tự động bò tuần tra quét mã"
            >
              <span className={autoCrawl ? "animate-bounce" : ""}>🕷️</span>
              <span>{autoCrawl ? "Nhện Bò Quét Mã" : "Tự Động: Tắt"}</span>
            </button>
          )}

          {/* Pulse Trigger */}
          <button
            onClick={handleFirePulse}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.2)] transition hover:bg-cyan-500/25 active:scale-95"
            title="Kích hoạt xung điện lan tỏa qua các sợi tơ nhện"
          >
            <Zap size={14} className="text-cyan-400" />
            <span>Phát Xung Tơ Nhện</span>
          </button>

          {/* Auto Rotate Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
              autoRotate
                ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                : "border-ink-700 bg-ink-850 text-ink-400 hover:text-ink-200"
            }`}
            title={autoRotate ? "Tắt tự động xoay" : "Bật tự động xoay"}
          >
            {autoRotate ? <Pause size={14} /> : <Play size={14} />}
          </button>

          {/* Refresh Scanner */}
          <button
            onClick={() => fetchData(target)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-700 bg-ink-850 text-ink-400 transition hover:bg-ink-800 hover:text-ink-100"
            title="Quét lại cấu trúc mã nguồn"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* SUB-HEADER: DIRECTORY / MODULE FILTERS & TOP HUBS (Visible in 3D Web Mode) */}
      {displayStyle === "three_web" && (
        <div className="z-10 flex flex-wrap items-center justify-between gap-2 border-b border-ink-800/60 bg-ink-900/50 px-4 py-1.5 backdrop-blur-sm">
          {/* Module / Directory Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedModule("all")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                selectedModule === "all"
                  ? "bg-ink-100 text-ink-950 font-semibold"
                  : "text-ink-400 hover:bg-ink-800/60 hover:text-ink-200"
              }`}
            >
              Tất cả Thư mục
            </button>

            {data?.modules &&
              Object.entries(data.modules).map(([modKey, meta]) => {
                const active = selectedModule === modKey;
                return (
                  <button
                    key={modKey}
                    onClick={() => setSelectedModule(modKey)}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      active
                        ? "border text-ink-100 font-semibold shadow-sm"
                        : "text-ink-400 hover:bg-ink-800/50 hover:text-ink-200"
                    }`}
                    style={{
                      backgroundColor: active ? meta.bgGlow : "transparent",
                      borderColor: active ? meta.color : "transparent",
                    }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span>{meta.title}</span>
                  </button>
                );
              })}
          </div>

          {/* Quick Hub Focus Pills ("Càng nối nhiều cái cục đấy càng to") */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-ink-400">
              Nốt lớn nhất (nhiều liên kết):
            </span>
            <div className="flex items-center gap-1">
              {topHubs.map((hub) => (
                <button
                  key={hub.id}
                  onClick={() => setSelectedNode(hub)}
                  className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-mono transition ${
                    selectedNode?.id === hub.id
                      ? "border-amber-400 bg-amber-400/20 text-amber-300 font-bold"
                      : "border-ink-700/60 bg-ink-850/80 text-ink-300 hover:border-ink-500 hover:text-ink-100"
                  }`}
                  title={`Kích thước ${hub.radius}px, ${hub.degree} dây nối`}
                >
                  <Flame size={11} className="text-amber-400" />
                  <span>{hub.name}</span>
                  <span className="text-amber-400 font-bold">({hub.degree} dây)</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEWPORT: GROKBOT BENTO TELEMETRY OR 3D SPIDER WEB */}
      {displayStyle === "grokbot_bento" ? (
        <div className="flex-1 overflow-hidden">
          <GrokbotSpiderDashboard
            initialMode={target === "seecut" ? "crypto" : "codebase"}
            onInspectNode={(nodeId) => {
              const node = data?.nodes.find((n) => n.id === nodeId);
              if (node) {
                setSelectedNode(node);
                setDisplayStyle("three_web");
              }
            }}
          />
        </div>
      ) : (
        <div className="relative flex-1">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-ink-950/85 backdrop-blur-sm">
            <div className="relative flex items-center justify-center">
              <div className="h-20 w-20 animate-spin rounded-full border-2 border-cyan-500/20 border-t-cyan-400" />
              <span className="absolute text-2xl animate-pulse">🕷️</span>
            </div>
            <p className="mt-4 font-mono text-xs text-cyan-300">
              Đang dệt mạng nhện 3D & phân tích dây nối liên kết mã nguồn...
            </p>
          </div>
        )}

        {/* 3D Three.js WebGL Canvas with 3D Cyber Spider Model */}
        {data && (
          <NeuralBrainCanvas
            data={data}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            selectedModule={selectedModule}
            searchQuery={searchQuery}
            autoRotate={autoRotate}
            autoCrawl={autoCrawl}
            pulseTrigger={pulseTrigger}
          />
        )}

        {/* FLOATING TOP-LEFT SEARCH & STATS CARD */}
        <div className="pointer-events-auto absolute left-4 top-4 z-10 w-72 space-y-2">
          {/* Search Box */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="Tìm kiếm tập tin hoặc hàm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-ink-700/80 bg-ink-900/85 py-2 pl-9 pr-8 text-xs text-ink-100 placeholder:text-ink-500 shadow-xl backdrop-blur-md outline-none focus:border-cyan-500/60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-200"
              >
                <X size={13} />
              </button>
            )}

            {/* Dropdown Search Results */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-ink-700/80 bg-ink-900/95 p-1 shadow-2xl backdrop-blur-md">
                {searchResults.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      setSelectedNode(n);
                      setSearchQuery("");
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition hover:bg-ink-800/80"
                  >
                    <div className="truncate">
                      <div className="font-mono font-medium text-ink-100">{n.name}</div>
                      <div className="truncate text-[10px] text-ink-400">{n.file}</div>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] font-bold text-amber-400">
                      {n.degree} dây nối
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick HUD Metrics Badge */}
          {data?.stats && (
            <div className="rounded-xl border border-ink-800/80 bg-ink-900/80 p-3 shadow-xl backdrop-blur-md">
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="rounded-lg bg-ink-850/80 p-1.5 border border-ink-800">
                  <div className="text-[10px] text-ink-400">Tổng Nốt Mã Nguồn</div>
                  <div className="font-mono text-sm font-bold text-cyan-300">
                    {data.stats.totalNodes}
                  </div>
                </div>
                <div className="rounded-lg bg-ink-850/80 p-1.5 border border-ink-800">
                  <div className="text-[10px] text-ink-400">Dây Nối Liên Kết</div>
                  <div className="font-mono text-sm font-bold text-purple-300">
                    {data.stats.totalEdges}
                  </div>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between border-t border-ink-800/80 pt-2 text-[11px] text-ink-400">
                <span className="flex items-center gap-1">
                  <Flame size={12} className="text-amber-400" />
                  Cục to nhất:
                </span>
                <span className="font-mono font-bold text-amber-300">
                  {data.stats.topHubName} ({data.stats.topHubDegree} dây)
                </span>
              </div>
            </div>
          )}

          {/* Legend: Càng nối nhiều cái cục đấy càng to */}
          <div className="rounded-xl border border-ink-800/80 bg-ink-900/80 p-2.5 shadow-xl backdrop-blur-md text-[11px]">
            <div className="flex items-center justify-between font-semibold text-ink-200">
              <span>Quy luật kích thước:</span>
              <span className="text-[10px] text-amber-400 font-bold">
                Càng nối nhiều → Càng to
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-1 text-[10px] text-ink-400">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-ink-500" />
                <span>1 dây (9px)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-3.5 w-3.5 rounded-full bg-cyan-400" />
                <span>4 dây (25px)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-5 w-5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
                <span>8+ dây (36px)</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM-LEFT SPIDER STATUS HELPER */}
        <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-xl border border-ink-800/80 bg-ink-900/80 px-3 py-1.5 text-[11px] text-ink-400 shadow-xl backdrop-blur-md">
          <span className="text-base animate-bounce">🕷️</span>
          <span>
            {selectedNode
              ? `Nhện đang đậu & quét: ${selectedNode.name}`
              : autoCrawl
              ? "Nhện đang tự động bò quét dọc các dây nối mã nguồn"
              : "Bấm vào bất kỳ cục nào trên mạng nhện để cử nhện bò đến"}
          </span>
        </div>

        {/* SLIDE-OVER INSPECTOR DRAWER (RIGHT SIDE) */}
        {selectedNode && (
          <aside className="pointer-events-auto absolute bottom-4 right-4 top-4 z-20 flex w-96 flex-col rounded-2xl border border-ink-700/80 bg-ink-900/95 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-ink-800/80 p-4">
              <div className="flex items-center gap-2.5">
                <span
                  className="h-3 w-3 rounded-full shadow-[0_0_12px]"
                  style={{ backgroundColor: selectedNode.color, boxShadow: `0 0 12px ${selectedNode.color}` }}
                />
                <div>
                  <h3 className="font-mono text-sm font-bold text-ink-100">
                    {selectedNode.name}
                  </h3>
                  <div className="font-mono text-[11px] text-ink-400">
                    {selectedNode.file}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedNode(null)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink-700/80 bg-ink-800/80 text-ink-400 transition hover:bg-ink-750 hover:text-ink-100"
              >
                <X size={14} />
              </button>
            </div>

            {/* Drawer Body Scrollable */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4 text-xs">
              {/* Directory / Module Group Banner */}
              <div
                className="rounded-xl border p-3"
                style={{
                  backgroundColor: data?.modules[selectedNode.module]?.bgGlow || "rgba(56,189,248,0.1)",
                  borderColor: selectedNode.color,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink-100">
                    {data?.modules[selectedNode.module]?.title}
                  </span>
                  <span className="rounded bg-ink-950/60 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
                    {selectedNode.dir || "Thư mục gốc"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-ink-300">
                  {data?.modules[selectedNode.module]?.subtitle}
                </p>
              </div>

              {/* Connection Prominence Scale ("Càng nối nhiều cái cục đấy càng to") */}
              <div className="rounded-xl border border-ink-800 bg-ink-850/80 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink-200">Mật Độ Dây Nối Mạng Nhện</span>
                  <span
                    className="font-mono text-xs font-bold"
                    style={{ color: selectedNode.color }}
                  >
                    Bán kính 3D: {selectedNode.radius}px
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-ink-900/90 p-2 border border-ink-800">
                    <div className="text-[10px] text-ink-400">Tổng dây nối</div>
                    <div className="mt-0.5 font-mono text-base font-bold text-amber-400">
                      {selectedNode.degree}
                    </div>
                  </div>
                  <div className="rounded-lg bg-ink-900/90 p-2 border border-ink-800">
                    <div className="text-[10px] text-ink-400">Dây gọi tới</div>
                    <div className="mt-0.5 font-mono text-base font-bold text-emerald-400">
                      {selectedNode.inDegree}
                    </div>
                  </div>
                  <div className="rounded-lg bg-ink-900/90 p-2 border border-ink-800">
                    <div className="text-[10px] text-ink-400">Dây gọi đi</div>
                    <div className="mt-0.5 font-mono text-base font-bold text-rose-400">
                      {selectedNode.outDegree}
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 rounded-lg bg-ink-900/60 px-2.5 py-1.5 text-[11px] text-ink-300">
                  {selectedNode.radius >= 28 ? (
                    <span className="text-amber-300 font-medium">
                      👑 <b>Cục Trung Tâm Cực Đại:</b> Có {selectedNode.degree} dây tơ nhện neo vào, chi phối luồng xử lý chính.
                    </span>
                  ) : selectedNode.radius >= 20 ? (
                    <span className="text-cyan-300 font-medium">
                      ⚡ <b>Nốt Phân Phối Lớn:</b> Điểm trung chuyển của nhiều thư mục con.
                    </span>
                  ) : (
                    <span className="text-ink-400">
                      🔗 <b>Nốt Chức Năng:</b> Xử lý logic chuyên biệt.
                    </span>
                  )}
                </div>
              </div>

              {/* Upstream Callers (Các thư mục & file truyền dây nối vào đây) */}
              <div className="rounded-xl border border-ink-800 bg-ink-850/80 p-3">
                <div className="flex items-center justify-between text-ink-200">
                  <span className="font-semibold flex items-center gap-1.5">
                    <ArrowLeft size={13} className="text-emerald-400" />
                    Dây nối từ các nơi gọi đến ({selectedNode.incoming.length})
                  </span>
                  <span className="text-[10px] text-emerald-400">Nguồn gọi</span>
                </div>

                <div className="mt-2 space-y-1.5">
                  {selectedNode.incoming.length === 0 ? (
                    <div className="rounded-lg bg-ink-900/40 p-2 text-[11px] text-ink-500 italic">
                      Là điểm khởi phát ban đầu (Entry point / Root)
                    </div>
                  ) : (
                    selectedNode.incoming.map((srcId) => {
                      const srcNode = data?.nodes.find((n) => n.id === srcId);
                      return (
                        <button
                          key={srcId}
                          onClick={() => srcNode && setSelectedNode(srcNode)}
                          className="flex w-full items-center justify-between rounded-lg bg-ink-900/80 px-2.5 py-1.5 text-left text-[11px] transition hover:bg-emerald-950/40 hover:border-emerald-500/50 border border-transparent"
                        >
                          <span className="font-mono text-ink-200">{srcNode?.name || srcId}</span>
                          <span className="font-mono text-[10px] text-emerald-400">
                            → nối tới đây
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Downstream Dependencies (Các thư mục & file mà nốt này kéo dây tới) */}
              <div className="rounded-xl border border-ink-800 bg-ink-850/80 p-3">
                <div className="flex items-center justify-between text-ink-200">
                  <span className="font-semibold flex items-center gap-1.5">
                    <ArrowRight size={13} className="text-rose-400" />
                    Dây nối tới các nốt đích ({selectedNode.outgoing.length})
                  </span>
                  <span className="text-[10px] text-rose-400">Đích gọi</span>
                </div>

                <div className="mt-2 space-y-1.5">
                  {selectedNode.outgoing.length === 0 ? (
                    <div className="rounded-lg bg-ink-900/40 p-2 text-[11px] text-ink-500 italic">
                      Là nốt kết thúc (Terminal worker)
                    </div>
                  ) : (
                    selectedNode.outgoing.map((tgtId) => {
                      const tgtNode = data?.nodes.find((n) => n.id === tgtId);
                      return (
                        <button
                          key={tgtId}
                          onClick={() => tgtNode && setSelectedNode(tgtNode)}
                          className="flex w-full items-center justify-between rounded-lg bg-ink-900/80 px-2.5 py-1.5 text-left text-[11px] transition hover:bg-rose-950/40 hover:border-rose-500/50 border border-transparent"
                        >
                          <span className="font-mono text-ink-200">{tgtNode?.name || tgtId}</span>
                          <span className="font-mono text-[10px] text-rose-400">
                            nhận dây ←
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Code Snippet Viewer */}
              {selectedNode.snippet && (
                <div className="rounded-xl border border-ink-800 bg-ink-850/80 p-3">
                  <div className="flex items-center justify-between text-ink-200">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Code2 size={13} className="text-cyan-400" />
                      Trích đoạn mã nguồn (Dòng {selectedNode.line} - {selectedNode.endLine})
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1 rounded bg-ink-800 px-2 py-0.5 text-[10px] text-ink-300 transition hover:bg-ink-700 hover:text-ink-100"
                    >
                      {copiedCode ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      <span>{copiedCode ? "Đã chép" : "Sao chép"}</span>
                    </button>
                  </div>

                  <pre className="mt-2 max-h-52 overflow-x-auto rounded-lg bg-ink-950/90 p-2.5 font-mono text-[10.5px] leading-relaxed text-cyan-200/90">
                    <code>{selectedNode.snippet}</code>
                  </pre>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="border-t border-ink-800/80 p-3">
              <button
                onClick={handleFirePulse}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-xs font-bold text-ink-950 shadow-[0_0_20px_rgba(56,189,248,0.3)] transition hover:brightness-110 active:scale-98"
              >
                <Zap size={14} className="text-ink-950" />
                <span>Phát Xung Tơ Nhện Từ Nốt Này</span>
              </button>
            </div>
          </aside>
        )}
      </div>
      )}
    </div>
  );
}
