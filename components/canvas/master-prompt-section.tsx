"use client";

import { useState } from "react";
import { Sparkles, Loader2, Undo2, Check, Globe } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/api-client";
import { useUi } from "@/lib/ui-store";
import type { StudioNodeData } from "@/lib/execute";

export function MasterPromptSection({
  nodeId,
  data,
  onPatch,
  kind,
}: {
  nodeId: string;
  data: StudioNodeData;
  onPatch: (id: string, patch: Partial<StudioNodeData>) => void;
  kind?: "image" | "video";
}) {
  const { toast } = useUi();
  const [busy, setBusy] = useState(false);
  const isEnabled = Boolean(data.masterPromptEnabled);
  const rawText = (data.prompt ?? data.text ?? "") as string;
  const currentText = rawText.trim();
  const undoText = data.masterPromptUndo as string | undefined;
  const highlights = (data.masterPromptHighlights as string[] | undefined) ?? [];
  const enVersion = data.masterPromptEn as string | undefined;
  const viVersion = data.masterPromptVi as string | undefined;

  const toggleEnabled = () => {
    const nextState = !isEnabled;
    onPatch(nodeId, { masterPromptEnabled: nextState });
    toast(
      nextState
        ? "Đã bật Trợ lý Viết Prompt Bậc Thầy (Gemini Flash · Bùi Hữu Thắng)"
        : "Đã tắt Trợ lý Bậc Thầy",
      "default",
    );
  };

  const handleEnhance = async (targetLang?: "en" | "vi") => {
    if (!currentText) {
      toast("Vui lòng nhập câu lệnh hoặc ý tưởng trước khi hoàn thiện!", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await api.promptMaster.enhance({
        prompt: currentText,
        kind: kind ?? (data.modelKind === "video" ? "video" : "image"),
      });

      const chosen = targetLang === "vi" ? res.enhancedPromptVi : res.enhancedPrompt;
      const patch: Partial<StudioNodeData> = {
        masterPromptEnabled: true,
        masterPromptUndo: undoText || currentText,
        masterPromptEnhanced: true,
        masterPromptEn: res.enhancedPrompt,
        masterPromptVi: res.enhancedPromptVi,
        masterPromptHighlights: res.highlights,
      };

      if (data.prompt !== undefined) patch.prompt = chosen;
      if (data.text !== undefined || data.prompt === undefined) patch.text = chosen;

      onPatch(nodeId, patch);
      toast("Đã hoàn thiện prompt chuẩn điện ảnh qua AI Bùi Hữu Thắng!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Lỗi khi tối ưu prompt", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleUndo = () => {
    if (!undoText) return;
    const patch: Partial<StudioNodeData> = {
      masterPromptUndo: undefined,
      masterPromptEnhanced: false,
    };
    if (data.prompt !== undefined) patch.prompt = undoText;
    if (data.text !== undefined || data.prompt === undefined) patch.text = undoText;
    onPatch(nodeId, patch);
    toast("Đã hoàn tác về câu lệnh gốc", "default");
  };

  const handleSwitchLang = (lang: "en" | "vi") => {
    const target = lang === "en" ? enVersion : viVersion;
    if (!target) return;
    const patch: Partial<StudioNodeData> = {};
    if (data.prompt !== undefined) patch.prompt = target;
    if (data.text !== undefined || data.prompt === undefined) patch.text = target;
    onPatch(nodeId, patch);
  };

  return (
    <div
      className={clsx(
        "rounded-xl border transition-all duration-200 overflow-hidden",
        isEnabled
          ? "border-amber-500/40 bg-gradient-to-b from-amber-950/20 via-ink-900/60 to-ink-950/80 shadow-[0_0_15px_rgba(245,158,11,0.06)]"
          : "border-ink-800 bg-ink-900/40 opacity-90",
      )}
    >
      {/* Header bar with toggle */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ink-800/60 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              "flex h-6 w-6 items-center justify-center rounded-lg transition",
              isEnabled ? "bg-amber-400/20 text-amber-300 shadow-sm" : "bg-white/5 text-ink-400",
            )}
          >
            <Sparkles size={13} className={isEnabled ? "animate-pulse" : ""} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-semibold text-white/95 tracking-tight">
                Trợ lý Prompt Bậc Thầy
              </span>
              <span className="rounded bg-amber-400/15 px-1.5 py-0.2 text-[9.5px] font-medium text-amber-300">
                Bùi Hữu Thắng
              </span>
            </div>
            <p className="text-[10px] text-ink-400">Model Gemini 3.5 Flash · Tự động hoàn thiện</p>
          </div>
        </div>

        {/* Toggle button */}
        <button
          type="button"
          onClick={toggleEnabled}
          className={clsx(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
            isEnabled ? "bg-amber-500" : "bg-ink-700",
          )}
          title={isEnabled ? "Tắt Trợ lý Bậc Thầy" : "Bật Trợ lý Bậc Thầy"}
        >
          <span
            className={clsx(
              "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
              isEnabled ? "translate-x-4" : "translate-x-0",
            )}
          />
        </button>
      </div>

      {/* Body content when enabled */}
      {isEnabled && (
        <div className="p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleEnhance()}
              disabled={busy}
              className={clsx(
                "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 px-3 text-[12px] font-medium transition",
                "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-ink-950 font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.3)] disabled:opacity-50",
              )}
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span>{busy ? "Đang tinh chỉnh với AI..." : "🪄 Hoàn thiện prompt bậc thầy"}</span>
            </button>

            {undoText && (
              <button
                type="button"
                onClick={handleUndo}
                className="flex items-center gap-1 rounded-lg border border-ink-700 bg-ink-800/80 px-2.5 py-2 text-[11.5px] text-ink-300 hover:bg-ink-700 hover:text-white transition"
                title="Khôi phục câu lệnh gốc trước khi AI tinh chỉnh"
              >
                <Undo2 size={12} />
                <span>Hoàn tác</span>
              </button>
            )}
          </div>

          {/* Language Switcher if enhanced */}
          {enVersion && viVersion && (
            <div className="flex items-center justify-between pt-1 border-t border-ink-800/50">
              <span className="flex items-center gap-1 text-[11px] text-ink-400">
                <Globe size={11} />
                Bản dịch:
              </span>
              <div className="flex items-center gap-1 bg-ink-950/70 p-0.5 rounded-lg border border-ink-800">
                <button
                  type="button"
                  onClick={() => handleSwitchLang("en")}
                  className={clsx(
                    "px-2 py-0.5 rounded text-[10.5px] font-medium transition",
                    rawText === enVersion
                      ? "bg-amber-400/20 text-amber-300 font-semibold"
                      : "text-ink-400 hover:text-white",
                  )}
                >
                  🇬🇧 English (Model AI)
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchLang("vi")}
                  className={clsx(
                    "px-2 py-0.5 rounded text-[10.5px] font-medium transition",
                    rawText === viVersion
                      ? "bg-amber-400/20 text-amber-300 font-semibold"
                      : "text-ink-400 hover:text-white",
                  )}
                >
                  🇻🇳 Tiếng Việt
                </button>
              </div>
            </div>
          )}

          {/* Highlights summary */}
          {highlights.length > 0 && (
            <div className="space-y-1 rounded-lg bg-ink-950/60 border border-ink-800/80 p-2 text-[10.5px] leading-relaxed text-ink-300">
              <div className="font-semibold text-amber-300/90 flex items-center gap-1">
                <Check size={11} />
                Đã bổ sung yếu tố điện ảnh:
              </div>
              <ul className="list-disc pl-3.5 space-y-0.5 text-ink-400">
                {highlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[10px] text-ink-500 leading-tight">
            💡 Khi bật, prompt sẽ được tự động hoàn thiện chi tiết góc máy, ánh sáng, chuyển động và bảo toàn các tag @Ảnh.
          </p>
        </div>
      )}
    </div>
  );
}

/** Compact inline widget for canvas node card */
export function NodeMasterPromptBar({
  data,
  onPatch,
  kind,
}: {
  data: StudioNodeData;
  onPatch: (patch: Partial<StudioNodeData>) => void;
  kind?: "image" | "video";
}) {
  const { toast } = useUi();
  const [busy, setBusy] = useState(false);
  const isEnabled = Boolean(data.masterPromptEnabled);
  const rawText = (data.prompt ?? data.text ?? "") as string;
  const currentText = rawText.trim();
  const undoText = data.masterPromptUndo as string | undefined;

  const toggle = () => {
    const nextState = !isEnabled;
    onPatch({ masterPromptEnabled: nextState });
    toast(
      nextState ? "Đã bật Trợ lý Prompt Bậc Thầy" : "Đã tắt Trợ lý Bậc Thầy",
      "default",
    );
  };

  const enhance = async () => {
    if (!currentText) {
      toast("Vui lòng nhập câu lệnh trước!", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await api.promptMaster.enhance({
        prompt: currentText,
        kind: kind ?? (data.modelKind === "video" ? "video" : "image"),
      });
      const patch: Partial<StudioNodeData> = {
        masterPromptEnabled: true,
        masterPromptUndo: undoText || currentText,
        masterPromptEnhanced: true,
        masterPromptEn: res.enhancedPrompt,
        masterPromptVi: res.enhancedPromptVi,
        masterPromptHighlights: res.highlights,
      };
      if (data.prompt !== undefined) patch.prompt = res.enhancedPrompt;
      if (data.text !== undefined || data.prompt === undefined) patch.text = res.enhancedPrompt;
      onPatch(patch);
      toast("Đã tối ưu hóa prompt qua AI Bùi Hữu Thắng!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Lỗi khi tối ưu prompt", "error");
    } finally {
      setBusy(false);
    }
  };

  const undo = () => {
    if (!undoText) return;
    const patch: Partial<StudioNodeData> = {
      masterPromptUndo: undefined,
      masterPromptEnhanced: false,
    };
    if (data.prompt !== undefined) patch.prompt = undoText;
    if (data.text !== undefined || data.prompt === undefined) patch.text = undoText;
    onPatch(patch);
    toast("Đã hoàn tác", "default");
  };

  return (
    <div className="flex items-center justify-between gap-1 text-[11px] py-0.5">
      <button
        type="button"
        onClick={toggle}
        className={clsx(
          "nodrag flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium transition",
          isEnabled
            ? "bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-sm"
            : "bg-white/5 text-white/50 border border-white/10 hover:text-white/80 hover:bg-white/10",
        )}
        title="Bật/Tắt Trợ lý Viết Prompt Bậc Thầy (Gemini Flash · Gateway Bùi Hữu Thắng)"
      >
        <Sparkles size={11} className={isEnabled ? "text-amber-300 animate-pulse" : ""} />
        <span>Bậc Thầy: {isEnabled ? "BẬT" : "TẮT"}</span>
      </button>

      {isEnabled && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={enhance}
            disabled={busy}
            className="nodrag flex items-center gap-1 rounded bg-amber-500/25 border border-amber-400/40 px-2 py-0.5 text-[10.5px] font-medium text-amber-200 hover:bg-amber-500/40 transition disabled:opacity-50"
            title="Nhấp để hoàn thiện câu lệnh thành Master Prompt điện ảnh"
          >
            {busy ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
            <span>{busy ? "Đang xử lý..." : "🪄 Hoàn thiện"}</span>
          </button>
          {undoText && (
            <button
              type="button"
              onClick={undo}
              className="nodrag flex items-center gap-0.5 text-[10px] text-white/60 hover:text-white px-1 py-0.5 rounded hover:bg-white/10"
              title="Khôi phục câu lệnh gốc"
            >
              <Undo2 size={10} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
