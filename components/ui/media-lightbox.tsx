"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useUi } from "@/lib/ui-store";
import { useStudio } from "@/lib/studio-store";
import { withBasePath } from "@/lib/base-path";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Copy,
  Sparkles,
  Scissors,
  Play,
  Pause,
  Film,
  Camera,
  Loader2,
} from "lucide-react";

export function MediaLightbox({
  onReuse,
}: {
  onReuse?: (url: string, kind?: "image" | "video") => void;
}) {
  const { lightbox, closeLightbox, toast } = useUi();
  const project = useStudio((s) => s.project);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isExtracting, setIsExtracting] = useState<string | null>(null);
  const [showCutModal, setShowCutModal] = useState(false);
  const [cutStart, setCutStart] = useState(0);
  const [cutEnd, setCutEnd] = useState(5);
  const [isCutting, setIsCutting] = useState(false);

  // Reset zoom & pan on open
  useEffect(() => {
    if (lightbox) {
      setScale(1);
      setPos({ x: 0, y: 0 });
      setVideoTime(0);
      setShowCutModal(false);
    }
  }, [lightbox]);

  // Handle ESC key
  useEffect(() => {
    if (!lightbox) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "+" || e.key === "=") setScale((s) => Math.min(5, s + 0.25));
      if (e.key === "-") setScale((s) => Math.max(0.25, s - 0.25));
      if (e.key === "0") {
        setScale(1);
        setPos({ x: 0, y: 0 });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightbox, closeLightbox]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => {
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      return Math.min(5, Math.max(0.25, Number((s + delta).toFixed(2))));
    });
  }, []);

  // Pan dragging
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (scale <= 1) return;
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      posStart.current = { ...pos };
    },
    [scale, pos],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPos({
        x: posStart.current.x + dx,
        y: posStart.current.y + dy,
      });
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Frame extraction handler
  const handleExtractFrame = async (mode: "first" | "last" | "current") => {
    if (!lightbox) return;
    const prjId = project?.id || "prj_default";
    const currT = videoRef.current?.currentTime || videoTime || 0;
    setIsExtracting(mode);

    try {
      const res = await fetch("/api/video/extract-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: prjId,
          videoUrl: lightbox.url,
          mode,
          time: currT,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Không thể trích xuất khung hình");

      const label = mode === "first" ? "cảnh đầu" : mode === "last" ? "cảnh cuối" : `cảnh đang dừng (${currT.toFixed(1)}s)`;
      toast(`Đã trích xuất ${label} thành công! Đang thêm vào Canvas...`, "success");

      if (onReuse) {
        onReuse(resData.url, "image");
      }
    } catch (e: any) {
      toast("Lỗi trích xuất frame: " + (e.message || String(e)), "error");
    } finally {
      setIsExtracting(null);
    }
  };

  // Video trimming handler
  const handleCutVideo = async () => {
    if (!lightbox) return;
    const prjId = project?.id || "prj_default";
    setIsCutting(true);

    try {
      const res = await fetch("/api/video/cut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: prjId,
          videoUrl: lightbox.url,
          startTime: cutStart,
          endTime: cutEnd,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Cắt video thất bại");

      toast(`Đã cắt đoạn clip ${cutStart}s - ${cutEnd}s thành công!`, "success");
      setShowCutModal(false);

      if (onReuse) {
        onReuse(resData.url, "video");
      }
    } catch (e: any) {
      toast("Lỗi cắt video: " + (e.message || String(e)), "error");
    } finally {
      setIsCutting(false);
    }
  };

  if (!lightbox) return null;

  const isVid =
    lightbox.kind === "video" ||
    /\.(mp4|webm|mov)(\?|$)/i.test(lightbox.url);
  const fullUrl = withBasePath(lightbox.url);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-xl transition-all duration-200 select-none animate-in fade-in"
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Top Floating Control Bar */}
      <header className="flex h-14 w-full items-center justify-between border-b border-white/10 px-5 bg-black/50">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold tracking-wide text-white/90">
            {lightbox.title || (isVid ? "Xem & Cắt Cảnh Video" : "Phóng To Ảnh")}
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-mono text-white/60">
            {isVid ? `${videoTime.toFixed(1)}s / ${videoDuration.toFixed(1)}s` : `${Math.round(scale * 100)}%`}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Dedicated Video Frame Extraction Controls */}
          {isVid && (
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/15 rounded-lg px-2 py-1 mr-2">
              <span className="text-[11px] font-medium text-amber-300 flex items-center gap-1 mr-1">
                <Film size={12} /> Cắt cảnh:
              </span>

              {/* First Frame */}
              <button
                type="button"
                onClick={() => handleExtractFrame("first")}
                disabled={Boolean(isExtracting)}
                className="flex items-center gap-1 rounded bg-white/10 hover:bg-amber-500 hover:text-black px-2 py-0.5 text-[11px] font-medium text-white transition disabled:opacity-50"
                title="Trích xuất khung hình đầu tiên của video (0.0s)"
              >
                {isExtracting === "first" ? <Loader2 size={11} className="animate-spin" /> : <Play size={10} />}
                <span>Cảnh đầu</span>
              </button>

              {/* Current / Paused Frame */}
              <button
                type="button"
                onClick={() => handleExtractFrame("current")}
                disabled={Boolean(isExtracting)}
                className="flex items-center gap-1 rounded bg-amber-500/20 border border-amber-400/40 hover:bg-amber-500 hover:text-black px-2 py-0.5 text-[11px] font-medium text-amber-200 transition disabled:opacity-50"
                title={`Trích xuất khung hình tại thời điểm video đang tạm dừng (${videoTime.toFixed(1)}s)`}
              >
                {isExtracting === "current" ? <Loader2 size={11} className="animate-spin" /> : <Pause size={10} />}
                <span>Cảnh dừng ({videoTime.toFixed(1)}s)</span>
              </button>

              {/* Last Frame */}
              <button
                type="button"
                onClick={() => handleExtractFrame("last")}
                disabled={Boolean(isExtracting)}
                className="flex items-center gap-1 rounded bg-white/10 hover:bg-amber-500 hover:text-black px-2 py-0.5 text-[11px] font-medium text-white transition disabled:opacity-50"
                title="Trích xuất khung hình cuối cùng của video"
              >
                {isExtracting === "last" ? <Loader2 size={11} className="animate-spin" /> : <Camera size={10} />}
                <span>Cảnh cuối</span>
              </button>

              {/* Cut / Trim Clip */}
              <button
                type="button"
                onClick={() => {
                  setCutStart(Math.max(0, Number(videoTime.toFixed(1))));
                  setCutEnd(Math.min(videoDuration || 15, Number((videoTime + 5).toFixed(1))));
                  setShowCutModal(!showCutModal);
                }}
                className="flex items-center gap-1 rounded bg-cyan-500/20 border border-cyan-400/40 hover:bg-cyan-500 hover:text-black px-2 py-0.5 text-[11px] font-medium text-cyan-200 transition"
                title="Cắt lấy một đoạn clip từ video"
              >
                <Scissors size={10} />
                <span>Cắt clip</span>
              </button>
            </div>
          )}

          {!isVid && (
            <>
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(0.25, s - 0.25))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/80 transition hover:bg-white/15 hover:text-white"
                title="Thu nhỏ (-)"
              >
                <ZoomOut size={15} />
              </button>
              <button
                type="button"
                onClick={() => setScale((s) => Math.min(5, s + 0.25))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/80 transition hover:bg-white/15 hover:text-white"
                title="Phóng to (+)"
              >
                <ZoomIn size={15} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setScale(1);
                  setPos({ x: 0, y: 0 });
                }}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 text-[12px] text-white/80 transition hover:bg-white/15 hover:text-white"
                title="Đặt lại 100% (0)"
              >
                <RotateCcw size={13} />
                <span>100%</span>
              </button>
              <div className="h-4 w-px bg-white/15 mx-1" />
            </>
          )}

          {/* Dùng lại (Reuse) */}
          {onReuse && (
            <button
              type="button"
              onClick={() => {
                onReuse(lightbox.url, lightbox.kind);
                closeLightbox();
              }}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-brass-500/20 border border-brass-400/40 px-3 text-[12px] font-medium text-brass-200 transition hover:bg-brass-500/30 hover:border-brass-400"
              title="Tạo khối nguồn mới từ kết quả này trên Canvas"
            >
              <Sparkles size={13} />
              <span>Dùng lại</span>
            </button>
          )}

          {/* Download */}
          <a
            href={fullUrl}
            download
            className="flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 text-[12px] text-white/90 transition hover:bg-white/15 hover:text-white"
            title="Tải về máy"
          >
            <Download size={13} />
            <span>Tải về</span>
          </a>

          {/* Copy URL */}
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(fullUrl);
              toast("Đã sao chép đường dẫn file!", "success");
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/80 transition hover:bg-white/15 hover:text-white"
            title="Sao chép link"
          >
            <Copy size={14} />
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={closeLightbox}
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-rose-500 hover:text-white"
            title="Đóng (ESC)"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* Video Cut Popup Dialog */}
      {showCutModal && isVid && (
        <div className="bg-[#181820] border-b border-white/10 px-5 py-3 flex items-center justify-center gap-4 text-[12px] z-10 shadow-2xl">
          <span className="font-medium text-cyan-300 flex items-center gap-1.5">
            <Scissors size={14} /> Cắt đoạn clip:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-white/70">Từ:</span>
            <input
              type="number"
              min={0}
              max={cutEnd}
              step={0.5}
              value={cutStart}
              onChange={(e) => setCutStart(parseFloat(e.target.value) || 0)}
              className="w-16 rounded border border-white/15 bg-white/5 px-2 py-0.5 text-center text-white"
            />
            <span className="text-white/70">giây</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-white/70">Đến:</span>
            <input
              type="number"
              min={cutStart}
              max={videoDuration || 100}
              step={0.5}
              value={cutEnd}
              onChange={(e) => setCutEnd(parseFloat(e.target.value) || 5)}
              className="w-16 rounded border border-white/15 bg-white/5 px-2 py-0.5 text-center text-white"
            />
            <span className="text-white/70">giây (Thời lượng: {(cutEnd - cutStart).toFixed(1)}s)</span>
          </div>

          <button
            type="button"
            onClick={handleCutVideo}
            disabled={isCutting}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 px-3 py-1 font-medium text-black transition shadow"
          >
            {isCutting ? <Loader2 size={12} className="animate-spin" /> : <Scissors size={12} />}
            <span>{isCutting ? "Đang xuất clip…" : "Tạo đoạn clip"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCutModal(false)}
            className="text-white/50 hover:text-white"
          >
            Hủy
          </button>
        </div>
      )}

      {/* Main View Area */}
      <div
        className="relative flex-1 overflow-hidden grid place-items-center cursor-default"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeLightbox();
        }}
      >
        {isVid ? (
          <div className="max-h-[85vh] max-w-[90vw] flex items-center justify-center">
            <video
              ref={videoRef}
              src={fullUrl}
              controls
              autoPlay
              playsInline
              onTimeUpdate={(e) => setVideoTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => {
                setVideoDuration(e.currentTarget.duration);
                setCutEnd(Math.min(e.currentTarget.duration, 5));
              }}
              className="max-h-[85vh] max-w-[90vw] rounded-xl shadow-2xl border border-white/10 bg-black"
            />
          </div>
        ) : (
          <div
            className="transition-transform duration-75 ease-out"
            style={{
              transform: `translate3d(${pos.x}px, ${pos.y}px, 0px) scale(${scale})`,
              cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
            }}
            onMouseDown={handleMouseDown}
            onDoubleClick={() => {
              if (scale > 1) {
                setScale(1);
                setPos({ x: 0, y: 0 });
              } else {
                setScale(2);
              }
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" decoding="async"
              src={fullUrl}
              alt=""
              draggable={false}
              className="max-h-[82vh] max-w-[85vw] object-contain rounded-lg shadow-2xl border border-white/10 select-none pointer-events-none"
            />
          </div>
        )}

        {/* Bottom Helper Hint */}
        {isVid ? (
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-3.5 py-1 text-[11px] text-white/60 backdrop-blur-md flex items-center gap-2">
            <span>Tạm dừng video bất kỳ lúc nào và bấm</span>
            <span className="text-amber-300 font-medium">"Cảnh dừng"</span>
            <span>để cắt khung hình làm ảnh mẫu cho Canvas</span>
          </div>
        ) : (
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-3.5 py-1 text-[11px] text-white/50 backdrop-blur-md">
            Lăn chuột để phóng to/thu nhỏ • Nhấp đúp để đổi kích thước • Kéo để di chuyển • Phím ESC để đóng
          </div>
        )}
      </div>
    </div>
  );
}
