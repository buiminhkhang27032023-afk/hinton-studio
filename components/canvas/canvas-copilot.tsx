"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Sparkles,
  Bot,
  Send,
  X,
  Minimize2,
  Maximize2,
  Copy,
  Check,
  Plus,
  Clapperboard,
  Layers,
  Wand2,
  RotateCcw,
  Film,
  Zap,
} from "lucide-react";
import clsx from "clsx";
import type { StudioNode } from "@/lib/execute";
import { useUi } from "@/lib/ui-store";

type ActionAddPrompt = {
  type: "add_prompt";
  title?: string;
  prompt: string;
};

type ActionStoryboard = {
  type: "storyboard";
  title?: string;
  scenes: Array<{
    title: string;
    prompt: string;
    modelKind?: "image" | "video";
  }>;
};

type ActionBlock = ActionAddPrompt | ActionStoryboard;

type CopilotMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: ActionBlock[];
};

interface CanvasCopilotProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: StudioNode[];
  selectedNode: StudioNode | null;
  onAddPromptNode: (text: string) => void;
  onAddStoryboard: (scenes: Array<{ title: string; prompt: string; modelKind?: "image" | "video" }>) => void;
  onUpdateSelectedNodeText: (text: string) => void;
  projectName?: string;
}

const INITIAL_MESSAGE: CopilotMessage = {
  id: "welcome",
  role: "assistant",
  content: `👋 **Xin chào! Tôi là Trợ lý AI Hinton Studio.**
Chạy trên mô hình siêu nhẹ và siêu tốc độ **gemini-3.5-flash** (Gateway Bùi Hữu Thắng).

Tôi có thể đồng hành cùng bạn:
- 🎬 **Lập kịch bản phân cảnh (Storyboard)** và tự động tạo node lên Canvas.
- 💎 **Viết Master Prompt điện ảnh** tối ưu cho Seedance, Veo, Omni, Kling, Flux.
- 🔌 **Tư vấn cách kết nối cổng nối (Ports)** đa hướng tiện lợi trên Canvas.
- 👗 **Thiết kế concept thời trang, lookbook** & phối trang phục người mẫu.

*Hãy chọn một gợi ý bên dưới hoặc gõ yêu cầu của bạn!*`,
};

function parseCopilotActions(rawContent: string): { cleanContent: string; actions: ActionBlock[] } {
  const actions: ActionBlock[] = [];
  let clean = rawContent;

  // Match ```copilot-action:add_prompt ... ```
  const addPromptRegex = /```(?:copilot-action:)?add_prompt\s*\n([\s\S]*?)\n```/g;
  clean = clean.replace(addPromptRegex, (_match, jsonStr) => {
    try {
      const data = JSON.parse(jsonStr.trim());
      if (data.prompt) {
        actions.push({
          type: "add_prompt",
          title: data.title || "Câu lệnh gợi ý",
          prompt: data.prompt,
        });
      }
    } catch {
      // ignore parse error
    }
    return "";
  });

  // Match ```copilot-action:storyboard ... ```
  const storyboardRegex = /```(?:copilot-action:)?storyboard\s*\n([\s\S]*?)\n```/g;
  clean = clean.replace(storyboardRegex, (_match, jsonStr) => {
    try {
      const data = JSON.parse(jsonStr.trim());
      if (Array.isArray(data.scenes) && data.scenes.length > 0) {
        actions.push({
          type: "storyboard",
          title: data.title || "Kịch bản phân cảnh",
          scenes: data.scenes,
        });
      }
    } catch {
      // ignore parse error
    }
    return "";
  });

  return { cleanContent: clean.trim(), actions };
}

export function CanvasCopilot({
  isOpen,
  onClose,
  nodes,
  selectedNode,
  onAddPromptNode,
  onAddStoryboard,
  onUpdateSelectedNodeText,
  projectName,
}: CanvasCopilotProps) {
  const { toast } = useUi();
  const [messages, setMessages] = useState<CopilotMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, minimized]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast("Đã sao chép vào bộ nhớ tạm");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (userText?: string) => {
    const text = (userText ?? input).trim();
    if (!text || loading) return;

    setInput("");
    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setLoading(true);

    try {
      // Summarize nodes on canvas for context
      const nodesSummary = nodes
        .map((n) => {
          if (n.type === "prompt" || n.type === "prompt_master") return `Prompt: "${n.data?.text || ""}"`;
          if (n.type === "generate") return `Generate: ${n.data?.modelKind || "image"} (${n.data?.modelId || "default"})`;
          if (n.type === "image") return `Media: ${n.data?.imageUrl ? "ảnh" : n.data?.videoUrl ? "video" : "trống"}`;
          return n.type;
        })
        .slice(0, 10)
        .join(", ");

      const selectedInfo = selectedNode
        ? {
            id: selectedNode.id,
            type: selectedNode.type,
            text: (selectedNode.data?.text as string) || (selectedNode.data?.prompt as string) || "",
          }
        : null;

      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          context: {
            projectName: projectName || "Dự án Hinton Studio",
            nodesSummary: nodesSummary || "Chưa có node nào",
            selectedNode: selectedInfo,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const rawAnswer = data.message?.content || "Không có câu trả lời.";
      const { cleanContent, actions } = parseCopilotActions(rawAnswer);

      setMessages((prev) => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: cleanContent,
          actions,
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ **Lỗi:** ${msg}\n\nVui lòng kiểm tra API Gateway Bùi Hữu Thắng trong phần Cài Đặt.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([INITIAL_MESSAGE]);
  };

  if (!isOpen) return null;

  return (
    <div
      className={clsx(
        "pointer-events-auto absolute bottom-4 right-4 z-40 flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#121218]/95 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.85)] backdrop-blur-xl transition-all duration-200",
        minimized ? "h-14 w-80" : "h-[560px] w-[420px] max-w-[calc(100vw-32px)]",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-sm">
            <Bot size={15} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold text-white">Hinton Copilot</span>
              <span className="flex items-center gap-1 rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
                <Zap size={10} /> gemini-3.5-flash
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-white/50">
          <button
            type="button"
            onClick={clearChat}
            title="Làm mới cuộc trò chuyện"
            className="rounded p-1 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw size={13} />
          </button>
          <button
            type="button"
            onClick={() => setMinimized((v) => !v)}
            title={minimized ? "Mở rộng" : "Thu nhỏ"}
            className="rounded p-1 hover:bg-white/10 hover:text-white"
          >
            {minimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Đóng trợ lý"
            className="rounded p-1 hover:bg-white/10 hover:text-white"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Body when not minimized */}
      {!minimized && (
        <>
          {/* Scrollable messages area */}
          <div ref={scrollRef} className="flex-1 space-y-3.5 overflow-y-auto p-3.5 text-[13px] leading-relaxed">
            {messages.map((m) => (
              <div
                key={m.id}
                className={clsx(
                  "flex flex-col gap-1.5",
                  m.role === "user" ? "items-end" : "items-start",
                )}
              >
                <div
                  className={clsx(
                    "max-w-[92%] rounded-xl px-3 py-2 text-[12.5px] leading-relaxed",
                    m.role === "user"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "border border-white/10 bg-white/[0.04] text-neutral-200 shadow-sm",
                  )}
                >
                  <div className="whitespace-pre-wrap font-sans">
                    {m.content}
                  </div>
                </div>

                {/* Render interactive action cards if present */}
                {m.actions && m.actions.length > 0 && (
                  <div className="mt-1 flex w-full flex-col gap-2">
                    {m.actions.map((act, actIdx) => {
                      if (act.type === "add_prompt") {
                        return (
                          <div
                            key={actIdx}
                            className="rounded-xl border border-violet-500/30 bg-violet-950/30 p-2.5 text-xs text-neutral-300"
                          >
                            <div className="mb-1 flex items-center justify-between font-medium text-violet-300">
                              <span className="flex items-center gap-1.5">
                                <Wand2 size={13} />
                                {act.title || "Gợi ý Prompt"}
                              </span>
                            </div>
                            <p className="line-clamp-3 rounded-lg bg-black/40 p-2 font-mono text-[11.5px] text-white/90">
                              {act.prompt}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onAddPromptNode(act.prompt);
                                  toast("Đã thêm Node Câu lệnh vào Canvas!");
                                }}
                                className="flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1 text-[11px] font-medium text-white shadow hover:bg-violet-500"
                              >
                                <Plus size={12} />
                                Thêm vào Canvas
                              </button>
                              {selectedNode && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onUpdateSelectedNodeText(act.prompt);
                                    toast("Đã cập nhật prompt cho Node đang chọn!");
                                  }}
                                  className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-neutral-200 hover:bg-white/10"
                                >
                                  <Layers size={11} />
                                  Áp dụng vào Node chọn
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => copyToClipboard(act.prompt, `prompt-${actIdx}`)}
                                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-neutral-300 hover:bg-white/10"
                              >
                                {copiedId === `prompt-${actIdx}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                Sao chép
                              </button>
                            </div>
                          </div>
                        );
                      }

                      if (act.type === "storyboard") {
                        return (
                          <div
                            key={actIdx}
                            className="rounded-xl border border-sky-500/30 bg-sky-950/30 p-2.5 text-xs text-neutral-300"
                          >
                            <div className="mb-2 flex items-center justify-between font-medium text-sky-300">
                              <span className="flex items-center gap-1.5">
                                <Clapperboard size={13} />
                                {act.title || "Kịch bản phân cảnh"} ({act.scenes.length} cảnh)
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {act.scenes.map((sc, sIdx) => (
                                <div key={sIdx} className="rounded-lg bg-black/40 p-1.5 text-[11.5px]">
                                  <span className="font-semibold text-sky-200">{sc.title}: </span>
                                  <span className="text-neutral-300">{sc.prompt}</span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2.5 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  onAddStoryboard(act.scenes);
                                  toast(`Đã tạo ${act.scenes.length} phân cảnh lên Canvas!`);
                                }}
                                className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1 text-[11.5px] font-medium text-white shadow hover:bg-sky-500"
                              >
                                <Film size={12} />
                                Đưa {act.scenes.length} cảnh này lên Canvas
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-violet-400">
                <Sparkles size={14} className="animate-spin" />
                <span className="text-[12px] text-white/50">Hinton Copilot đang suy nghĩ...</span>
              </div>
            )}
          </div>

          {/* Quick suggestion prompt chips */}
          <div className="flex flex-wrap gap-1 border-t border-white/5 bg-white/[0.02] p-2">
            {[
              "🎬 Kịch bản video 3 cảnh",
              "👗 Lookbook thời trang hè",
              "🔌 Hướng dẫn nối dây",
              "💎 Nâng cấp câu lệnh",
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSend(chip)}
                disabled={loading}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-neutral-300 transition hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-white disabled:opacity-40"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="border-t border-white/10 bg-[#0e0e13] p-2.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-end gap-2 rounded-xl border border-white/15 bg-white/[0.03] p-1.5 focus-within:border-violet-500 focus-within:bg-black/40"
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Nhập yêu cầu kịch bản, prompt, hoặc câu hỏi..."
                className="max-h-24 min-h-[34px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[12.5px] text-white outline-none placeholder:text-white/30"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white transition hover:bg-violet-500 disabled:opacity-30"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
