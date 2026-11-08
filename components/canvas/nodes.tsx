"use client";
import { Model3DNode } from "./model3d-node";
import { VoiceNode } from "./voice-node";

import { withBasePath } from "@/lib/base-path";
import { LazyVideo } from "@/components/ui/lazy-video";

import { memo, useCallback, useMemo, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Handle, NodeToolbar, Position, useReactFlow, useEdges, useNodes, type NodeProps } from "@xyflow/react";
import clsx from "clsx";
import {
  AlertCircle,
  Check,
  Columns,
  Image as ImageIcon,
  Loader2,
  Play,
  Type,
  ZoomIn,
  BrainCircuit,
  Shirt,
  RefreshCw,
  ArrowUp,
  Download,
  Sparkles,
  FolderInput,
  LayoutGrid,
  Unlink,
  Trash2,
  Move,
  Layers,
  Search,
  User,
  Film,
  Folder,
  Star,
  ChevronRight,
  Maximize2,
  ExternalLink,
  History,
  Volume2,
} from "lucide-react";
import { NodeMasterPromptBar } from "./master-prompt-section";
import { useStudio, useModelsOfKind, useModelById } from "@/lib/studio-store";
import { useNodeMenu, useRunNode } from "./run-context";
import { sourceMediaRole, type PortKind } from "./ports";
import { useUi } from "@/lib/ui-store";
import type { StudioNodeData } from "@/lib/execute";
import { getProviderMeta, resolveProvider, durationOptions, getDefaultDuration } from "@/lib/provider-meta";

function NodeActions({ id, canRun = true }: { id: string; canRun?: boolean }) {
  const { tr } = useUi();
  const run = useRunNode();
  const menu = useNodeMenu();
  return (
    <div className="mt-2 flex items-center gap-1">
      {canRun && (
        <button
          type="button"
          onClick={() => run(id)}
          className="rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-black"
        >
          {tr("canvas.toolbar.run")}
        </button>
      )}
      <button type="button" onClick={() => menu.duplicate(id)} className="rounded-full px-2.5 py-1 text-[12px] text-white/80 hover:bg-white/10">
        {tr("canvas.duplicate")}
      </button>
      <button type="button" onClick={() => menu.remove(id)} className="rounded-full px-2.5 py-1 text-[12px] text-red-300 hover:bg-white/10">
        {tr("common.delete")}
      </button>
    </div>
  );
}

/** TapNow-style node: the picture is the node. Settings show once it is selected in Inspector. */
function useNodeUpdater(id: string) {
  const { setNodes } = useReactFlow();
  return useCallback(
    (patch: Partial<StudioNodeData>) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, ...patch } } : node,
        ),
      );
    },
    [id, setNodes],
  );
}

function TapFrame({
  id,
  selected,
  label,
  icon: Icon,
  data,
  preview,
  video,
  text,
  canRun = true,
  busy,
  width,
  onMediaClick,
  onDrop,
  editor,
  children,
}: {
  id: string;
  selected?: boolean;
  label: string;
  icon: typeof ImageIcon;
  data: StudioNodeData;
  preview?: string;
  video?: string;
  text?: string;
  canRun?: boolean;
  busy?: boolean;
  width?: number;
  onMediaClick?: () => void;
  onDrop?: (event: React.DragEvent) => void;
  editor?: ReactNode;
  children?: ReactNode;
}) {
  const ready = data.status === "done" || Boolean(preview || video);
  const { openLightbox, toast } = useUi();
  const run = useRunNode();
  const menu = useNodeMenu();
  const updateNode = useNodeUpdater(id);
  const lastRunTimeRef = useRef(0);

  const allNodes = useNodes();
  const isSingleSelected = selected && allNodes.filter((n) => n.selected).length === 1;

  // Lịch sử tạo video/ảnh (Version History: v1, v2, v3...)
  const historyList = useMemo(() => {
    const list = Array.isArray(data.history) ? [...data.history] : [];
    return list;
  }, [data.history]);

  const [selectedVersionIdx, setSelectedVersionIdx] = useState<number>(-1);

  // Xác định media đang xem (bản lịch sử được chọn hoặc bản mới nhất)
  const activeHistory = selectedVersionIdx >= 0 && historyList[selectedVersionIdx] ? historyList[selectedVersionIdx] : null;
  const activeVideo = activeHistory ? (activeHistory.kind === "video" ? activeHistory.url : undefined) : video;
  const activePreview = activeHistory ? (activeHistory.kind === "image" ? activeHistory.url : undefined) : preview;
  const hasMedia = Boolean(activePreview || activeVideo);

  // Bảng làm việc: Mở mặc định khi khối chưa có media, hoặc khi bấm đúp chuột / bấm nút bảng làm việc
  const [isExpanded, setIsExpanded] = useState<boolean>(() => !activePreview && !activeVideo);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, input, select, textarea, a")) return;
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  }, []);

  const handleRun = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const now = Date.now();
      if (now - lastRunTimeRef.current < 400) return;
      lastRunTimeRef.current = now;
      run(id);
    },
    [id, run],
  );

  // Kích thước & Tỷ lệ co giãn động theo tham số aspect (16:9, 9:16, 1:1, 4:5, 21:9...)
  const aspect = data.aspect || "16:9";
  const { frameWidth, frameStyle } = useMemo(() => {
    if (text != null && !activePreview && !activeVideo) {
      return { frameWidth: width || 280, frameStyle: { minHeight: 120 } };
    }
    let calculatedWidth = width;
    let ratio = "16 / 9";
    switch (aspect) {
      case "16:9":
        calculatedWidth = width || 380;
        ratio = "16 / 9";
        break;
      case "9:16":
        calculatedWidth = width || 230;
        ratio = "9 / 16";
        break;
      case "1:1":
        calculatedWidth = width || 300;
        ratio = "1 / 1";
        break;
      case "4:5":
        calculatedWidth = width || 260;
        ratio = "4 / 5";
        break;
      case "21:9":
        calculatedWidth = width || 420;
        ratio = "21 / 9";
        break;
      case "3:2":
        calculatedWidth = width || 340;
        ratio = "3 / 2";
        break;
      case "2:3":
        calculatedWidth = width || 250;
        ratio = "2 / 3";
        break;
      default:
        calculatedWidth = width || 360;
        ratio = "16 / 9";
        break;
    }
    return { frameWidth: calculatedWidth, frameStyle: { aspectRatio: ratio } };
  }, [aspect, width, text, activePreview, activeVideo]);

  return (
    <div
      className={clsx("group relative", selected && "z-30")}
      style={{ width: frameWidth }}
      onDoubleClick={handleDoubleClick}
      onDragOver={onDrop ? (event) => event.preventDefault() : undefined}
      onDrop={onDrop}
    >
      {/* Top Header Bar */}
      <div className="pointer-events-none absolute -top-[28px] left-0 right-0 flex items-center justify-between text-[11.5px] font-medium text-neutral-400 select-none">
        <div className="flex max-w-[60%] items-center gap-1.5 truncate">
          <Icon size={12} className="text-neutral-400 shrink-0" strokeWidth={1.8} />
          <span className="truncate">{data.name || label}</span>
          {ready && !data.identityNeedsReview && data.status !== "running" && data.status !== "error" && (
            <Check size={11} className="text-emerald-400 shrink-0" strokeWidth={2.4} />
          )}
          {data.status === "running" && <Loader2 size={11} className="animate-spin text-amber-400 shrink-0" />}
          {data.status === "error" && <AlertCircle size={11} className="text-rose-400 shrink-0" />}
          {Boolean(data.identityNeedsReview) && (
            <AlertCircle size={11} className="text-amber-400 shrink-0" aria-label="Cần kiểm tra nhân vật tham chiếu" />
          )}
        </div>

        {/* Bộ chuyển phiên bản (Version Switcher pills: v1, v2...) */}
        <div className="pointer-events-auto flex items-center gap-1">
          {historyList.length > 1 && (
            <div className="flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 border border-white/15 text-[9.5px]">
              <History size={10} className="text-neutral-400 shrink-0 mr-0.5" />
              {historyList.map((h, idx) => {
                const isActive = (selectedVersionIdx === -1 && idx === historyList.length - 1) || selectedVersionIdx === idx;
                return (
                  <button
                    key={h.id || idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVersionIdx(idx);
                    }}
                    className={clsx(
                      "nodrag px-1.5 py-0.5 rounded font-bold transition",
                      isActive
                        ? "bg-amber-400 text-black shadow-sm"
                        : "text-white/60 hover:bg-white/15 hover:text-white"
                    )}
                    title={h.label || `Phiên bản v${idx + 1}`}
                  >
                    v{idx + 1}
                  </button>
                );
              })}
            </div>
          )}

          {/* Nút Bảng làm việc / Thu gọn */}
          {editor && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded((v) => !v);
              }}
              className={clsx(
                "nodrag flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] transition font-medium border",
                isExpanded
                  ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-300 shadow-sm"
                  : "bg-black/60 border-white/15 text-white/70 hover:text-white hover:bg-black/80"
              )}
              title="Bấm đúp vào khối hoặc bấm nút này để Mở rộng / Thu gọn bảng làm việc"
            >
              {isExpanded ? "Thu gọn ▲" : "⚙️ Bảng làm việc"}
            </button>
          )}

          {canRun && (
            <button
              type="button"
              className="pointer-events-auto nodrag flex items-center gap-1 rounded-full bg-white/10 hover:bg-brass-400 hover:text-black px-2 py-0.5 text-[10.5px] text-white/90 transition shadow-sm font-medium"
              disabled={data.status === "running"}
              onMouseDown={handleRun}
              onClick={handleRun}
              title="Chạy khối này ngay (1 nhấp chuột)"
            >
              {data.status === "running" ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Play size={10} fill="currentColor" />
              )}
              <span>{data.status === "running" ? "Đang tạo…" : ready ? "Tạo lại" : "Chạy"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Media Card Container (Bọc Media Card và Cổng kết nối để Ports luôn cố định ở giữa Media Card) */}
      <div className="relative" style={{ width: frameWidth }}>
        <div
          className={clsx(
            "relative overflow-hidden rounded-2xl bg-[#121216] border border-white/10 transition-all duration-150 shadow-xl",
            selected ? "ring-2 ring-white/80 border-white/40 shadow-2xl" : "hover:border-white/20",
          )}
          style={frameStyle}
        >
        {activeVideo ? (
          <div
            className="relative h-full w-full bg-black group/video cursor-pointer"
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
          >
            <video
              src={withBasePath(activeVideo)}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-contain"
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
            />
          </div>
        ) : activePreview ? (
          <div
            className="h-full w-full cursor-pointer bg-neutral-950"
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" decoding="async" src={withBasePath(activePreview)} alt="" className="h-full w-full object-contain" />
          </div>
        ) : text != null ? (
          <p className={clsx("line-clamp-6 p-3 text-[12.5px] leading-relaxed", text ? "text-white/90" : "text-white/35")}>
            {text || "Nhập câu lệnh…"}
          </p>
        ) : (
          <div
            className="grid h-full place-items-center text-white/25 cursor-pointer hover:text-white/40 transition"
            onClick={() => onMediaClick?.()}
          >
            {busy || data.status === "running" ? <Loader2 size={24} className="animate-spin text-amber-400" /> : <Icon size={28} strokeWidth={1.3} />}
          </div>
        )}

        {/* Thanh công cụ nhanh nổi trên góc media khi hover */}
        {hasMedia && (
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto z-20">
            <a
              href={withBasePath((activeVideo || activePreview)!)}
              download
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-medium text-white shadow-md backdrop-blur-md hover:bg-white hover:text-black transition"
              title="Tải video/ảnh về máy"
            >
              <Download size={10} />
              <span>Tải</span>
            </a>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openLightbox({
                  url: (activeVideo || activePreview)!,
                  kind: activeVideo ? "video" : "image",
                  title: data.name || label,
                });
              }}
              className="flex items-center gap-1 rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-medium text-white shadow-md backdrop-blur-md hover:bg-white hover:text-black transition"
              title="Phóng to toàn màn hình"
            >
              <Maximize2 size={10} />
              <span>Phóng to</span>
            </button>

            {onMediaClick && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMediaClick();
                }}
                className="flex items-center gap-1 rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-medium text-white/80 shadow-md backdrop-blur-md hover:bg-white hover:text-black transition"
                title="Thay đổi file"
              >
                <span>Đổi file</span>
              </button>
            )}
          </div>
        )}

        {/* Cắt frame video (Đầu / Dừng / Cuối) */}
        {activeVideo && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto z-20">
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const targetProjectId = (data.projectId as string) || (data.result as any)?.projectId || (activeVideo ? activeVideo.match(/\/api\/files\/([^\/]+)\//)?.[1] : undefined) || "prj_06d6f1c9496a";
                  toast("Đang trích xuất cảnh đầu video (0.0s)...", "default");
                  const res = await fetch("/api/video/extract-frame", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectId: targetProjectId, videoUrl: activeVideo, mode: "first" }),
                  });
                  const resData = await res.json();
                  if (resData.url && menu?.reuse) {
                    menu.reuse(id, resData.url, "image", `Cảnh đầu: ${data.name || "Video"}`);
                    toast("Đã cắt cảnh đầu và tạo khối ảnh mới trên Canvas!", "success");
                  } else {
                    toast(resData.error || "Không thể cắt cảnh đầu", "error");
                  }
                } catch (err: any) {
                  toast(`Lỗi khi cắt cảnh đầu: ${err.message || String(err)}`, "error");
                }
              }}
              className="rounded bg-black/80 hover:bg-amber-500 hover:text-black px-1.5 py-0.5 text-[9px] font-medium text-amber-200 backdrop-blur-md transition shadow-md"
              title="Cắt cảnh đầu video (0.0s) đưa lên Canvas làm khối ảnh"
            >
              🎬 Đầu
            </button>
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const videoEl = (e.currentTarget.closest(".relative")?.querySelector("video") as HTMLVideoElement) || null;
                  const currentTime = videoEl?.currentTime || 0;
                  const targetProjectId = (data.projectId as string) || (data.result as any)?.projectId || (activeVideo ? activeVideo.match(/\/api\/files\/([^\/]+)\//)?.[1] : undefined) || "prj_06d6f1c9496a";
                  toast(`Đang trích xuất cảnh dừng (${currentTime.toFixed(1)}s)...`, "default");
                  const res = await fetch("/api/video/extract-frame", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectId: targetProjectId, videoUrl: activeVideo, mode: "current", time: currentTime }),
                  });
                  const resData = await res.json();
                  if (resData.url && menu?.reuse) {
                    menu.reuse(id, resData.url, "image", `Cảnh dừng: ${data.name || "Video"}`);
                    toast("Đã cắt cảnh đang dừng và tạo khối ảnh mới trên Canvas!", "success");
                  } else {
                    toast(resData.error || "Không thể cắt cảnh dừng", "error");
                  }
                } catch (err: any) {
                  toast(`Lỗi khi cắt cảnh dừng: ${err.message || String(err)}`, "error");
                }
              }}
              className="rounded bg-amber-500/20 border border-amber-400/40 hover:bg-amber-500 hover:text-black px-1.5 py-0.5 text-[9px] font-medium text-amber-200 backdrop-blur-md transition shadow-md"
              title="Cắt cảnh đang dừng video đưa lên Canvas làm khối ảnh"
            >
              ⏸️ Dừng
            </button>
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const targetProjectId = (data.projectId as string) || (data.result as any)?.projectId || (activeVideo ? activeVideo.match(/\/api\/files\/([^\/]+)\//)?.[1] : undefined) || "prj_06d6f1c9496a";
                  toast("Đang trích xuất cảnh cuối video...", "default");
                  const res = await fetch("/api/video/extract-frame", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectId: targetProjectId, videoUrl: activeVideo, mode: "last" }),
                  });
                  const resData = await res.json();
                  if (resData.url && menu?.reuse) {
                    menu.reuse(id, resData.url, "image", `Cảnh cuối: ${data.name || "Video"}`);
                    toast("Đã cắt cảnh cuối và tạo khối ảnh mới trên Canvas!", "success");
                  } else {
                    toast(resData.error || "Không thể cắt cảnh cuối", "error");
                  }
                } catch (err: any) {
                  toast(`Lỗi khi cắt cảnh cuối: ${err.message || String(err)}`, "error");
                }
              }}
              className="rounded bg-black/80 hover:bg-amber-500 hover:text-black px-1.5 py-0.5 text-[9px] font-medium text-amber-200 backdrop-blur-md transition shadow-md"
              title="Cắt cảnh cuối video đưa lên Canvas làm khối ảnh"
            >
              🏁 Cuối
            </button>
          </div>
        )}

        {/* Nút khôi phục bản cũ làm bản chính nếu đang xem v1/v2 cũ */}
        {selectedVersionIdx >= 0 && selectedVersionIdx !== historyList.length - 1 && activeHistory && (
          <div className="absolute bottom-2 left-2 z-20 pointer-events-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                updateNode({
                  result: {
                    id: activeHistory.id || `hist_${selectedVersionIdx}`,
                    url: activeHistory.url,
                    kind: (activeHistory.kind || "video") as "video" | "image",
                    name: activeHistory.label || activeHistory.name || `Phiên bản v${selectedVersionIdx + 1}`,
                  } as any,
                  videoUrl: activeHistory.kind === "video" ? activeHistory.url : undefined,
                  imageUrl: activeHistory.kind === "image" ? activeHistory.url : undefined,
                });
                setSelectedVersionIdx(-1);
                toast(`Đã khôi phục bản v${selectedVersionIdx + 1} làm bản chính!`, "success");
              }}
              className="rounded-full bg-amber-400 text-black px-2.5 py-0.5 text-[10px] font-bold shadow-md hover:bg-amber-300 transition"
              title="Khôi phục phiên bản này làm bản chính"
            >
              Dùng bản v{selectedVersionIdx + 1} này
            </button>
          </div>
        )}
      </div>

        {/* Cổng kết nối (Ports) luôn gắn cố định vào sườn của Media Card */}
        {children}
      </div>

      {/* KHUNG THAO TÁC (EDITOR) CHỈ HIỆN KHI BẤM ĐÚP MỞ RỘNG (HOẶC BẤM NÚT BẢNG LÀM VIỆC) */}
      {isExpanded && editor && (
        <div className="nowheel nodrag mt-2.5 rounded-2xl border border-white/10 bg-[#121217]/95 p-3 shadow-2xl backdrop-blur-md relative z-30"
          onWheel={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <span className="text-[10px] text-cyan-300 font-medium flex items-center gap-1">
              <span>⚙️ Bảng làm việc chi tiết (Đúp chuột để thu gọn)</span>
            </span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
              className="text-[9.5px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition"
              title="Thu gọn bảng làm việc"
            >
              Thu gọn ▲
            </button>
          </div>
          {editor}
        </div>
      )}
    </div>
  );
}


function NodePorts({ out, accept }: { out?: PortKind | null; accept?: string | null }) {
  const hasAccept = Boolean(accept && accept.trim().length > 0);
  const hasOut = Boolean(out);

  return (
    <>
      {hasAccept && (
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          title="Đầu vào (Hoặc thả trực tiếp vào khối)"
          data-accept={accept}
          className="!h-3 !w-3 !border-2 !border-[#121216] !bg-neutral-400 hover:!bg-sky-400 hover:!scale-125 transition-all !cursor-crosshair before:content-[''] before:absolute before:-inset-4 before:rounded-full"
        />
      )}
      {hasOut && (
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          title="Đầu ra"
          data-port={out}
          className="!h-3 !w-3 !border-2 !border-[#121216] !bg-neutral-400 hover:!bg-amber-400 hover:!scale-125 transition-all !cursor-crosshair before:content-[''] before:absolute before:-inset-4 before:rounded-full"
        />
      )}
    </>
  );
}

/* ------------------------------- Prompt node ------------------------------ */

export const PromptNode = memo(function PromptNode({ id, data, selected }: NodeProps) {
  const { tr } = useUi();
  const update = useNodeUpdater(id);
  const nodeData = data as StudioNodeData;
  return (
    <TapFrame
      id={id}
      selected={selected}
      label="Câu lệnh"
      icon={Type}
      data={nodeData}
      text={nodeData.text ?? ""}
      canRun={false}
      width={240}
      editor={
        <div className="space-y-1.5">
          <NodeMasterPromptBar data={nodeData} onPatch={update} />
          <MentionTextarea
            className="field nodrag min-h-[160px] max-h-[480px] resize-y text-[13px] leading-relaxed p-3"
            placeholder={tr("node.promptPlaceholder")}
            value={nodeData.text ?? ""}
            onChange={(next) => update({ text: next })}
            tags={useConnectedMediaTags(id)}
          />
          <div className="flex justify-end text-[10px] text-white/40 font-mono">
            <span>{(nodeData.text ?? "").length}/8000 ký tự</span>
          </div>
        </div>
      }
    >
      <NodePorts out="text" accept="text" />
    </TapFrame>
  );
});

/* ------------------------------- Image node ------------------------------- */

export const ImageNode = memo(function ImageNode({ id, data, selected }: NodeProps) {
  const { tr, toast } = useUi();
  const update = useNodeUpdater(id);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const project = useStudio((s) => s.project);
  const nodeData = data as StudioNodeData;

  const isVideoMedia = Boolean(nodeData.videoUrl || nodeData.result?.kind === "video");
  const video = nodeData.videoUrl || (nodeData.result?.kind === "video" ? nodeData.result.url : undefined);
  const connectedPreview = useConnectedPreview(id, 0);
  const preview = !isVideoMedia
    ? (nodeData.imageUrl || (nodeData.result?.kind === "image" ? nodeData.result.url : undefined) || connectedPreview)
    : undefined;

  const upload = useCallback(
    async (file: File) => {
      setBusy(true);
      try {
        const { api } = await import("@/lib/api-client");
        const asset = await api.assets.upload(file, project?.id ?? null);
        const isVid = file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name);
        if (isVid) {
          update({ videoUrl: asset.url, imageUrl: undefined, result: asset, name: file.name, status: "done" });
          toast("Đã tải lên video thành công!", "success");
        } else {
          update({ imageUrl: asset.url, videoUrl: undefined, result: asset, name: file.name, status: "done" });
          toast(tr("toast.uploaded"), "success");
        }
      } catch (error) {
        toast(error instanceof Error ? error.message : "Tải lên thất bại", "error");
      } finally {
        setBusy(false);
      }
    },
    [project?.id, toast, tr, update],
  );

  return (
    <TapFrame
      id={id}
      selected={selected}
      label={isVideoMedia ? "Video nguồn" : "Ảnh nguồn"}
      icon={isVideoMedia ? Play : ImageIcon}
      data={nodeData}
      preview={preview}
      video={video}
      canRun={false}
      busy={busy}
      onMediaClick={() => inputRef.current?.click()}
      onDrop={(event) => {
        const file = event.dataTransfer.files?.[0];
        if (file) upload(file);
      }}
      editor={
        <button
          type="button"
          className="nodrag flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2 text-[12.5px] text-white hover:bg-white/20 transition"
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Đang tải…" : "Đổi ảnh hoặc video"}
        </button>
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) upload(file);
          event.target.value = "";
        }}
      />
      <NodePorts out={isVideoMedia ? "video" : "image"} accept="image video any" />
    </TapFrame>
  );
});

/* ------------------------------ Generate node ----------------------------- */

/** A compact pill-styled <select> — model/aspect/resolution/duration quick-pickers. */
function PillSelect({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; group?: string }[];
  className?: string;
}) {
  const hasGroup = options.some((o) => !!o.group);
  if (!hasGroup) {
    return (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={clsx(
          "nodrag truncate rounded-full border border-ink-700 bg-ink-900/80 px-2.5 py-1 text-[11px] text-ink-200 outline-none transition hover:border-ink-600",
          className,
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  const groups: Record<string, { value: string; label: string }[]> = {};
  const ungrouped: { value: string; label: string }[] = [];
  for (const opt of options) {
    if (opt.group) {
      if (!groups[opt.group]) groups[opt.group] = [];
      groups[opt.group].push(opt);
    } else {
      ungrouped.push(opt);
    }
  }

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={clsx(
        "nodrag truncate rounded-full border border-ink-700 bg-ink-900/80 px-2.5 py-1 text-[11px] text-ink-200 outline-none transition hover:border-ink-600",
        className,
      )}
    >
      {ungrouped.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
      {Object.entries(groups).map(([grp, items]) => (
        <optgroup key={grp} label={`── ${grp} ──`}>
          {items.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function getModelCostBadge(
  modelId?: string,
  durationInput?: number,
  resolutionInput?: string
): string {
  if (!modelId) return "⚡ Sẵn sàng";
  const id = modelId.toLowerCase();
  const dur = Number(durationInput) || 10;
  const res = (resolutionInput || "").toLowerCase();
  const CNY_TO_VND = 3600;

  const fmtVnd = (cny: number) => {
    const vnd = Math.round(cny * CNY_TO_VND);
    if (vnd >= 1000) {
      return `${(vnd / 1000).toFixed(vnd % 1000 === 0 ? 0 : 1)}k đ`;
    }
    return `${vnd}đ`;
  };

  // 1. Seedance 2.5 官渠 (Kênh chính thức ByteDance: 0.70 Tệ / s)
  if (id.includes("seedance2.5 官渠") || id.includes("seedance 2.5 官渠") || id.includes("official")) {
    const total = Number((dur * 0.70).toFixed(2));
    return `🪙 ${total.toFixed(2)} Tệ (${dur}s · ~${fmtVnd(total)})`;
  }

  // 2. Seedance 2.5 AT (Trọn gói 5–30s không đổi theo giây: 7.50 Tệ)
  if (id.includes("seedance2.5 at") || id.includes("seedance 2.5 at")) {
    return `🪙 7.50 Tệ (Trọn gói ${dur}s · ~${fmtVnd(7.5)})`;
  }

  // 3. Seedance 2.5 LJ (Trọn gói 1080p 5–30s: 4.50 Tệ)
  if (id.includes("seedance2.5 lj") || id.includes("seedance 2.5 lj")) {
    return `🪙 4.50 Tệ (Trọn gói ${dur}s · ~${fmtVnd(4.5)})`;
  }

  // 4. Seedance 2.0 Mini 全参 (Trọn gói 4–15s: 1.80 Tệ)
  if (id.includes("seedance2.0 mini 全参") || id.includes("mini 全参") || id.includes("seedance20-mini-all")) {
    return `🪙 1.80 Tệ (Trọn gói ${dur}s · ~${fmtVnd(1.8)})`;
  }

  // 5. Seedance 2.0 线路二 (15s cố định: 1.80 Tệ)
  if (id.includes("seedance20-line2") || id.includes("线路二")) {
    return `🪙 1.80 Tệ (Cố định 15s · ~${fmtVnd(1.8)})`;
  }

  // 6. Seedance 2.0 Đặc huệ (15s cố định: 1.50 Tệ)
  if (id.includes("seedance20-special")) {
    return `🪙 1.50 Tệ (Cố định 15s · ~${fmtVnd(1.5)})`;
  }

  // 7. Seedance 2.0 满血 (0.29 Tệ / s)
  if (id.includes("seedance 2.0 满血") || id.includes("满血")) {
    const rate = 0.29;
    const total = Number((dur * rate).toFixed(2));
    return `🪙 ${total.toFixed(2)} Tệ (${dur}s · ~${fmtVnd(total)})`;
  }

  // 8. Seedance 2.0 Fast (0.18 Tệ / s)
  if (id.includes("seedance 2.0 fast") || id.includes("seedance 2.0 快速") || id.includes("fast")) {
    const rate = 0.18;
    const total = Number((dur * rate).toFixed(2));
    return `🪙 ${total.toFixed(2)} Tệ (${dur}s · ~${fmtVnd(total)})`;
  }

  // 9. Omni Flash (10s: 720p 0.80 Tệ, 1080p 0.85 Tệ)
  if (id.includes("omni_flash") || id.includes("omni flash")) {
    const is1080 = res.includes("1080");
    const total = is1080 ? 0.85 : 0.80;
    return `🪙 ${total.toFixed(2)} Tệ (${is1080 ? "1080p" : "720p"} · ~${fmtVnd(total)})`;
  }

  // 10. Omni Video Editor (10s: 1.65 Tệ)
  if (id.includes("omni 可编辑") || id.includes("omni video editor") || id.includes("omni 可续画")) {
    return `🪙 1.65 Tệ (10s · ~${fmtVnd(1.65)})`;
  }

  // 11. MiniMax H3 / Hailuo (480p: 0.06/s, 720p: 0.10/s, 1080p: 0.18/s)
  if (id.includes("minimax") || id.includes("hailuo")) {
    const is1080 = res.includes("1080") || id.includes("1080");
    const is480 = res.includes("480");
    const rate = is1080 ? 0.18 : is480 ? 0.06 : 0.10;
    const total = Number((dur * rate).toFixed(2));
    return `🪙 ${total.toFixed(2)} Tệ (${is1080 ? "1080p" : is480 ? "480p" : "720p"} · ${dur}s · ~${fmtVnd(total)})`;
  }

  // 12. GPT Image 2 (Ảnh 1K: 0.08, 2K: 0.12, 4K: 0.15 Tệ)
  if (id.includes("gpt-image-2") || id.includes("gpt image 2")) {
    const is4k = res.includes("4k") || id.includes("4k");
    const is2k = res.includes("2k");
    const total = is4k ? 0.15 : is2k ? 0.12 : 0.08;
    return `🪙 ${total.toFixed(2)} Tệ (${is4k ? "4K" : is2k ? "2K" : "1K"} · ~${fmtVnd(total)})`;
  }

  // 13. MuseTalk (LipSync: 0.05 Tệ / s)
  if (id.includes("musetalk") || id.includes("muse")) {
    const total = Number((dur * 0.05).toFixed(2));
    return `🪙 ${total.toFixed(2)} Tệ (LipSync ${dur}s · ~${fmtVnd(total)})`;
  }

  // 14. Seedance chung
  if (id.includes("seedance")) {
    const rate = 0.20;
    const total = Number((dur * rate).toFixed(2));
    return `🪙 ${total.toFixed(2)} Tệ (${dur}s · ~${fmtVnd(total)})`;
  }

  return "⚡ Sẵn sàng";
}

export const GenerateNode = memo(function GenerateNode({ id, data, selected }: NodeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const { tr } = useUi();
  const update = useNodeUpdater(id);
  const nodeData = data as StudioNodeData;
  const rawModels = useModelsOfKind(nodeData.modelKind ?? "image");
  const models = useMemo(() => {
    return [...rawModels].sort((a, b) => {
      const aIooai = a.provider === "iooai" || a.id.startsWith("iooai:");
      const bIooai = b.provider === "iooai" || b.id.startsWith("iooai:");
      if (aIooai && !bIooai) return -1;
      if (!aIooai && bIooai) return 1;
      return 0;
    });
  }, [rawModels]);
  const model = useModelById(nodeData.modelId);
  const maxPromptLength = model?.id?.includes("线路三") ? 20000 : 8000;
  const providerMeta = getProviderMeta(model?.provider || model?.id);
  const run = useRunNode();
  const result = nodeData.result;
  const mediaTags = useConnectedMediaTags(id);
  const imageTags = useConnectedImageTags(id);
  const audioTags = useConnectedAudioTags(id);

  const isVideo = nodeData.modelKind === "video";
  const [mediaTab, setMediaTab] = useState<"reference" | "first_last">("reference");
  return (
    <TapFrame
      id={id}
      selected={selected}
      label={isVideo ? "Tạo video" : "Tạo ảnh"}
      icon={isVideo ? Play : ImageIcon}
      data={nodeData}
      preview={result?.kind === "image" ? result.url : undefined}
      video={result?.kind === "video" ? result.url : undefined}
      editor={
        <div className="space-y-2.5">
          <NodeMasterPromptBar data={nodeData} onPatch={update} kind={isVideo ? "video" : "image"} />

          {/* Audio Connection Banner nếu có nối audio */}
          {audioTags.length > 0 && (
            <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[10.5px]">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 truncate">
                  <Volume2 size={13} className="text-cyan-400 shrink-0" />
                  <span className="font-semibold text-cyan-300">
                    {(nodeData.audioMode ?? "reference") === "mux" ? "Lồng tiếng (Mux):" : "Tham chiếu âm thanh (Guidance):"}
                  </span>
                  <span className="text-white/70 text-[10px]">({audioTags.length} audio)</span>
                </div>
                <div className="flex items-center gap-1 bg-black/40 rounded-lg p-0.5 border border-white/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => update({ audioMode: "reference" })}
                    className={clsx(
                      "px-1.5 py-0.5 rounded text-[9.5px] font-medium transition",
                      (nodeData.audioMode ?? "reference") === "reference"
                        ? "bg-cyan-500/30 text-cyan-200 border border-cyan-500/40"
                        : "text-white/50 hover:text-white/80"
                    )}
                    title="Chỉ dùng làm căn cứ tham chiếu cho Seedance/AI diễn xuất và khẩu hình, không đè tiếng gốc"
                  >
                    Tham chiếu AI
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ audioMode: "mux" })}
                    className={clsx(
                      "px-1.5 py-0.5 rounded text-[9.5px] font-medium transition",
                      nodeData.audioMode === "mux"
                        ? "bg-amber-500/30 text-amber-200 border border-amber-500/40"
                        : "text-white/50 hover:text-white/80"
                    )}
                    title="Dùng FFmpeg ghép file âm thanh này đè vào video cuối"
                  >
                    Ghép tiếng
                  </button>
                </div>
              </div>

              {/* Danh sách các tag audio để click gắn nhanh vào prompt */}
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                <span className="text-[10px] text-white/50">Gắn vào prompt:</span>
                {audioTags.map((tag, idx) => {
                  const tagStr = `[@Audio ${idx + 1}]`;
                  const isIncluded = (nodeData.prompt ?? "").includes(tagStr);
                  return (
                    <button
                      key={tag.id || idx}
                      type="button"
                      onClick={() => {
                        const cur = nodeData.prompt ?? "";
                        if (!isIncluded) update({ prompt: `${cur} ${tagStr}`.trim() });
                      }}
                      className={clsx(
                        "px-1.5 py-0.5 rounded font-mono text-[9px] flex items-center gap-1 transition",
                        isIncluded
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          : "bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10"
                      )}
                      title={`Thêm ${tagStr} (${tag.name}) vào câu lệnh`}
                    >
                      <span>{tagStr}</span>
                      <span className="text-[8px] opacity-70 max-w-[70px] truncate">{tag.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dòng Reference Slot & First/Last frame Tabs */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <div className="flex items-center gap-1 bg-black/40 rounded-lg p-0.5 border border-white/10">
                <button
                  type="button"
                  onClick={() => setMediaTab("reference")}
                  className={clsx(
                    "px-2 py-0.5 rounded text-[10px] font-semibold transition",
                    mediaTab === "reference" ? "bg-white/20 text-white shadow-sm" : "text-white/50 hover:text-white/80"
                  )}
                >
                  Reference
                </button>
                <button
                  type="button"
                  onClick={() => setMediaTab("first_last")}
                  className={clsx(
                    "px-2 py-0.5 rounded text-[10px] font-semibold transition",
                    mediaTab === "first_last" ? "bg-white/20 text-white shadow-sm" : "text-white/50 hover:text-white/80"
                  )}
                >
                  First/Last frame
                </button>
              </div>
              <span className="text-[10px] text-neutral-500">{imageTags.length} ảnh{audioTags.length > 0 ? `, ${audioTags.length} audio` : ""} kết nối</span>
            </div>

            {mediaTab === "first_last" ? (
              <div className="flex items-center gap-2 py-1">
                {/* First frame slot */}
                <div
                  className="flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-950/20 px-2 py-1 flex-1 cursor-pointer hover:border-sky-400 transition"
                  onClick={() => {
                    const tagCode = "[@Image 1]";
                    const cur = nodeData.prompt ?? "";
                    if (!cur.includes(tagCode)) update({ prompt: `${tagCode} ${cur}` });
                  }}
                  title="Nhấp để chèn [@Image 1] (Cảnh đầu) vào câu lệnh"
                >
                  <div className="h-8 w-8 rounded border border-sky-500/40 bg-sky-950/40 shrink-0 overflow-hidden flex items-center justify-center">
                    {imageTags[0]?.preview ? (
                      <img src={withBasePath(imageTags[0].preview)} alt="" className="h-full w-full rounded object-cover" />
                    ) : (
                      <span className="text-[9px] text-sky-400 font-bold">#1 Đầu</span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-semibold text-sky-300 truncate">Khung đầu (0.0s)</span>
                    <span className="text-[9px] text-white/40 truncate">{imageTags[0]?.label || "Nối ảnh vào khối"}</span>
                  </div>
                </div>

                {/* Last frame slot */}
                <div
                  className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-950/20 px-2 py-1 flex-1 cursor-pointer hover:border-purple-400 transition"
                  onClick={() => {
                    const tagCode = "[@Image 2]";
                    const cur = nodeData.prompt ?? "";
                    if (!cur.includes(tagCode)) update({ prompt: `${cur} ${tagCode}` });
                  }}
                  title="Nhấp để chèn [@Image 2] (Cảnh cuối) vào câu lệnh"
                >
                  <div className="h-8 w-8 rounded border border-purple-500/40 bg-purple-950/40 shrink-0 overflow-hidden flex items-center justify-center">
                    {imageTags[1]?.preview ? (
                      <img src={withBasePath(imageTags[1].preview)} alt="" className="h-full w-full rounded object-cover" />
                    ) : (
                      <span className="text-[9px] text-purple-400 font-bold">#2 Cuối</span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-semibold text-purple-300 truncate">Khung cuối</span>
                    <span className="text-[9px] text-white/40 truncate">{imageTags[1]?.label || "Nối ảnh vào khối"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {imageTags.map((tag, idx) => (
                <button
                  key={tag.label + idx}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const tagCode = `[@Image ${idx + 1}]`;
                    const cur = nodeData.prompt ?? "";
                    const el = textareaRef.current;
                    let start = selectionRef.current.start;
                    let end = selectionRef.current.end;

                    if (el && typeof el.selectionStart === "number") {
                      if (el.selectionEnd > el.selectionStart || (el.selectionStart > 0 && el.selectionStart <= cur.length)) {
                        start = el.selectionStart;
                        end = el.selectionEnd;
                      }
                    }

                    // 1. Đang bôi đen đoạn văn bản: thay thế chính xác đoạn bôi đen bằng tag
                    if (start !== end && start >= 0 && end <= cur.length && start < end) {
                      const before = cur.slice(0, start);
                      const after = cur.slice(end);
                      const preSpace = before.length > 0 && !before.endsWith(" ") ? " " : "";
                      const postSpace = after.length > 0 && !after.startsWith(" ") ? " " : " ";
                      const next = `${before}${preSpace}${tagCode}${postSpace}${after.startsWith(" ") ? after.slice(1) : after}`;
                      update({ prompt: next });
                      requestAnimationFrame(() => {
                        if (el) {
                          el.focus();
                          const pos = before.length + preSpace.length + tagCode.length + postSpace.length;
                          el.setSelectionRange(pos, pos);
                          selectionRef.current = { start: pos, end: pos };
                        }
                      });
                      return;
                    }

                    // 2. Con trỏ đang đặt ở giữa văn bản
                    if (start > 0 && start <= cur.length) {
                      const before = cur.slice(0, start);
                      const after = cur.slice(end);
                      const match = /@([^\s@]*)$/.exec(before);
                      const prefix = match ? cur.slice(0, start - match[0].length) : before;
                      const preSpace = prefix.length > 0 && !prefix.endsWith(" ") ? " " : "";
                      const postSpace = after.length > 0 && !after.startsWith(" ") ? " " : " ";
                      const next = `${prefix}${preSpace}${tagCode}${postSpace}${after.startsWith(" ") ? after.slice(1) : after}`;
                      update({ prompt: next });
                      requestAnimationFrame(() => {
                        if (el) {
                          el.focus();
                          const pos = prefix.length + preSpace.length + tagCode.length + postSpace.length;
                          el.setSelectionRange(pos, pos);
                          selectionRef.current = { start: pos, end: pos };
                        }
                      });
                      return;
                    }

                    // 3. Câu lệnh kết thúc bằng @
                    if (/@([^\s@]*)$/.test(cur)) {
                      const next = cur.replace(/@([^\s@]*)$/, `${tagCode} `);
                      update({ prompt: next });
                      requestAnimationFrame(() => {
                        if (el) {
                          el.focus();
                          const pos = next.length;
                          el.setSelectionRange(pos, pos);
                          selectionRef.current = { start: pos, end: pos };
                        }
                      });
                      return;
                    }

                    // 4. Mặc định chèn vào cuối
                    const preSpace = cur.length > 0 && !cur.endsWith(" ") ? " " : "";
                    const next = `${cur}${preSpace}${tagCode} `;
                    update({ prompt: next });
                    requestAnimationFrame(() => {
                      if (el) {
                        el.focus();
                        const pos = next.length;
                        el.setSelectionRange(pos, pos);
                        selectionRef.current = { start: pos, end: pos };
                      }
                    });
                  }}
                  className="nodrag group/slot relative h-8 w-8 rounded-lg border border-purple-500/40 bg-purple-950/30 p-0.5 hover:border-purple-400 hover:scale-105 transition shrink-0"
                  title={`Bấm để chèn [@Image ${idx + 1}] - ${tag.name || tag.label}`}
                >
                  {tag.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={withBasePath(tag.preview)} alt="" className="h-full w-full rounded object-cover" />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-[10px] text-purple-300 font-bold">#{idx + 1}</span>
                  )}
                  <span className="absolute -bottom-1 -right-1 rounded bg-black/90 px-1 text-[8px] font-mono text-purple-300 border border-purple-500/40">
                    #{idx + 1}
                  </span>
                </button>
              ))}
              {imageTags.length < 8 && (
                <div
                  className="h-8 w-8 rounded-lg border border-dashed border-white/20 bg-white/5 flex items-center justify-center text-white/30 text-[12px] shrink-0"
                  title="Kéo dây từ khối ảnh vào cổng bên trái để thêm tham chiếu"
                >
                  +
                </div>
              )}
            </div>
            )}
          </div>

          {/* Ô nhập prompt tích hợp Popover @ Mention chuẩn Ảnh 3 */}
          <MentionTextarea
            textareaRef={textareaRef}
            onSelectionChange={(sel) => {
              selectionRef.current = sel;
            }}
            className="field nodrag min-h-[160px] max-h-[480px] resize-y text-[13px] leading-relaxed p-3"
            placeholder={tr("node.promptPlaceholder")}
            value={nodeData.prompt ?? ""}
            onChange={(next) => update({ prompt: next })}
            tags={mediaTags}
          />

          {/* Báo lỗi gọn gàng, KHÔNG che kín màn hình hoặc làm mất tương tác */}
          {nodeData.error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-rose-300 text-[11.5px]">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1 break-words leading-tight">{nodeData.error}</div>
              <button
                type="button"
                onClick={() => run(id)}
                disabled={nodeData.status === "running"}
                className="shrink-0 rounded bg-rose-500/20 hover:bg-rose-500/30 px-2 py-0.5 text-[10.5px] font-semibold text-rose-200 transition disabled:opacity-50"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Thanh thông số dưới cùng: Model, Aspect, Resolution, Duration, Nút tạo */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {model && (
              <span
                className="nodrag flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-white/80"
                title={`Nguồn: ${providerMeta.label}`}
              >
                <span>{providerMeta.icon}</span>
                <span>{providerMeta.short}</span>
              </span>
            )}
            <PillSelect
              value={nodeData.modelId ?? ""}
              onChange={(value) => {
                if (!value) {
                  update({ modelId: "" });
                  return;
                }
                const avail = durationOptions(value);
                let dur = nodeData.duration;
                if (!dur || !avail.includes(dur)) {
                  dur = getDefaultDuration(value);
                  if (!avail.includes(dur)) {
                    dur = avail[avail.length - 1] ?? 10;
                  }
                }
                let aspect = nodeData.aspect ?? "16:9";
                const p = (nodeData.prompt ?? "").toLowerCase();
                if (p.includes("9:16") || p.includes("dọc") || p.includes("vertical") || p.includes("tiktok")) {
                  aspect = "9:16";
                } else if (p.includes("16:9") || p.includes("ngang") || p.includes("landscape")) {
                  aspect = "16:9";
                }

                if (value.startsWith("iooai:")) {
                  update({ modelId: value, duration: dur, resolution: nodeData.resolution ?? "720p", aspect });
                } else if (value.includes("piapi")) {
                  const pDur = Math.min(15, Math.max(4, dur));
                  update({
                    modelId: value,
                    duration: pDur,
                    resolution: nodeData.resolution ?? "480p",
                    aspect,
                  });
                } else if (value.includes("veo")) {
                  const vDur = [4, 6, 8].includes(dur) ? dur : 6;
                  update({
                    modelId: value,
                    duration: vDur,
                    aspect,
                  });
                } else {
                  update({ modelId: value, duration: dur, aspect });
                }
              }}
              className="min-w-[130px] max-w-[200px]"
              options={[
                { value: "", label: models.length ? tr("node.model") : tr("node.noModel") },
                ...models.map((item) => ({
                  value: item.id,
                  label: item.label,
                  group: getProviderMeta(item.provider || item.id).short,
                })),
              ]}
            />
            <PillSelect
              value={nodeData.aspect ?? "16:9"}
              onChange={(value) => update({ aspect: value })}
              options={["16:9", "9:16", "1:1", "4:5", "3:2", "2:3", "21:9"].map((ratio) => ({ value: ratio, label: ratio }))}
            />
            <PillSelect
              value={model?.provider === "iooai" ? (nodeData.resolution === "1080p" ? "1080p" : "720p") : nodeData.resolution ?? "480p"}
              onChange={(value) => update({ resolution: value })}
              options={[
                ...(model?.provider === "iooai" ? [] : [{ value: "480p", label: "480p" }]),
                { value: "720p", label: "720p" },
                { value: "1080p", label: "1080p" },
              ]}
            />
            {isVideo ? (
              <PillSelect
                value={String(nodeData.duration ?? 10)}
                onChange={(value) => update({ duration: Number(value) })}
                options={durationOptions(model?.id).map((seconds) => ({ value: String(seconds), label: `${seconds}s` }))}
              />
            ) : (
              <button
                className="nodrag rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/70"
                onClick={() => update({ seed: Math.floor(Math.random() * 1_000_000) })}
                title={tr("node.seed")}
              >
                🎲 {nodeData.seed ?? "—"}
              </button>
            )}

            {/* Bộ đếm ký tự & Chi phí ước tính badge (chuẩn Ảnh 1) */}
            <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono ml-auto">
              <span
                className={clsx(
                  (nodeData.prompt ?? "").length > maxPromptLength
                    ? "text-rose-400 font-bold"
                    : (nodeData.prompt ?? "").length > maxPromptLength * 0.85
                      ? "text-amber-400"
                      : "text-white/40",
                )}
                title={`Số ký tự hiện tại / Tối đa ${maxPromptLength.toLocaleString()} ký tự`}
              >
                {(nodeData.prompt ?? "").length}/{maxPromptLength}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold text-[10px] shadow-sm whitespace-nowrap">{getModelCostBadge(model?.id, nodeData.duration, nodeData.resolution)}</span>
            </div>

            <button
              onClick={() => run(id)}
              disabled={nodeData.status === "running"}
              className="nodrag grid h-7 w-7 place-items-center rounded-full bg-white text-black hover:bg-brass-400 transition disabled:opacity-50 shadow-md"
              title="Chạy tạo ngay"
            >
              {nodeData.status === "running" ? <Loader2 size={13} className="animate-spin" /> : <ArrowUp size={14} strokeWidth={2.5} />}
            </button>
          </div>
          {result?.kind !== "image" && result?.kind !== "video" && result?.meta?.text != null && (
            <p className="max-h-24 overflow-y-auto whitespace-pre-wrap text-[11.5px] text-white/70">{String(result.meta.text)}</p>
          )}
        </div>
      }
    >
      <NodePorts out={isVideo ? "video" : "image"} accept={isVideo ? "text image video" : "text image"} />
    </TapFrame>
  );
});


export const UpscaleNode = memo(function UpscaleNode({ id, data, selected }: NodeProps) {
  const { tr } = useUi();
  const update = useNodeUpdater(id);
  const nodeData = data as StudioNodeData;
  const models = useModelsOfKind("upscale");
  const run = useRunNode();

  return (
    <TapFrame
      id={id}
      selected={selected}
      label="Upscale"
      icon={ZoomIn}
      data={nodeData}
      preview={nodeData.result?.url}
      editor={
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <PillSelect
              value={nodeData.modelId ?? ""}
              onChange={(value) => update({ modelId: value })}
              className="max-w-[140px]"
              options={[
                { value: "", label: models.length ? tr("node.model") : tr("node.noModel") },
                ...models.map((item) => ({
                  value: item.id,
                  label: item.label,
                  group: getProviderMeta(item.provider || item.id).short,
                })),
              ]}
            />
            {[2, 4, 8].map((scale) => (
              <button
                key={scale}
                onClick={() => update({ scale })}
                className={clsx(
                  "nodrag rounded-full border px-2.5 py-1 text-[11px]",
                  (nodeData.scale ?? 2) === scale ? "border-white bg-white text-black" : "border-white/20 text-white/70",
                )}
              >
                ×{scale}
              </button>
            ))}
            <button onClick={() => run(id)} disabled={nodeData.status === "running"} className="nodrag ml-auto grid h-7 w-7 place-items-center rounded-full bg-white text-black disabled:opacity-50">
              {nodeData.status === "running" ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            </button>
          </div>
          {nodeData.error && <p className="text-[11.5px] text-red-300">{nodeData.error}</p>}
        </div>
      }
    >
      <NodePorts out="image" accept="image" />
    </TapFrame>
  );
});

/* -------------------------------- Train node ------------------------------ */

export const TrainNode = memo(function TrainNode({ id, data, selected }: NodeProps) {
  const { tr } = useUi();
  const update = useNodeUpdater(id);
  const nodeData = data as StudioNodeData;
  const models = useModelsOfKind("train");
  const run = useRunNode();

  return (
    <TapFrame
      id={id}
      selected={selected}
      label="Train model"
      icon={BrainCircuit}
      data={nodeData}
      text={nodeData.name || "Model của tôi"}
      editor={
        <div className="space-y-2">
          <input className="field nodrag text-[12px]" placeholder="Tên model" value={nodeData.name ?? ""} onChange={(event) => update({ name: event.target.value })} />
          <div className="flex flex-wrap items-center gap-1.5">
            <PillSelect
              value={nodeData.modelId ?? ""}
              onChange={(value) => update({ modelId: value })}
              className="max-w-[150px]"
              options={[
                { value: "", label: models.length ? tr("node.model") : tr("node.noModel") },
                ...models.map((item) => ({
                  value: item.id,
                  label: item.label,
                  group: getProviderMeta(item.provider || item.id).short,
                })),
              ]}
            />
            <span className="flex items-center gap-1 rounded-full border border-white/15 px-2 py-1 text-[11px] text-white/70">
              Steps
              <input type="number" className="nodrag w-14 bg-transparent text-right outline-none" value={nodeData.steps ?? 1000} onChange={(event) => update({ steps: Number(event.target.value) })} />
            </span>
          </div>
          <p className="text-[11px] text-white/45">Nối các khối Ảnh vào để làm dữ liệu huấn luyện.</p>
          {nodeData.error && <p className="text-[11.5px] text-red-300">{nodeData.error}</p>}
          <button onClick={() => run(id)} disabled={nodeData.status === "running"} className="nodrag flex w-full items-center justify-center gap-1.5 rounded-xl bg-white py-1.5 text-[12px] font-medium text-black disabled:opacity-50">
            {nodeData.status === "running" ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            {nodeData.status === "running" ? tr("node.running") : tr("node.run")}
          </button>
        </div>
      }
    >
      <NodePorts out="any" accept="image" />
    </TapFrame>
  );
});

/* ------------------------------- Output node ------------------------------ */

export const OutputNode = memo(function OutputNode({ id, data, selected }: NodeProps) {
  const { tr } = useUi();
  const nodeData = data as StudioNodeData;
  const asset = nodeData.result;

  const isVideo = asset?.kind === "video";
  return (
    <TapFrame
      id={id}
      selected={selected}
      label="Kết quả"
      icon={Check}
      data={nodeData}
      preview={asset?.kind === "image" ? asset.url : undefined}
      video={isVideo ? asset?.url : undefined}
      text={asset && asset.kind !== "image" && asset.kind !== "video" ? String(asset.meta?.text ?? "") : undefined}
      canRun={false}
      editor={
        asset ? (
          <a href={withBasePath(asset.url)} download className="nodrag flex items-center justify-center gap-1.5 rounded-xl bg-white py-1.5 text-[12px] font-medium text-black">
            <Download size={13} />
            {tr("common.download")}
          </a>
        ) : (
          <p className="text-[12px] text-white/50">Nối một khối kết quả vào đây để xem trước.</p>
        )
      }
    >
      <NodePorts out={isVideo ? "video" : "any"} accept="text image video any" />
    </TapFrame>
  );
});

/* --------------------------- Fashion Try-On node -------------------------- */

export const FashionTryOnNode = memo(function FashionTryOnNode({ id, data, selected }: NodeProps) {
  const { tr } = useUi();
  const update = useNodeUpdater(id);
  const nodeData = data as StudioNodeData;
  const run = useRunNode();
  const result = nodeData.result;
  const garmentPreview = useConnectedPreview(id, 1);

  return (
    <TapFrame
      id={id}
      selected={selected}
      label="Thử đồ AI"
      icon={Shirt}
      data={nodeData}
      preview={result?.kind === "video" ? garmentPreview : result?.url || garmentPreview}
      video={result?.kind === "video" ? result.url : undefined}
      editor={
        <div className="space-y-2">
          <textarea
            className="field nodrag nowheel min-h-[64px] text-[12.5px]"
            onWheel={(e) => e.stopPropagation()}
            placeholder="Mô tả phối đồ (không bắt buộc)"
            value={nodeData.prompt ?? ""}
            onChange={(event) => update({ prompt: event.target.value })}
          />
          <p className="text-[11px] text-white/45">Ảnh thứ nhất là người mẫu, ảnh thứ hai là trang phục.</p>
          <button onClick={() => run(id)} disabled={nodeData.status === "running"} className="nodrag flex w-full items-center justify-center gap-1.5 rounded-xl bg-white py-1.5 text-[12px] font-medium text-black disabled:opacity-50">
            {nodeData.status === "running" ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            {nodeData.status === "running" ? tr("node.running") : "Chạy Thử Đồ"}
          </button>
        </div>
      }
    >
      <NodePorts out="image" accept="text image" />
    </TapFrame>
  );
});

/* ----------------------- Fashion Compose (9:16) Node ---------------------- */

export const FashionComposeNode = memo(function FashionComposeNode({ id, data, selected }: NodeProps) {
  const { tr } = useUi();
  const update = useNodeUpdater(id);
  const nodeData = data as StudioNodeData;
  const run = useRunNode();
  const result = nodeData.result;
  const { setNodes } = useReactFlow();

  const convertToGenerate = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              type: "generate",
              data: {
                ...n.data,
                modelKind: "video",
                modelId: "iooai:omni_flash_10s",
                aspect: "9:16",
                duration: 10,
                resolution: "720p",
                prompt: "Người mẫu mặc trang phục sải bước tự tin, phong cách lookbook thời trang cao cấp.",
                status: "idle",
                error: null,
              },
            }
          : n,
      ),
    );
  }, [id, setNodes]);

  return (
    <TapFrame
      id={id}
      selected={selected}
      label="Ghép Lookbook"
      icon={Columns}
      data={nodeData}
      video={result?.url}
      editor={
        <div className="space-y-2">
          <p className="text-[11px] text-white/45">Ghép 60:40 (cần 1 video có sẵn). Hoặc chuyển sang Tạo Video AI bên dưới:</p>
          <button
            type="button"
            onClick={convertToGenerate}
            className="nodrag flex w-full items-center justify-center gap-1.5 rounded-xl border border-sky-400/40 bg-sky-500/20 py-2 text-[11.5px] font-medium text-sky-200 hover:bg-sky-500/30"
          >
            <Play size={12} />
            Đổi sang Tạo Video AI (Có Model)
          </button>
          <input className="field nodrag text-[12px] font-semibold" placeholder="Tiêu đề" value={nodeData.headline ?? "HÃY NHỚ"} onChange={(event) => update({ headline: event.target.value })} />
          <input className="field nodrag text-[12px]" placeholder="Tiêu đề phụ" value={nodeData.subheadline ?? "Bí quyết phối đồ"} onChange={(event) => update({ subheadline: event.target.value })} />
          <button onClick={() => run(id)} disabled={nodeData.status === "running"} className="nodrag flex w-full items-center justify-center gap-1.5 rounded-xl bg-white py-1.5 text-[12px] font-medium text-black disabled:opacity-50">
            {nodeData.status === "running" ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            {nodeData.status === "running" ? tr("node.running") : "Xuất video ghép"}
          </button>
        </div>
      }
    >
      <NodePorts out="video" accept="image video" />
    </TapFrame>
  );
});

/* --------------------------------- helper -------------------------------- */

/**
 * Allowed durations differ per video model (Veo only takes 4/6/8), so the
 * picker reflects what this gateway actually accepts.
 */
// durationOptions and getDefaultDuration imported from @/lib/provider-meta


export interface MediaTag {
  label: string;
  kind?: "image" | "audio" | "video";
  preview?: string;
  name?: string;
  id?: string;
  audioUrl?: string;
  text?: string;
}

export type ImageTag = MediaTag;

export function getConnectedMediaTags(
  nodeId: string,
  nodes: { id: string; type?: string; data?: unknown }[],
  edges: { source: string; target: string }[],
): MediaTag[] {
  const incoming = edges.filter((edge) => edge.target === nodeId);
  let imgCount = 0;
  let audioCount = 0;
  let vidCount = 0;

  return incoming
    .map((edge) => nodes.find((node) => node.id === edge.source))
    .filter((source): source is { id: string; type?: string; data?: unknown } => Boolean(source))
    .map((source) => {
      const sourceData = (source.data ?? {}) as any;
      const role = sourceMediaRole(source.type, sourceData);

      if (role === "audio" || source.type === "voice" || source.type === "audio") {
        audioCount++;
        const audioUrl = sourceData.audioUrl || (sourceData.result?.kind === "audio" ? sourceData.result?.url : undefined);
        const name = sourceData.name || (sourceData.text ? `"${sourceData.text.trim().slice(0, 24)}..."` : undefined) || `Giọng nói #${audioCount}`;
        return {
          label: `Audio ${audioCount}`,
          kind: "audio" as const,
          preview: audioUrl,
          audioUrl,
          text: sourceData.text,
          name,
          id: source.id,
        };
      }

      if (role === "video" || sourceData.videoUrl || sourceData.result?.kind === "video") {
        vidCount++;
        const preview = sourceData.imageUrl || sourceData.result?.url;
        const name = sourceData.name || `Video #${vidCount}`;
        return {
          label: `Video ${vidCount}`,
          kind: "video" as const,
          preview,
          name,
          id: source.id,
        };
      }

      imgCount++;
      const preview = sourceData.imageUrl || sourceData.result?.url;
      const name = sourceData.name || (source.data as { label?: string })?.label || `Ảnh ${imgCount}`;
      return {
        label: `Ảnh${imgCount}`,
        kind: "image" as const,
        preview,
        name,
        id: source.id,
      };
    });
}

export function useConnectedMediaTags(nodeId: string): MediaTag[] {
  const nodes = useNodes();
  const edges = useEdges();
  return getConnectedMediaTags(nodeId, nodes, edges);
}

export function getConnectedImageTags(
  nodeId: string,
  nodes: { id: string; type?: string; data?: unknown }[],
  edges: { source: string; target: string }[],
): ImageTag[] {
  return getConnectedMediaTags(nodeId, nodes, edges).filter((t) => t.kind === "image" || !t.kind);
}

/** Image-producing sources wired into this node, in connection order (@Ảnh1, @Ảnh2, …). */
export function useConnectedImageTags(nodeId: string): ImageTag[] {
  return useConnectedMediaTags(nodeId).filter((t) => t.kind === "image" || !t.kind);
}

export function useConnectedAudioTags(nodeId: string): MediaTag[] {
  return useConnectedMediaTags(nodeId).filter((t) => t.kind === "audio");
}

/** The nth image-producing source on this node (0 = model, 1 = garment). */
export function useConnectedPreview(nodeId: string, index: number): string | undefined {
  const tags = useConnectedImageTags(nodeId);
  return tags[index]?.preview;
}

function getCaretCoordinates(element: HTMLTextAreaElement, position: number) {
  if (typeof window === "undefined") return { left: 0, top: 0 };
  try {
    const style = window.getComputedStyle(element);
    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.top = "-9999px";
    div.style.left = "-9999px";
    div.style.visibility = "hidden";
    div.style.whiteSpace = "pre-wrap";
    div.style.wordWrap = "break-word";
    div.style.width = `${element.clientWidth}px`;
    div.style.font = style.font;
    div.style.fontSize = style.fontSize;
    div.style.fontFamily = style.fontFamily;
    div.style.lineHeight = style.lineHeight;
    div.style.padding = style.padding;
    div.style.border = style.border;
    div.style.boxSizing = style.boxSizing;

    const text = element.value.slice(0, position);
    div.textContent = text;
    const span = document.createElement("span");
    span.textContent = "@";
    div.appendChild(span);
    document.body.appendChild(div);

    const left = span.offsetLeft - element.scrollLeft;
    const top = span.offsetTop - element.scrollTop;
    document.body.removeChild(div);
    return { left, top };
  } catch {
    return { left: 0, top: 0 };
  }
}

/** A prompt textarea that opens a picker of connected images when "@" is typed. */
export function MentionTextarea({
  value,
  onChange,
  placeholder,
  tags,
  className,
  rows,
  textareaRef,
  onSelectionChange,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  tags: MediaTag[];
  className?: string;
  rows?: number;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  onSelectionChange?: (sel: { start: number; end: number }) => void;
}) {
  const localRef = useRef<HTMLTextAreaElement>(null);
  const ref = textareaRef || localRef;
  const cursorRef = useRef<{ start: number; end: number } | null>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [caretPos, setCaretPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [searchFilter, setSearchFilter] = useState("");
  const lastMentionRef = useRef<{ start: number; end: number; query: string } | null>(null);
  const lastCaretRef = useRef<number>(0);
  const lastSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const allNodes = useNodes();

  useLayoutEffect(() => {
    if (cursorRef.current && ref.current && document.activeElement === ref.current) {
      const { start, end } = cursorRef.current;
      ref.current.setSelectionRange(start, end);
    }
  }, [value]);

  const updateSelection = (el: HTMLTextAreaElement) => {
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    lastCaretRef.current = start;
    lastSelectionRef.current = { start, end };
    onSelectionChange?.({ start, end });
  };

  const mentionAt = (text: string, caret: number) => {
    const match = /@([^\s@]*)$/.exec(text.slice(0, caret));
    return match ? { query: match[1], start: caret - match[0].length } : null;
  };

  const insert = useCallback(
    (tagToInsert: string) => {
      const el = ref.current;
      const curText = el ? el.value : value;

      let start: number;
      let end: number;

      // 1. Nếu người dùng bôi đen một đoạn văn bản và chọn tag từ danh sách popover
      if (lastSelectionRef.current && lastSelectionRef.current.start !== lastSelectionRef.current.end) {
        start = Math.max(0, Math.min(lastSelectionRef.current.start, curText.length));
        end = Math.max(start, Math.min(lastSelectionRef.current.end, curText.length));
      } else if (lastMentionRef.current && lastMentionRef.current.start >= 0 && lastMentionRef.current.start <= curText.length) {
        start = lastMentionRef.current.start;
        end = Math.min(curText.length, Math.max(start + 1, lastMentionRef.current.end));
      } else {
        const caret = lastCaretRef.current || (el?.selectionStart ?? curText.length);
        const match = /@([^\s@]*)$/.exec(curText.slice(0, caret));
        if (match) {
          start = caret - match[0].length;
          end = caret;
        } else {
          start = caret;
          end = caret;
        }
      }

      const prefix = curText.slice(0, start);
      const suffix = curText.slice(end);

      const preSpacer = prefix.length > 0 && !prefix.endsWith(" ") ? " " : "";
      const postSpacer = suffix.length > 0 && !suffix.startsWith(" ") ? " " : " ";
      const next = `${prefix}${preSpacer}${tagToInsert}${postSpacer}${suffix.startsWith(" ") ? suffix.slice(1) : suffix}`;

      onChange(next);
      setQuery(null);
      setSearchFilter("");
      lastMentionRef.current = null;
      lastSelectionRef.current = { start: 0, end: 0 };

      requestAnimationFrame(() => {
        if (el) {
          el.focus();
          const newPos = prefix.length + preSpacer.length + tagToInsert.length + postSpacer.length;
          el.setSelectionRange(newPos, newPos);
          lastCaretRef.current = newPos;
          lastSelectionRef.current = { start: newPos, end: newPos };
          onSelectionChange?.({ start: newPos, end: newPos });
        }
      });
    },
    [value, onChange, onSelectionChange]
  );

  // Private library categories from canvas nodes
  const characterNodes = useMemo(() => {
    return allNodes
      .filter((n) => {
        const d = (n.data || {}) as StudioNodeData;
        const name = (d.name || (n.data as { label?: string })?.label || "").toLowerCase();
        return n.type === "image" || name.includes("nhân vật") || name.includes("hero") || name.includes("linh") || name.includes("nam") || name.includes("ref");
      })
      .map((n, i) => {
        const d = (n.data || {}) as StudioNodeData;
        return {
          id: n.id,
          name: d.name || (n.data as { label?: string })?.label || `Nhân vật ${i + 1}`,
          preview: d.imageUrl || (d.result?.kind === "image" ? d.result.url : undefined),
        };
      });
  }, [allNodes]);

  const sceneNodes = useMemo(() => {
    return allNodes
      .filter((n) => {
        const d = (n.data || {}) as StudioNodeData;
        const name = (d.name || (n.data as { label?: string })?.label || "").toLowerCase();
        return name.includes("cảnh") || name.includes("bối cảnh") || name.includes("scene") || name.includes("location");
      })
      .map((n, i) => {
        const d = (n.data || {}) as StudioNodeData;
        return {
          id: n.id,
          name: d.name || (n.data as { label?: string })?.label || `Bối cảnh ${i + 1}`,
          preview: d.imageUrl || (d.result?.kind === "image" ? d.result.url : undefined),
        };
      });
  }, [allNodes]);

  const voiceNodes = useMemo(() => {
    return allNodes
      .filter((n) => {
        const d = (n.data || {}) as any;
        return (
          n.type === "voice" ||
          n.type === "audio" ||
          Boolean(d.audioUrl) ||
          d.result?.kind === "audio" ||
          Boolean(d.voice)
        );
      })
      .map((n, i) => {
        const d = (n.data || {}) as any;
        const textSnippet = d.text ? `"${d.text.trim().slice(0, 24)}..."` : "";
        const name = d.name || textSnippet || `Giọng nói #${i + 1}`;
        return {
          id: n.id,
          name,
          text: d.text,
          voice: d.voice,
          voiceDescription: d.voiceDescription,
          url: d.audioUrl || d.result?.url,
        };
      });
  }, [allNodes]);

  const [activeLibraryTab, setActiveLibraryTab] = useState<"none" | "character" | "scene" | "voice">("none");

// Cuộn tự nhiên, không cưỡng chế nhảy lên đỉnh khi người dùng gõ hoặc thay tag

  const effectiveFilter = (searchFilter || query || "").toLowerCase();
  const filteredTags = tags.filter((t, i) => {
    const labelMatch = t.label.toLowerCase().includes(effectiveFilter);
    const nameMatch = (t.name || "").toLowerCase().includes(effectiveFilter);
    const numMatch = String(i + 1).includes(effectiveFilter);
    return labelMatch || nameMatch || numMatch;
  });

  return (
    <div className="relative">
      <textarea
        ref={ref}
        className={clsx(className, "nowheel nodrag")}
        onWheel={(e) => e.stopPropagation()}
        placeholder={placeholder}
        value={value}
        onSelect={(event) => {
          updateSelection(event.currentTarget);
        }}
        onClick={(event) => {
          updateSelection(event.currentTarget);
        }}
        onKeyUp={(event) => {
          updateSelection(event.currentTarget);
        }}
        onPointerUp={(event) => {
          updateSelection(event.currentTarget);
        }}
        onFocus={(event) => {
          updateSelection(event.currentTarget);
        }}
        onChange={(event) => {
          const next = event.target.value;
          const selStart = event.target.selectionStart ?? next.length;
          const selEnd = event.target.selectionEnd ?? selStart;
          cursorRef.current = { start: selStart, end: selEnd };
          lastCaretRef.current = selStart;
          lastSelectionRef.current = { start: selStart, end: selEnd };
          onSelectionChange?.({ start: selStart, end: selEnd });
          onChange(next);

          const hit = mentionAt(next, selStart);
          if (hit) {
            lastMentionRef.current = { start: hit.start, end: selStart, query: hit.query };
            setQuery(hit.query);
            setActiveLibraryTab("none");
            if (ref.current) {
              const coords = getCaretCoordinates(ref.current, hit.start);
              setCaretPos(coords);
            }
          } else {
            lastMentionRef.current = null;
            setQuery(null);
          }
        }}
        onKeyDown={(event) => {
          if (query !== null) {
            if (event.key === "Escape") {
              setQuery(null);
              setActiveLibraryTab("none");
              lastMentionRef.current = null;
            } else if (event.key === "Tab" || (event.key === "Enter" && !event.shiftKey && query.length > 0)) {
              if (filteredTags.length > 0) {
                event.preventDefault();
                const tag = filteredTags[0];
                const originalIndex = tags.findIndex((t) => t.label === tag.label && t.preview === tag.preview);
                const tagNum = originalIndex >= 0 ? originalIndex + 1 : 1;
                insert(`[@Image ${tagNum}]`);
              }
            }
          }
        }}
      />

      {/* POPOVER @ MENTION THEO PHONG CÁCH ẢNH 3 */}
      {query !== null && (
        <div
          style={{
            left: `${Math.max(0, Math.min(caretPos.left, (ref.current?.clientWidth ?? 300) - 290))}px`,
          }}
          className="nowheel nodrag absolute bottom-full z-50 mb-1.5 w-[300px] overflow-hidden rounded-2xl border border-white/20 bg-[#16161b]/98 shadow-2xl backdrop-blur-xl"
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Thanh tìm kiếm Search */}
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
            <Search size={13} className="text-neutral-400 shrink-0" />
            <input
              type="text"
              placeholder="Search"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-transparent text-[11.5px] text-white placeholder-neutral-500 focus:outline-none"
            />
          </div>

          <div className="nowheel nodrag max-h-64 overflow-y-auto p-1.5 space-y-1" onWheel={(e) => e.stopPropagation()}>
            {activeLibraryTab === "none" && (
              <>
                {/* Mục Linked node */}
                <div>
                  <div className="flex items-center justify-between px-2 py-1 text-[10.5px]">
                    <span className="font-semibold text-neutral-300">Linked node</span>
                    <span className="text-[9.5px] text-neutral-500 font-mono">Type a number to select</span>
                  </div>

                  {tags.length === 0 ? (
                    <div className="px-2 py-1.5 text-[11px] text-neutral-400">
                      Chưa có khối ảnh nào nối vào cổng bên trái.
                    </div>
                  ) : filteredTags.length === 0 ? (
                    <div className="px-2 py-1.5 text-[11px] text-neutral-500">
                      Không tìm thấy ảnh khớp &quot;{effectiveFilter}&quot;.
                    </div>
                  ) : (
                    filteredTags.map((tag, idx) => {
                      const originalIndex = tags.findIndex((t) => t.label === tag.label && t.preview === tag.preview);
                      const tagNum = originalIndex >= 0 ? originalIndex + 1 : idx + 1;
                      const isAudio = tag.kind === "audio";
                      const isVideo = tag.kind === "video";
                      const tagCode = isAudio ? `[@Audio ${tagNum}]` : isVideo ? `[@Video ${tagNum}]` : `[@Image ${tagNum}]`;
                      const badgeColor = isAudio
                        ? "text-cyan-300 bg-cyan-950/60 border-cyan-500/30"
                        : isVideo
                        ? "text-amber-300 bg-amber-950/60 border-amber-500/30"
                        : "text-purple-300 bg-purple-950/60 border-purple-500/30";

                      return (
                        <button
                          key={tag.label + idx}
                          type="button"
                          onClick={() => insert(tagCode)}
                          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[11.5px] text-white hover:bg-white/10 transition group/tag"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isAudio ? (
                              <div className="h-6 w-6 rounded bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                                <Volume2 size={13} className="text-cyan-400" />
                              </div>
                            ) : tag.preview ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={withBasePath(tag.preview)} alt="" className="h-6 w-6 rounded object-cover border border-white/20 shrink-0" />
                            ) : (
                              <ImageIcon size={14} className="text-neutral-400 shrink-0" />
                            )}
                            <span className="truncate text-neutral-200 group-hover/tag:text-white font-medium">
                              {tag.name || tag.label}
                            </span>
                          </div>
                          <span className={clsx("text-[10px] font-mono border px-1.5 py-0.5 rounded shrink-0", badgeColor)}>
                            {tagCode}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Mục Private library */}
                <div className="border-t border-white/10 pt-1">
                  <div className="px-2 py-1 text-[10.5px] font-semibold text-neutral-300">
                    Private library
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveLibraryTab("character")}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[11.5px] text-neutral-300 hover:bg-white/10 hover:text-white transition"
                  >
                    <div className="flex items-center gap-2">
                      <Folder size={13} className="text-sky-400" />
                      <span>Character</span>
                    </div>
                    <ChevronRight size={12} className="text-neutral-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLibraryTab("scene")}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[11.5px] text-neutral-300 hover:bg-white/10 hover:text-white transition"
                  >
                    <div className="flex items-center gap-2">
                      <Folder size={13} className="text-emerald-400" />
                      <span>Scene</span>
                    </div>
                    <ChevronRight size={12} className="text-neutral-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLibraryTab("voice")}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[11.5px] text-neutral-300 hover:bg-white/10 hover:text-white transition"
                  >
                    <div className="flex items-center gap-2">
                      <Volume2 size={13} className="text-cyan-400" />
                      <span>Voice / Audio ({voiceNodes.length})</span>
                    </div>
                    <ChevronRight size={12} className="text-neutral-500" />
                  </button>
                </div>
              </>
            )}

            {/* Chi tiết thư viện Character */}
            {activeLibraryTab === "character" && (
              <div>
                <button
                  type="button"
                  onClick={() => setActiveLibraryTab("none")}
                  className="flex items-center gap-1 px-2 py-1 text-[10.5px] text-sky-400 hover:underline mb-1"
                >
                  ← Quay lại thư viện
                </button>
                <div className="px-2 py-0.5 text-[10.5px] font-semibold text-neutral-300">Nhân vật dự án</div>
                {characterNodes.length === 0 ? (
                  <div className="px-2 py-1 text-[11px] text-neutral-500">Chưa có ảnh nhân vật trên Canvas.</div>
                ) : (
                  characterNodes.map((char) => (
                    <button
                      key={char.id}
                      type="button"
                      onClick={() => insert(`[Nhân vật: ${char.name}]`)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-[11.5px] text-neutral-200 hover:bg-white/10 hover:text-white transition"
                    >
                      {char.preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={withBasePath(char.preview)} alt="" className="h-6 w-6 rounded object-cover border border-white/20 shrink-0" />
                      ) : (
                        <User size={14} className="text-neutral-400 shrink-0" />
                      )}
                      <span className="truncate">{char.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Chi tiết thư viện Scene */}
            {activeLibraryTab === "scene" && (
              <div>
                <button
                  type="button"
                  onClick={() => setActiveLibraryTab("none")}
                  className="flex items-center gap-1 px-2 py-1 text-[10.5px] text-emerald-400 hover:underline mb-1"
                >
                  ← Quay lại thư viện
                </button>
                <div className="px-2 py-0.5 text-[10.5px] font-semibold text-neutral-300">Bối cảnh dự án</div>
                {sceneNodes.length === 0 ? (
                  <div className="px-2 py-1 text-[11px] text-neutral-500">Chưa có ảnh bối cảnh trên Canvas.</div>
                ) : (
                  sceneNodes.map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => insert(`[Bối cảnh: ${sc.name}]`)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-[11.5px] text-neutral-200 hover:bg-white/10 hover:text-white transition"
                    >
                      {sc.preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={withBasePath(sc.preview)} alt="" className="h-6 w-6 rounded object-cover border border-white/20 shrink-0" />
                      ) : (
                        <Film size={14} className="text-neutral-400 shrink-0" />
                      )}
                      <span className="truncate">{sc.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Chi tiết thư viện Voice / Audio */}
            {activeLibraryTab === "voice" && (
              <div>
                <button
                  type="button"
                  onClick={() => setActiveLibraryTab("none")}
                  className="flex items-center gap-1 px-2 py-1 text-[10.5px] text-cyan-400 hover:underline mb-1"
                >
                  ← Quay lại thư viện
                </button>
                <div className="px-2 py-0.5 text-[10.5px] font-semibold text-neutral-300">Giọng nói & Lồng tiếng trên Canvas</div>
                {voiceNodes.length === 0 ? (
                  <div className="px-2 py-1 text-[11px] text-neutral-500">Chưa có khối giọng nói nào trên Canvas.</div>
                ) : (
                  voiceNodes.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => insert(`[Giọng: ${v.name}]`)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11.5px] text-neutral-200 hover:bg-white/10 hover:text-white transition"
                    >
                      <div className="h-6 w-6 rounded bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                        <Volume2 size={13} className="text-cyan-400" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="truncate font-medium text-cyan-200">{v.name}</span>
                        {v.voiceDescription && (
                          <span className="truncate text-[9.5px] text-neutral-400">{v.voiceDescription}</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}


export const GroupNode = memo(function GroupNode({ id, data, selected }: NodeProps) {
  const { setNodes } = useReactFlow();
  const { toast } = useUi();
  const groupData = data as { label?: string; width?: number; height?: number };

  const setLabel = useCallback(
    (label: string) => {
      setNodes((current) => current.map((node) => (node.id === id ? { ...node, data: { ...node.data, label } } : node)));
    },
    [id, setNodes],
  );

  const handleAbsorbNearby = useCallback(() => {
    setNodes((current) => {
      const group = current.find((n) => n.id === id);
      if (!group) return current;
      const gX = group.position.x;
      const gY = group.position.y;
      const gW = groupData.width ?? 360;
      const gH = groupData.height ?? 260;

      // Find free nodes that intersect or sit inside this group's bounding box
      const candidates = current.filter(
        (n) =>
          !n.parentId &&
          n.id !== id &&
          n.type !== "group" &&
          n.position.x >= gX - 40 &&
          n.position.x <= gX + gW + 40 &&
          n.position.y >= gY - 40 &&
          n.position.y <= gY + gH + 40,
      );

      if (candidates.length === 0) {
        toast("Kéo các khối đặt vào hoặc đè lên khung nhóm rồi bấm nút này để gom vào.", "default");
        return current;
      }

      // Repack candidates inside the group
      const pad = 24;
      const gap = 16;
      const cols = Math.max(1, Math.ceil(Math.sqrt(candidates.length)));
      const childW = 240;
      const childH = 160;

      const newPlacements = new Map<string, { x: number; y: number }>();
      let y = pad + 32;
      let maxW = 0;
      for (let i = 0; i < candidates.length; i += cols) {
        const row = candidates.slice(i, i + cols);
        let x = pad;
        for (const item of row) {
          newPlacements.set(item.id, { x, y });
          x += childW + gap;
        }
        maxW = Math.max(maxW, x - gap + pad);
        y += childH + gap;
      }
      const newH = y - gap + pad;
      const newW = Math.max(gW, maxW);

      toast(`Đã gom ${candidates.length} khối vào "${groupData.label || "New Group"}"!`, "success");

      return current.map((n) => {
        if (n.id === id) {
          return { ...n, data: { ...n.data, width: newW, height: newH } };
        }
        const place = newPlacements.get(n.id);
        if (place) {
          return {
            ...n,
            parentId: id,
            extent: undefined,
            position: place,
          };
        }
        return n;
      });
    });
  }, [groupData.label, groupData.width, groupData.height, id, setNodes, toast]);

  const handleTidy = useCallback(() => {
    setNodes((current) => {
      const children = current.filter((n) => n.parentId === id);
      if (children.length === 0) return current;
      const pad = 24;
      const gap = 16;
      const cols = Math.max(1, Math.ceil(Math.sqrt(children.length)));
      const childW = 240;
      const childH = 160;

      let y = pad + 32;
      let maxW = 0;
      const updatedChildren = new Map<string, { x: number; y: number }>();
      for (let i = 0; i < children.length; i += cols) {
        const row = children.slice(i, i + cols);
        let x = pad;
        for (const item of row) {
          updatedChildren.set(item.id, { x, y });
          x += childW + gap;
        }
        maxW = Math.max(maxW, x - gap + pad);
        y += childH + gap;
      }
      const newH = y - gap + pad;
      const newW = Math.max(groupData.width ?? 360, maxW);

      toast("Đã căn chỉnh gọn gàng các khối trong nhóm", "success");

      return current.map((n) => {
        if (n.id === id) {
          return { ...n, data: { ...n.data, width: newW, height: newH } };
        }
        const place = updatedChildren.get(n.id);
        if (place) {
          return { ...n, position: place };
        }
        return n;
      });
    });
  }, [groupData.width, id, setNodes, toast]);

  const handleUngroup = useCallback(() => {
    setNodes((current) => {
      const group = current.find((n) => n.id === id);
      if (!group) return current;
      return current
        .filter((n) => n.id !== id)
        .map((n) => {
          if (n.parentId !== id) return n;
          const { parentId, extent, ...rest } = n;
          void parentId;
          void extent;
          return {
            ...rest,
            position: {
              x: group.position.x + n.position.x,
              y: group.position.y + n.position.y,
            },
          };
        });
    });
    toast("Đã rã nhóm (Ungroup)", "default");
  }, [id, setNodes, toast]);

  const handleDeleteGroup = useCallback(() => {
    setNodes((current) => {
      const memberIds = new Set(current.filter((n) => n.parentId === id).map((n) => n.id));
      memberIds.add(id);
      return current.filter((n) => !memberIds.has(n.id));
    });
    toast("Đã xoá nhóm và toàn bộ khối bên trong", "default");
  }, [id, setNodes, toast]);

  return (
    <div
      className={clsx(
        "group/grp relative flex flex-col rounded-2xl border transition-all duration-200 select-none",
        selected
          ? "bg-[#141418]/85 ring-1 ring-white/30 border-white/40 shadow-2xl"
          : "bg-[#111116]/60 hover:border-white/20 backdrop-blur-sm border-white/10",
      )}
      style={{ width: groupData.width ?? 360, height: groupData.height ?? 260 }}
    >
      {selected && (
        <NodeToolbar
          isVisible
          position={Position.Top}
          offset={12}
          className="nodrag nopan flex items-center gap-1.5 rounded-full border border-white/15 bg-[#141418]/95 px-3 py-1.5 shadow-2xl backdrop-blur-md text-[12px] text-white z-50 select-none"
        >
          <button
            type="button"
            onClick={handleAbsorbNearby}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-neutral-200 hover:bg-white/10 hover:text-white transition"
            title="Gom tất cả các khối đang nằm trên khung này vào nhóm"
          >
            <FolderInput size={13} className="text-amber-400" />
            Gom khối vào
          </button>
          <button
            type="button"
            onClick={handleTidy}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-neutral-200 hover:bg-white/10 hover:text-white transition"
            title="Căn chỉnh lưới các khối con"
          >
            <LayoutGrid size={13} />
            Căn lưới
          </button>
          <span className="mx-0.5 h-3.5 w-px bg-white/20" />
          <button
            type="button"
            onClick={handleUngroup}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-neutral-200 hover:bg-white/10 hover:text-white transition"
            title="Rã nhóm (Ungroup)"
          >
            <Unlink size={13} />
            Rã nhóm
          </button>
          <button
            type="button"
            onClick={handleDeleteGroup}
            className="rounded-lg p-1 text-neutral-400 hover:bg-rose-500/20 hover:text-rose-300 transition"
            title="Xoá cả nhóm"
          >
            <Trash2 size={13} />
          </button>
        </NodeToolbar>
      )}

      {/* Group Title: Positioned cleanly at top-left inside or above group */}
      {/* Group Title with Master Drag Handle: Positioned cleanly at top-left matching Image 2 */}
      <div className="nodrag absolute -top-7 left-1 flex items-center gap-1.5 z-10">
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/70 border border-white/15 text-neutral-300 hover:text-white cursor-grab active:cursor-grabbing backdrop-blur-md shadow-md transition"
          title="Kéo để di chuyển cả nhóm Scene này"
        >
          <Move size={12} className="text-amber-400 shrink-0" />
          <input
            value={groupData.label ?? "Scene 1"}
            onChange={(event) => setLabel(event.target.value)}
            className="bg-transparent text-[11.5px] font-semibold text-neutral-200 hover:text-white focus:text-white focus:outline-none max-w-[160px] transition cursor-text tracking-wide"
            placeholder="Scene 1"
          />
        </div>
      </div>
    </div>
  );
});

export const PromptMasterNode = memo(function PromptMasterNode({ id, data, selected }: NodeProps) {
  const update = useNodeUpdater(id);
  const run = useRunNode();
  const nodeData = data as StudioNodeData;
  return (
    <TapFrame
      id={id}
      selected={selected}
      label="Trợ lý Prompt Bậc Thầy"
      icon={Sparkles}
      data={nodeData}
      text={nodeData.text ?? nodeData.prompt ?? ""}
      canRun={true}
      width={250}
      editor={
        <div className="space-y-2">
          <NodeMasterPromptBar data={{ ...nodeData, masterPromptEnabled: true }} onPatch={update} />
          <MentionTextarea
            className="field nodrag min-h-[160px] max-h-[480px] resize-y text-[13px] leading-relaxed p-3"
            placeholder="Nhập ý tưởng thô hoặc nối câu lệnh vào đây..."
            value={nodeData.text ?? nodeData.prompt ?? ""}
            onChange={(next) => update({ text: next, prompt: next })}
            tags={useConnectedMediaTags(id)}
          />
          <div className="flex justify-end text-[10px] text-white/40 font-mono">
            <span>{(nodeData.text ?? nodeData.prompt ?? "").length}/8000 ký tự</span>
          </div>
          <button
            type="button"
            onClick={() => run(id)}
            disabled={nodeData.status === "running"}
            className="nodrag flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-400 py-1.5 text-[12px] font-semibold text-black hover:bg-amber-300 transition disabled:opacity-50"
          >
            {nodeData.status === "running" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            {nodeData.status === "running" ? "Đang hoàn thiện..." : "Chạy Hoàn Thiện AI"}
          </button>
        </div>
      }
    >
      <NodePorts out="text" accept="text" />
    </TapFrame>
  );
});

export const NODE_TYPES = {
  prompt: PromptNode,
  prompt_master: PromptMasterNode,
  image: ImageNode,
  generate: GenerateNode,
  upscale: UpscaleNode,
  train: TrainNode,
  result: OutputNode,
  fashion_tryon: FashionTryOnNode,
  fashion_compose: FashionComposeNode,
  group: GroupNode,
  model3d: Model3DNode,
  "3d": Model3DNode,
  voice: VoiceNode,
  audio: VoiceNode,
};
