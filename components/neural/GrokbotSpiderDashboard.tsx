"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  ArrowRight,
  Shield,
  Eye,
  Sliders,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  Terminal,
  FileCode,
  Flame,
} from "lucide-react";

interface GrokbotSpiderDashboardProps {
  initialMode?: "crypto" | "codebase";
  onInspectNode?: (nodeId: string) => void;
}

interface TapeRow {
  id: string;
  time: string;
  size: string;
  price: string;
  value: string;
  isProfit?: boolean;
  highlight?: boolean;
}

export function GrokbotSpiderDashboard({
  initialMode = "crypto",
  onInspectNode,
}: GrokbotSpiderDashboardProps) {
  const [mode, setMode] = useState<"crypto" | "codebase">(initialMode);
  const [viewFormat, setViewFormat] = useState<"mobile_9_16" | "desktop_full">("mobile_9_16");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeLegIndex, setActiveLegIndex] = useState(0);
  const [priceTick, setPriceTick] = useState(88932.32);
  const [selectedRowId, setSelectedRowId] = useState<string>("row-0");
  const [shockwave, setShockwave] = useState(false);

  // Play sound synthesized with Web Audio
  const playSound = useCallback(
    (freq = 480, duration = 0.06) => {
      if (!soundEnabled) return;
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch {
        // audio unavailable
      }
    },
    [soundEnabled]
  );

  // Activity tape rows data
  const [tapeRows, setTapeRows] = useState<TapeRow[]>([
    { id: "row-0", time: "02:48:20", size: "0.1500 BTC", price: "88,932.32", value: "$13,339.85", highlight: true },
    { id: "row-1", time: "02:48:05", size: "0.0100 BTC", price: "88,915.50", value: "$889.15" },
    { id: "row-2", time: "02:47:37", size: "0.6000 BTC", price: "88,901.00", value: "$53,340.60" },
    { id: "row-3", time: "02:47:22", size: "0.0006 BTC", price: "88,880.20", value: "$53.32" },
    { id: "row-4", time: "02:46:55", size: "0.0687 BTC", price: "87,837.00", value: "$6,034.40" },
    { id: "row-5", time: "02:46:21", size: "0.6011 BTC", price: "88,187.10", value: "$53,009.26" },
    { id: "row-6", time: "02:45:54", size: "0.8711 BTC", price: "88,104.17", value: "$76,748.12" },
    { id: "row-7", time: "02:45:00", size: "0.7500 BTC", price: "88,279.79", value: "$66,209.84" },
    { id: "row-8", time: "02:44:45", size: "0.1500 BTC", price: "87,838.45", value: "$13,175.76" },
    { id: "row-9", time: "02:44:10", size: "0.4500 BTC", price: "87,147.67", value: "$39,216.45" },
  ]);

  // Spider legs radiating coordinates around center (cx: 80, cy: 75)
  const spiderLegs = useMemo(() => {
    const cx = 80;
    const cy = 75;
    const count = 10;
    const legs = [];

    // Specific angles radiating around the box: top-left, top, top-right, bottom-left, bottom, bottom-right
    const angles = [
      -160, -130, -90, -50, -20,
      20, 60, 100, 140, 175,
    ];

    for (let i = 0; i < count; i++) {
      const rad = (angles[i] * Math.PI) / 180;
      const dist = 55 + (i % 3) * 12;
      const x2 = cx + Math.cos(rad) * dist;
      const y2 = cy + Math.sin(rad) * dist;
      legs.push({ id: i, x1: cx, y1: cy, x2, y2, angle: angles[i] });
    }
    return legs;
  }, []);

  // Animation cycle for spider crawler legs & tape ticker
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      // Step spider active leg
      setActiveLegIndex((prev) => (prev + 1) % spiderLegs.length);

      // Micro price fluctuation
      const delta = (Math.random() - 0.52) * 18;
      setPriceTick((p) => +(p + delta).toFixed(2));

      // Occasional tape update
      if (Math.random() > 0.45) {
        playSound(820, 0.03);
      }
    }, 450);

    return () => clearInterval(interval);
  }, [isPlaying, spiderLegs.length, playSound]);

  // Trigger Short / Burst shockwave
  const handleTriggerAction = () => {
    setShockwave(true);
    playSound(320, 0.2);
    setTimeout(() => setShockwave(false), 900);
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-start overflow-y-auto bg-black p-2 md:p-4 select-none font-sans text-ink-100">
      {/* TOP CONTROLS & FORMAT TOGGLE */}
      <div className="mb-3 flex w-full max-w-5xl items-center justify-between gap-2 rounded-xl border border-ink-800/80 bg-ink-900/85 px-4 py-2 text-xs shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/40 shadow-[0_0_10px_rgba(244,63,94,0.3)]">
            <Sparkles size={14} />
          </div>
          <div>
            <span className="font-bold text-ink-100">SPIDER CRAWLER BENTO TELEMETRY</span>
            <span className="ml-2 rounded bg-pink-500/10 px-1.5 py-0.5 font-mono text-[10px] text-pink-300 border border-pink-500/30">
              TikTok viral 9:16 layout
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center rounded-lg border border-ink-700 bg-ink-850 p-0.5">
            <button
              onClick={() => setMode("crypto")}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                mode === "crypto"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-ink-400 hover:text-ink-200"
              }`}
            >
              GrokBot + JEV (Chuẩn Video)
            </button>
            <button
              onClick={() => setMode("codebase")}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                mode === "codebase"
                  ? "bg-pink-500/20 text-pink-300 border border-pink-500/40"
                  : "text-ink-400 hover:text-ink-200"
              }`}
            >
              SeeCut Codebase Crawler
            </button>
          </div>

          {/* Aspect Ratio Switcher */}
          <button
            onClick={() =>
              setViewFormat(viewFormat === "mobile_9_16" ? "desktop_full" : "mobile_9_16")
            }
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] transition ${
              viewFormat === "mobile_9_16"
                ? "border-pink-500/50 bg-pink-500/15 text-pink-300 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                : "border-ink-700 bg-ink-850 text-ink-300 hover:text-ink-100"
            }`}
          >
            {viewFormat === "mobile_9_16" ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            <span>{viewFormat === "mobile_9_16" ? "Khung Dọc 9:16" : "Tràn Màn Hình"}</span>
          </button>

          {/* Audio */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
              soundEnabled
                ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                : "border-ink-700 bg-ink-850 text-ink-400"
            }`}
            title="Âm thanh nhịp đập"
          >
            {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>
        </div>
      </div>

      {/* MAIN CONTAINER: 9:16 FRAME OR FULLSCREEN */}
      <div
        className={`relative flex flex-col justify-between overflow-hidden border border-cyan-500/30 bg-[#070b14] shadow-[0_0_35px_rgba(2,132,199,0.25)] transition-all duration-300 ${
          viewFormat === "mobile_9_16"
            ? "w-full max-w-[460px] aspect-[9/16] rounded-3xl p-3 md:p-4"
            : "w-full max-w-5xl rounded-2xl p-4 md:p-6"
        } ${shockwave ? "ring-4 ring-pink-500 shadow-[0_0_50px_rgba(244,63,94,0.6)]" : ""}`}
      >
        {/* Subtle grid background */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />

        {/* 1. TOP HEADER: GROKBOT + JEV + STATUS PILLS */}
        <div className="relative z-10 space-y-2">
          {/* Main Top Nav Line */}
          <div className="flex items-center justify-between border-b border-ink-800/80 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-pink-500/20 border border-pink-500/40 text-pink-400 shadow-[0_0_8px_#f43f5e]">
                <span className="font-mono text-xs font-black">🤖</span>
              </div>
              <span className="font-mono text-xs font-bold tracking-wider text-ink-100">
                {mode === "crypto" ? "GROKBOT + JEV" : "SEECUT + CRAWLER"}
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono text-[10px] text-ink-400">
              <span className="rounded bg-ink-850 px-1.5 py-0.5 border border-ink-800 text-cyan-400">
                02:49 UTC
              </span>
              <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
            </div>
          </div>

          {/* Status Row (6 Pill Cards) */}
          <div className="grid grid-cols-6 gap-1 md:gap-1.5 text-[9px] font-mono">
            {/* CHIEF */}
            <div className="rounded-lg border border-ink-800 bg-[#0c1322]/90 p-1.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-ink-400">
                <span className="text-white font-bold">CHIEF</span>
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </div>
              <div className="mt-1 text-[8px] text-ink-400 truncate">WAIT 2 PERIODS</div>
              <div className="mt-1 inline-block rounded bg-pink-500/20 px-1 py-0.2 text-[8px] font-bold text-pink-300 text-center border border-pink-500/40">
                SHORT
              </div>
            </div>

            {/* SCAN */}
            <div className="rounded-lg border border-emerald-500/30 bg-[#0c1322]/90 p-1.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-400">
                <span className="font-bold">SCAN</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#10b981]" />
              </div>
              <div className="mt-0.5 text-xs font-bold text-emerald-300">0.75</div>
              <div className="text-[7.5px] text-ink-400 truncate">MATCH EXTRACTED</div>
            </div>

            {/* VET */}
            <div className="rounded-lg border border-rose-500/30 bg-[#0c1322]/90 p-1.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-rose-400">
                <span className="font-bold">VET</span>
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              </div>
              <div className="mt-0.5 text-xs font-bold text-rose-300">0.00</div>
              <div className="text-[7.5px] text-ink-400 truncate">AUTO PASS</div>
            </div>

            {/* SIZE */}
            <div className="rounded-lg border border-pink-500/30 bg-[#0c1322]/90 p-1.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-pink-400">
                <span className="font-bold">SIZE</span>
                <span className="text-[8px] text-pink-400">▲</span>
              </div>
              <div className="mt-0.5 text-[10.5px] font-bold text-pink-300 truncate">
                $70,577.60
              </div>
              <div className="text-[7.5px] text-ink-400 truncate">MARGIN 75%</div>
            </div>

            {/* FILLS */}
            <div className="rounded-lg border border-cyan-500/30 bg-[#0c1322]/90 p-1.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-cyan-400">
                <span className="font-bold">FILLS</span>
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_4px_#38bdf8]" />
              </div>
              <div className="mt-0.5 text-[10px] font-bold text-cyan-300 truncate">
                @ {priceTick.toLocaleString()}
              </div>
              <div className="text-[7.5px] text-ink-400 truncate">EXEC READY</div>
            </div>

            {/* RISK */}
            <div className="rounded-lg border border-amber-500/30 bg-[#0c1322]/90 p-1.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-amber-400">
                <span className="font-bold">RISK</span>
                <span className="text-[8px] text-amber-400">■</span>
              </div>
              <div className="mt-0.5 text-[10.5px] font-bold text-amber-300">6M 1L</div>
              <div className="text-[7.5px] text-ink-400 truncate">STOP -0.7%</div>
            </div>
          </div>
        </div>

        {/* 2. CENTER SECTION: CANDLESTICK & DOTTED PLUNGE CHART */}
        <div className="relative z-10 my-2 rounded-2xl border border-ink-800/80 bg-[#0a101d]/90 p-3 shadow-inner">
          {/* Chart Header */}
          <div className="flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">
                {mode === "crypto" ? "BTC / USDT" : "PIPELINE / SEECUT"}
              </span>
              <span className="text-cyan-400 font-bold">{priceTick.toLocaleString()}</span>
              <span className="rounded bg-rose-500/20 px-1 py-0.5 text-[9px] font-bold text-rose-300 border border-rose-500/30">
                -4.82%
              </span>
            </div>

            <div className="flex items-center gap-1 text-[10px] text-ink-400">
              <span className="text-ink-300">24H VOL $25.43B</span>
              <div className="ml-1 flex gap-0.5">
                {["1m", "5m", "15m", "1h"].map((t, idx) => (
                  <span
                    key={t}
                    className={`rounded px-1 py-0.5 ${
                      idx === 2 ? "bg-cyan-500/30 text-cyan-300 font-bold" : "text-ink-500"
                    }`}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* SVG Canvas Chart (Dotted Trajectory + Plunging Candlesticks) */}
          <div className="relative mt-2 h-44 w-full">
            {/* Apex Callout Tag */}
            <div className="absolute left-[54%] top-[12%] -translate-x-1/2 z-20 flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-950/80 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              <TrendingUp size={10} />
              <span>+9439.19</span>
            </div>

            <svg className="h-full w-full overflow-visible" viewBox="0 0 400 160">
              <defs>
                <linearGradient id="cyanLineGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="65%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
                <linearGradient id="areaGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              <line x1="0" y1="30" x2="400" y2="30" stroke="#1e293b" strokeDasharray="3 3" opacity="0.6" />
              <line x1="0" y1="75" x2="400" y2="75" stroke="#1e293b" strokeDasharray="3 3" opacity="0.6" />
              <line x1="0" y1="120" x2="400" y2="120" stroke="#1e293b" strokeDasharray="3 3" opacity="0.6" />

              {/* Background gradient curve */}
              <path
                d="M 10 120 Q 70 100, 120 70 T 210 28 T 260 70 L 310 110 L 370 145 L 390 150 L 390 160 L 10 160 Z"
                fill="url(#areaGlow)"
              />

              {/* Main Dotted Rising Trajectory (Cyan dots) */}
              {[
                [10, 120], [25, 112], [40, 102], [55, 94], [70, 85],
                [85, 76], [100, 68], [115, 60], [130, 52], [145, 45],
                [160, 39], [175, 34], [190, 30], [205, 28], [220, 32],
                [235, 42], [250, 58], [265, 78],
              ].map(([x, y], idx) => (
                <circle
                  key={idx}
                  cx={x}
                  cy={y}
                  r="2.2"
                  fill="#38bdf8"
                  className="transition-all duration-300"
                  style={{
                    filter: "drop-shadow(0 0 3px #38bdf8)",
                    opacity: 0.85 + Math.sin(idx * 0.4) * 0.15,
                  }}
                />
              ))}

              {/* Plunging Red Candlesticks on the right (The signature red plunge!) */}
              {[
                { x: 275, open: 76, close: 92, high: 72, low: 96, isRed: true },
                { x: 290, open: 92, close: 110, high: 88, low: 115, isRed: true },
                { x: 305, open: 108, close: 102, high: 98, low: 112, isRed: false },
                { x: 320, open: 103, close: 124, high: 99, low: 128, isRed: true },
                { x: 335, open: 124, close: 140, high: 120, low: 145, isRed: true },
                { x: 350, open: 138, close: 148, high: 134, low: 152, isRed: true },
                { x: 365, open: 146, close: 139, high: 135, low: 150, isRed: false },
                { x: 380, open: 140, close: 154, high: 136, low: 158, isRed: true },
              ].map((c, idx) => {
                const color = c.isRed ? "#f43f5e" : "#10b981";
                const y = Math.min(c.open, c.close);
                const h = Math.max(3, Math.abs(c.open - c.close));
                return (
                  <g key={idx}>
                    {/* Wick */}
                    <line x1={c.x} y1={c.high} x2={c.x} y2={c.low} stroke={color} strokeWidth="1.2" />
                    {/* Body */}
                    <rect
                      x={c.x - 3.5}
                      y={y}
                      width="7"
                      height={h}
                      fill={color}
                      rx="1"
                      style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                    />
                  </g>
                );
              })}

              {/* Bottom Volume Bars */}
              {[
                { x: 20, h: 12, col: "#475569" }, { x: 40, h: 18, col: "#475569" },
                { x: 60, h: 25, col: "#38bdf8" }, { x: 80, h: 16, col: "#475569" },
                { x: 100, h: 32, col: "#38bdf8" }, { x: 120, h: 28, col: "#475569" },
                { x: 140, h: 36, col: "#38bdf8" }, { x: 160, h: 22, col: "#475569" },
                { x: 180, h: 42, col: "#38bdf8" }, { x: 200, h: 30, col: "#475569" },
                { x: 220, h: 26, col: "#475569" }, { x: 240, h: 38, col: "#38bdf8" },
                { x: 260, h: 48, col: "#f43f5e" }, { x: 280, h: 62, col: "#f43f5e" },
                { x: 300, h: 54, col: "#f43f5e" }, { x: 320, h: 72, col: "#f43f5e" },
                { x: 340, h: 80, col: "#f43f5e" }, { x: 360, h: 68, col: "#f43f5e" },
                { x: 380, h: 85, col: "#f43f5e" },
              ].map((v, idx) => (
                <rect
                  key={idx}
                  x={v.x - 2}
                  y={160 - v.h * 0.45}
                  width="4"
                  height={v.h * 0.45}
                  fill={v.col}
                  opacity="0.65"
                  rx="0.5"
                />
              ))}
            </svg>
          </div>
        </div>

        {/* 3. BIG METRIC BANNER: $4,853.14 & GAIN TAG */}
        <div className="relative z-10 flex items-center justify-between border-y border-ink-800/80 py-2 px-1 font-mono">
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-black text-emerald-400 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              +9439.19
            </span>
            <span className="text-[10px] text-ink-400">BALANCE LIVE</span>
          </div>

          <div className="text-right">
            <div className="text-xl md:text-2xl font-black tracking-tight text-white drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]">
              $4,853.14
            </div>
            <div className="text-[9px] text-ink-400">
              +$1,235.78 <span className="text-ink-600">|</span> FEE $200.00{" "}
              <span className="text-ink-600">|</span>{" "}
              <span className="text-cyan-400 font-bold">NET $2,617.36</span>
            </div>
          </div>
        </div>

        {/* 4. LOWER 3-COLUMN BENTO ROW: ACTIVITY TAPE | SPIDER CRAWLER | JEV VERDICT */}
        <div className="relative z-10 mt-2 grid grid-cols-12 gap-2 text-xs">
          {/* COLUMN 1: ACTIVITY TAPE (LEFT 5 COLS) */}
          <div className="col-span-5 flex flex-col rounded-xl border border-ink-800 bg-[#0a101d]/90 p-2 shadow-inner">
            <div className="flex items-center justify-between border-b border-ink-800 pb-1 font-mono text-[9px] font-bold text-ink-300">
              <span>Activity tape</span>
              <span className="text-[8px] text-cyan-400">LIVE FEED</span>
            </div>

            {/* Micro Column Headers */}
            <div className="mt-1 grid grid-cols-4 font-mono text-[7.5px] text-ink-500">
              <span>TIME</span>
              <span>SIZE</span>
              <span>PRICE</span>
              <span className="text-right">VAL</span>
            </div>

            {/* Scrolling / Selected Rows */}
            <div className="mt-1 space-y-1 overflow-y-auto max-h-36 pr-0.5">
              {tapeRows.map((row) => {
                const isSelected = selectedRowId === row.id;
                return (
                  <div
                    key={row.id}
                    onClick={() => {
                      setSelectedRowId(row.id);
                      playSound(720, 0.04);
                    }}
                    className={`relative grid grid-cols-4 rounded px-1 py-0.5 font-mono text-[8px] transition cursor-pointer ${
                      isSelected
                        ? "border border-pink-500 bg-pink-500/15 text-pink-200 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                        : "text-ink-400 hover:bg-ink-800/40 hover:text-ink-200"
                    }`}
                  >
                    {/* Active highlight tag */}
                    {isSelected && (
                      <span className="absolute -left-1 -top-2 rounded bg-pink-500 px-1 py-0.2 text-[7px] font-bold text-black shadow">
                        +$13398
                      </span>
                    )}
                    <span className="truncate">{row.time}</span>
                    <span className="truncate text-ink-300">{row.size}</span>
                    <span className="truncate text-cyan-400 font-bold">{row.price}</span>
                    <span className="truncate text-right text-emerald-400">{row.value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUMN 2: THE SPIDER CRAWLER WIDGET (CENTER 3.5 COLS) */}
          <div className="col-span-3 flex flex-col items-center justify-between rounded-xl border border-pink-500/40 bg-[#0a101d]/90 p-2 shadow-[0_0_15px_rgba(244,63,94,0.15)] relative overflow-hidden">
            <div className="w-full flex items-center justify-between font-mono text-[9px] font-bold text-pink-300">
              <span className="flex items-center gap-1">
                <span>🕷️</span> CRAWLER
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-pink-500 animate-ping" />
            </div>

            {/* Interactive Spider Radial Node SVG */}
            <div className="relative my-auto h-28 w-28 flex items-center justify-center">
              <svg className="h-full w-full overflow-visible" viewBox="0 0 160 150">
                {/* Spider Web Legs extending outward */}
                {spiderLegs.map((leg, idx) => {
                  const isActive = activeLegIndex === idx;
                  const strokeCol = isActive ? "#f43f5e" : "#0284c7";
                  return (
                    <g key={leg.id}>
                      {/* Connecting silk thread */}
                      <line
                        x1={leg.x1}
                        y1={leg.y1}
                        x2={leg.x2}
                        y2={leg.y2}
                        stroke={strokeCol}
                        strokeWidth={isActive ? "2.2" : "1.2"}
                        strokeDasharray={isActive ? "none" : "2 2"}
                        opacity={isActive ? 1 : 0.45}
                        className="transition-all duration-200"
                      />
                      {/* Satellite Node Dot */}
                      <circle
                        cx={leg.x2}
                        cy={leg.y2}
                        r={isActive ? 4 : 2.5}
                        fill={isActive ? "#f43f5e" : "#38bdf8"}
                        style={{
                          filter: isActive ? "drop-shadow(0 0 6px #f43f5e)" : "none",
                        }}
                      />
                    </g>
                  );
                })}

                {/* Central Pink Glowing Spider Core Box [ · ] */}
                <rect
                  x="68"
                  y="63"
                  width="24"
                  height="24"
                  rx="4"
                  fill="#0f172a"
                  stroke="#f43f5e"
                  strokeWidth="2"
                  style={{ filter: "drop-shadow(0 0 10px #f43f5e)" }}
                />
                <circle cx="80" cy="75" r="4.5" fill="#f43f5e" className="animate-pulse" />
              </svg>
            </div>

            {/* Note badge */}
            <div className="w-full text-center font-mono text-[7px] text-pink-300 font-bold bg-pink-500/10 rounded py-0.5 border border-pink-500/30 truncate">
              LEAVES 3-WORD NOTE
            </div>
          </div>

          {/* COLUMN 3: JEV · VERDICT (RIGHT 4 COLS) */}
          <div className="col-span-4 flex flex-col justify-between rounded-xl border border-ink-800 bg-[#0a101d]/90 p-2 shadow-inner">
            <div>
              <div className="flex items-center justify-between border-b border-ink-800 pb-1 font-mono text-[9px] font-bold text-ink-300">
                <span>JEV · verdict</span>
                <span className="text-[7.5px] text-ink-500">THRESH 85.2%</span>
              </div>

              {/* Progress Bar Rows */}
              <div className="mt-1.5 space-y-1.5 font-mono text-[8px]">
                {/* depth_test_usd */}
                <div>
                  <div className="flex justify-between text-ink-400 text-[7px]">
                    <span className="truncate">depth_test_usd</span>
                    <span className="text-cyan-300 font-bold">$250.3M</span>
                  </div>
                  <div className="mt-0.5 h-1.5 w-full rounded bg-ink-800 overflow-hidden">
                    <div className="h-full w-[82%] bg-cyan-400 rounded shadow-[0_0_4px_#38bdf8]" />
                  </div>
                </div>

                {/* oi_change_1h */}
                <div>
                  <div className="flex justify-between text-ink-400 text-[7px]">
                    <span className="truncate">oi_change_1h</span>
                    <span className="text-emerald-400 font-bold">+2.45%</span>
                  </div>
                  <div className="mt-0.5 h-1.5 w-full rounded bg-ink-800 overflow-hidden">
                    <div className="h-full w-[64%] bg-emerald-400 rounded" />
                  </div>
                </div>

                {/* funding_rate */}
                <div>
                  <div className="flex justify-between text-ink-400 text-[7px]">
                    <span className="truncate">funding_rate</span>
                    <span className="text-rose-400 font-bold">-0.012%</span>
                  </div>
                  <div className="mt-0.5 h-1.5 w-full rounded bg-ink-800 overflow-hidden">
                    <div className="h-full w-[38%] bg-rose-400 rounded" />
                  </div>
                </div>

                {/* liq_clusters_usd */}
                <div>
                  <div className="flex justify-between text-ink-400 text-[7px]">
                    <span className="truncate">liq_clusters</span>
                    <span className="text-amber-400 font-bold">$53.5M</span>
                  </div>
                  <div className="mt-0.5 h-1.5 w-full rounded bg-ink-800 overflow-hidden">
                    <div className="h-full w-[74%] bg-amber-400 rounded" />
                  </div>
                </div>
              </div>
            </div>

            {/* Giant Action Pill: SHORT $70,577.60 -> */}
            <button
              onClick={handleTriggerAction}
              className="mt-2 flex w-full flex-col items-center justify-center rounded-lg bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 p-1.5 text-white shadow-[0_0_18px_rgba(244,63,94,0.5)] transition hover:brightness-110 active:scale-95"
            >
              <div className="flex items-center gap-1 font-mono text-[7.5px] text-pink-200 font-bold">
                <span>PARSED</span>
                <span>•</span>
                <span>CONFIDENCE &gt; 91%</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-black tracking-tight">
                <span>SHORT $70,577.60</span>
                <ArrowRight size={12} className="animate-pulse" />
              </div>
            </button>
          </div>
        </div>

        {/* BOTTOM TIMELINE SCRUBBER (Identical to TikTok Video scrubber) */}
        <div className="relative z-10 mt-3 pt-2 border-t border-ink-800/80 flex items-center justify-between font-mono text-[9px] text-ink-400">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-ink-300">AURA FARMING ACTIVE</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-1 w-28 rounded-full bg-ink-800 overflow-hidden">
              <div className="h-full w-[45%] bg-white rounded-full" />
            </div>
            <span>00:05 / 00:11</span>
          </div>
        </div>
      </div>
    </div>
  );
}
