"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Clapperboard,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Info,
  Film,
  Shirt,
  Swords,
  Copy,
  Check,
  Layers,
  ArrowRight,
  Zap,
  Camera,
  Clock,
  Layout,
  RefreshCw,
  Eye,
  Sliders,
  Sparkle,
} from "lucide-react";
import clsx from "clsx";
import type { ProductionPlan } from "@/app/api/script-director/route";

interface ScriptDirectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  onApplyPlan: (plan: ProductionPlan) => void;
}

const PRESET_SCRIPTS = [
  {
    id: "lookbook_3_outfits",
    label: "👔 Lookbook 3 Bộ Đồ (15s)",
    script: `Video lookbook 15s cho người mẫu nam.
Cảnh 1 (0-5s): Toàn cảnh bước vào khách sạn 5 sao sang trọng trong bộ vest đen, camera lia góc thấp.
Cảnh 2 (5-10s): Đổi sang áo khoác da biker jacket, bước đi tự tin trong hành lang neon, góc máy trung cảnh tracking.
Cảnh 3 (10-15s): Đổi sang áo len cổ lọ cashmere màu be, xoay người nhìn vào ống kính mỉm cười nhẹ.
Yêu cầu: Giữ nguyên khuôn mặt người mẫu, đổi trang phục đúng nhịp cắt thẳng theo nhạc, chèn nhãn giá BST Thu Đông ở góc dưới.`,
    duration: 15,
    aspect: "9:16" as const,
    model: "iooai:omni_flash_10s",
  },
  {
    id: "combat_action_15s",
    label: "⚔️ Phim Hành Động 15s",
    script: `Phim ngắn hành động chiến đấu 15s cho nhân vật nam chiến binh.
Cảnh 1 (0-5s): Đứng giữa đấu trường đổ nát, dứt khoát rút song đao ra thủ thế, ánh mắt sắc bén, camera lượn quanh 180 độ.
Cảnh 2 (5-10s): Lao vọt tới né tránh luồng năng lượng địch, lộn nhào tung một nhát chém cực mạnh xé toạc không gian, camera whip-pan lia nhanh theo nhát chém.
Cảnh 3 (10-15s): Tiếp đất dứt khoát làm nứt mặt đất, khói bụi bốc lên, tra đao vào bao, camera từ từ đẩy lại gần khuôn mặt uy nghiêm.`,
    duration: 15,
    aspect: "16:9" as const,
    model: "iooai:seedance2.5 快速版",
  },
  {
    id: "luxury_commercial_10s",
    label: "🏙️ TVC Thời Trang Đô Thị (10s)",
    script: `TVC quảng cáo thời trang cao cấp 10s.
Cảnh 1 (0-5s): Người mẫu sải bước tự tin trên đường phố Paris lúc hoàng hôn, áo măng tô màu camel tung bay nhẹ, camera dolly lùi trước mặt.
Cảnh 2 (5-10s): Dừng lại trước cổng vòm kính phản chiếu ánh đèn vàng ấm, quay đầu nhìn thẳng ống kính với thần thái cuốn hút, cận cảnh nét mặt sắc nét 35mm.`,
    duration: 10,
    aspect: "9:16" as const,
    model: "iooai:omni_flash_10s",
  },
];

export function ScriptDirectorModal({ isOpen, onClose, projectId, onApplyPlan }: ScriptDirectorModalProps) {
  const [script, setScript] = useState(PRESET_SCRIPTS[0].script);
  const [targetDuration, setTargetDuration] = useState<number>(15);
  const [targetAspect, setTargetAspect] = useState<"9:16" | "16:9" | "1:1">("9:16");
  const [targetModel, setTargetModel] = useState<string>("auto");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<ProductionPlan | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Available project assets
  const [assets, setAssets] = useState<Array<{ id: string; name: string; url: string; mime?: string; kind?: string }>>([]);

  useEffect(() => {
    if (!isOpen || !projectId) return;
    fetch(`/api/assets?projectId=${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAssets(data.filter((a) => a.kind === "image" || a.mime?.startsWith("image/")));
        }
      })
      .catch(() => {});
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!script.trim()) {
      setError("Vui lòng nhập nội dung kịch bản.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/script-director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: script.trim(),
          projectId,
          targetDuration,
          targetAspect,
          targetModel: targetModel === "auto" ? undefined : targetModel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể phân tích kịch bản.");
      }

      setPlan(data.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi phân tích kịch bản.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrompt = () => {
    if (!plan?.master_prompt_unified) return;
    navigator.clipboard.writeText(plan.master_prompt_unified);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleApply = () => {
    if (!plan) return;
    onApplyPlan(plan);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#121217] shadow-2xl text-ink-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-[#16161e]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Clapperboard size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold tracking-tight text-white">Đạo Diễn Kịch Bản Flova (Script Director)</h2>
                <span className="rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-2.5 py-0.5 text-[10.5px] font-medium text-amber-300 border border-amber-500/30">
                  Flova AI Engine
                </span>
              </div>
              <p className="text-[12px] text-ink-400">
                Đọc hiểu kịch bản tự do → Bóc tách thực thể & trang phục → Kiểm tra ràng buộc Model AI → Lập kế hoạch phân cảnh sản xuất
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-ink-400 hover:bg-white/10 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body - 2 Columns */}
        <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-12">
          {/* Left Column: Input Script & Configurations (5 cols) */}
          <div className="flex flex-col border-r border-white/10 bg-[#14141a] p-5 overflow-y-auto md:col-span-5 space-y-4">
            {/* Quick Templates */}
            <div>
              <label className="text-[12px] font-medium text-ink-300 flex items-center gap-1.5 mb-2">
                <Sparkles size={13} className="text-amber-400" />
                Mẫu kịch bản tham khảo nhanh:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_SCRIPTS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setScript(preset.script);
                      setTargetDuration(preset.duration);
                      setTargetAspect(preset.aspect);
                      setTargetModel(preset.model);
                    }}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11.5px] text-ink-200 hover:bg-amber-500/10 hover:text-amber-300 hover:border-amber-500/30 transition text-left"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Script Textarea */}
            <div className="flex-1 flex flex-col min-h-[220px]">
              <label className="text-[12px] font-medium text-ink-300 flex items-center justify-between mb-2">
                <span>Nội dung kịch bản / Ý tưởng:</span>
                <span className="text-[11px] text-ink-500">Hỗ trợ tiếng Việt hoặc tiếng Anh</span>
              </label>
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Nhập kịch bản, lời dẫn, các cảnh quay hoặc yêu cầu diễn xuất... Ví dụ: Người mẫu nam bước vào sảnh khách sạn trong bộ vest, sau đó đổi sang áo da đi dạo đêm..."
                className="w-full flex-1 rounded-xl border border-white/10 bg-black/40 p-3.5 text-[13px] text-ink-100 placeholder:text-ink-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none font-sans leading-relaxed"
              />
            </div>

            {/* Configurations */}
            <div className="grid grid-cols-2 gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5">
              <div>
                <label className="text-[11.5px] font-medium text-ink-400 block mb-1">Thời lượng mong muốn:</label>
                <select
                  value={targetDuration}
                  onChange={(e) => setTargetDuration(Number(e.target.value))}
                  className="w-full rounded-lg border border-white/10 bg-[#1c1c24] px-2.5 py-1.5 text-[12px] text-white focus:outline-none focus:border-amber-500"
                >
                  <option value={10}>10 giây (Tối ưu Omni Flash)</option>
                  <option value={15}>15 giây (Tối ưu Seedance 2.5)</option>
                  <option value={30}>30 giây (Seedance 2.5 dài)</option>
                </select>
              </div>

              <div>
                <label className="text-[11.5px] font-medium text-ink-400 block mb-1">Tỉ lệ khung hình:</label>
                <select
                  value={targetAspect}
                  onChange={(e) => setTargetAspect(e.target.value as any)}
                  className="w-full rounded-lg border border-white/10 bg-[#1c1c24] px-2.5 py-1.5 text-[12px] text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="9:16">9:16 (Dọc TikTok / Reels / Shorts)</option>
                  <option value="16:9">16:9 (Ngang Điện ảnh / YouTube)</option>
                  <option value="1:1">1:1 (Vuông Instagram)</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-[11.5px] font-medium text-ink-400 block mb-1">Định tuyến Model Video:</label>
                <select
                  value={targetModel}
                  onChange={(e) => setTargetModel(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#1c1c24] px-2.5 py-1.5 text-[12px] text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="auto">✨ Tự động phân tích & đề xuất tối ưu</option>
                  <option value="iooai:omni_flash_10s">IOOAI · Omni Flash 10s (Đổi trang phục đa ảnh)</option>
                  <option value="iooai:seedance2.5 快速版">IOOAI · Seedance 2.5 快速版 (Hành động & chuyển động 15s)</option>
                  <option value="duomiapi:seedance2">DuomiAPI · Seedance 2.0 Standard (Điện ảnh cao cấp)</option>
                  <option value="veo-3.1">Google Veo 3.1</option>
                </select>
              </div>
            </div>

            {/* Project Assets Linked */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11.5px] font-medium text-ink-400 flex items-center gap-1.5">
                  <Film size={12} className="text-sky-400" />
                  Tài nguyên ảnh sẵn có trong dự án ({assets.length}):
                </label>
              </div>
              {assets.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.01] p-3 text-center text-[11.5px] text-ink-500">
                  Dự án chưa có ảnh tham chiếu. Flova sẽ đề xuất tạo ảnh hoặc cảnh báo thiếu tài nguyên.
                </div>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {assets.map((a) => (
                    <div
                      key={a.id}
                      className="group relative flex-shrink-0 w-16 h-16 rounded-lg border border-white/15 overflow-hidden bg-black/50"
                      title={a.name}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img loading="lazy" decoding="async" src={a.url} alt={a.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/80 text-[9px] text-center text-ink-300 truncate px-1">
                        {a.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-[12px] text-rose-300 flex items-start gap-2">
                <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 py-3 text-[13.5px] font-semibold text-black shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="animate-spin text-black" />
                  Đang phân tích kịch bản theo chuẩn Flova...
                </>
              ) : (
                <>
                  <Zap size={15} />
                  Phân Tích Kịch Bản & Lập Kế Hoạch Sản Xuất
                </>
              )}
            </button>
          </div>

          {/* Right Column: Structured Production Plan & Constraint Radar (7 cols) */}
          <div className="flex flex-col bg-[#111115] p-6 overflow-y-auto md:col-span-7 space-y-5">
            {!plan && !loading && (
              <div className="flex h-full flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Layout size={32} />
                </div>
                <div className="max-w-md space-y-1.5">
                  <h3 className="text-[16px] font-bold text-white">Sẵn sàng đọc hiểu kịch bản</h3>
                  <p className="text-[12.5px] text-ink-400 leading-relaxed">
                    Hệ thống sẽ bóc tách thực thể (nhân vật, trang phục, bối cảnh), kiểm tra ràng buộc model AI (giữ mặt, morphing, độ dài) và tạo kế hoạch phân cảnh chuyên nghiệp.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-left w-full max-w-md pt-2 text-[11.5px] text-ink-300">
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                    <span className="font-semibold text-amber-300">🔍 Kiểm tra mâu thuẫn:</span> Phát hiện ảnh nam nhưng mô tả váy nữ, hoặc thiếu ảnh trang phục.
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                    <span className="font-semibold text-sky-300">🎬 Lập Storyboard:</span> Tự động chia nhịp, góc máy, camera movement và prompt tiếng Anh.
                  </div>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex h-full flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
                  <Clapperboard size={24} className="absolute inset-0 m-auto text-amber-400 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[15px] font-semibold text-white">AI Đang Đọc Hiểu Kịch Bản...</h4>
                  <p className="text-[12px] text-ink-400">
                    Bóc tách nhân vật, trang phục, kiểm tra ràng buộc Model & chia nhịp timeline.
                  </p>
                </div>
              </div>
            )}

            {plan && !loading && (
              <>
                {/* 1. Project Analysis Banner */}
                <div className="rounded-xl border border-white/10 bg-[#171720] p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400">
                        {plan.project_analysis.genre}
                      </span>
                      <h3 className="text-[18px] font-bold text-white mt-0.5">
                        {plan.project_analysis.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-ink-200">
                        <Clock size={11} /> {plan.project_analysis.target_duration_sec}s
                      </span>
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-ink-200">
                        {plan.project_analysis.recommended_aspect}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-black/40 p-3 border border-white/5 space-y-1">
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-amber-300">
                      <Zap size={13} />
                      Đề xuất Model: {plan.project_analysis.recommended_model}
                    </div>
                    <p className="text-[11.5px] text-ink-400 leading-relaxed">
                      {plan.project_analysis.model_reason}
                    </p>
                  </div>
                </div>

                {/* 2. Constraint & Sanity Radar (Tinh hoa của Flova) */}
                <div className="rounded-xl border border-white/10 bg-[#171720] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[13px] font-bold text-white flex items-center gap-2">
                      <AlertTriangle size={14} className="text-amber-400" />
                      Radar Ràng Buộc & Kiểm Tra Mâu Thuẫn (Flova Sanity Radar)
                    </h4>
                    <span className="text-[11px] text-ink-400">
                      {plan.constraints_and_warnings.length} điểm cần lưu ý
                    </span>
                  </div>

                  <div className="space-y-2">
                    {plan.constraints_and_warnings.map((c, i) => (
                      <div
                        key={i}
                        className={clsx(
                          "rounded-lg p-3 text-[12px] border flex items-start gap-2.5",
                          c.severity === "error"
                            ? "bg-rose-950/20 border-rose-500/30 text-rose-200"
                            : c.severity === "warning"
                            ? "bg-amber-950/20 border-amber-500/30 text-amber-200"
                            : "bg-sky-950/20 border-sky-500/30 text-sky-200",
                        )}
                      >
                        {c.severity === "error" ? (
                          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-rose-400" />
                        ) : c.severity === "warning" ? (
                          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-amber-400" />
                        ) : (
                          <Info size={15} className="mt-0.5 flex-shrink-0 text-sky-400" />
                        )}
                        <div className="space-y-1">
                          <div className="font-semibold">{c.message}</div>
                          <div className="text-[11.5px] opacity-80">
                            💡 <span className="font-medium">Giải pháp:</span> {c.suggestion}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Entities & Outfits Extracted */}
                <div className="rounded-xl border border-white/10 bg-[#171720] p-4 space-y-3">
                  <h4 className="text-[13px] font-bold text-white flex items-center gap-2">
                    <Shirt size={14} className="text-emerald-400" />
                    Thực Thể & Trang Phục Bóc Tách
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {plan.entities.characters.map((char) => (
                      <div key={char.id} className="rounded-lg border border-white/10 bg-black/40 p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-semibold text-white">{char.name}</span>
                          <span className="text-[10px] rounded bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 border border-emerald-500/30">
                            {char.gender === "male" ? "Nam" : char.gender === "female" ? "Nữ" : "Chung"}
                          </span>
                        </div>
                        <div className="text-[11px] text-ink-400">
                          {char.matched_asset_name ? (
                            <span className="text-emerald-300 flex items-center gap-1">
                              <CheckCircle2 size={11} /> Khớp với file: {char.matched_asset_name}
                            </span>
                          ) : (
                            <span className="text-amber-400">Chưa có ảnh nhân vật trong dự án</span>
                          )}
                        </div>
                      </div>
                    ))}

                    {plan.entities.outfits.map((outfit) => (
                      <div key={outfit.id} className="rounded-lg border border-white/10 bg-black/40 p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-semibold text-white">{outfit.name}</span>
                          <span
                            className={clsx(
                              "text-[10px] rounded px-1.5 py-0.5 border",
                              outfit.status === "matched"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                : "bg-amber-500/20 text-amber-300 border-amber-500/30",
                            )}
                          >
                            {outfit.status === "matched" ? "Đã khớp ảnh" : "Cần tải ảnh"}
                          </span>
                        </div>
                        <div className="text-[11px] text-ink-400">{outfit.description}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Storyboard Timeline (Bảng phân cảnh có cấu trúc) */}
                <div className="rounded-xl border border-white/10 bg-[#171720] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[13px] font-bold text-white flex items-center gap-2">
                      <Camera size={14} className="text-sky-400" />
                      Kế Hoạch Phân Cảnh (Storyboard Timeline - {plan.shots.length} Shots)
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {plan.shots.map((shot) => (
                      <div
                        key={shot.shot_index}
                        className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-2 hover:border-amber-500/30 transition"
                      >
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-amber-500/20 text-amber-300 px-2 py-0.5 text-[11px] font-bold">
                              Cảnh {shot.shot_index}
                            </span>
                            <span className="text-[11.5px] font-mono text-ink-400">{shot.time_range}</span>
                            <span className="text-[12px] font-semibold text-white">{shot.title}</span>
                          </div>
                          <span className="rounded bg-white/10 px-2 py-0.5 text-[10.5px] text-ink-300">
                            {shot.framing}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11.5px] text-ink-300">
                          <div>
                            <span className="text-ink-500">Góc máy / Camera:</span> {shot.camera_movement}
                          </div>
                          <div>
                            <span className="text-ink-500">Chuyển cảnh:</span> {shot.transition_out}
                          </div>
                          <div className="col-span-2">
                            <span className="text-ink-500">Hành động:</span> {shot.character_action}
                          </div>
                        </div>

                        <div className="rounded-lg bg-[#0e0e12] p-2.5 text-[11.5px] font-mono text-ink-300 border border-white/5">
                          <div className="text-[10px] uppercase font-bold text-amber-400/80 mb-1">
                            Prompt Tiếng Anh Điện Ảnh:
                          </div>
                          <p className="leading-relaxed select-all">{shot.prompt_en}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Post-Production Layer Breakdown */}
                <div className="rounded-xl border border-white/10 bg-[#171720] p-4 space-y-2.5 text-[12px]">
                  <h4 className="text-[13px] font-bold text-white flex items-center gap-2">
                    <Layers size={14} className="text-violet-400" />
                    Bóc Tách Lớp Hậu Kỳ (Post-Production Layers)
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-black/40 p-2.5 border border-white/5 space-y-1">
                      <span className="text-[10.5px] font-bold text-amber-400 uppercase block">1. Lớp Video AI</span>
                      <p className="text-[11px] text-ink-300">{plan.post_production_plan.video_layer}</p>
                    </div>
                    <div className="rounded-lg bg-black/40 p-2.5 border border-white/5 space-y-1">
                      <span className="text-[10.5px] font-bold text-sky-400 uppercase block">2. Đồ họa Typography</span>
                      <p className="text-[11px] text-ink-300">{plan.post_production_plan.graphic_layer}</p>
                    </div>
                    <div className="rounded-lg bg-black/40 p-2.5 border border-white/5 space-y-1">
                      <span className="text-[10.5px] font-bold text-rose-400 uppercase block">3. Âm thanh / Nhịp Beat</span>
                      <p className="text-[11px] text-ink-300">{plan.post_production_plan.audio_layer}</p>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="sticky bottom-0 pt-2 pb-1 flex items-center justify-between gap-3 bg-[#111115]">
                  <button
                    onClick={handleCopyPrompt}
                    className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-[12.5px] font-medium text-ink-200 hover:bg-white/10 hover:text-white transition"
                  >
                    {copiedPrompt ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copiedPrompt ? "Đã chép Prompt!" : "Sao chép Prompt"}
                  </button>

                  <button
                    onClick={handleApply}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 py-2.5 text-[13px] font-semibold text-black shadow-lg shadow-emerald-500/20 transition"
                  >
                    <Sparkle size={15} />
                    ✨ Đưa Toàn Bộ Kế Hoạch Vào Canvas Làm Việc
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
