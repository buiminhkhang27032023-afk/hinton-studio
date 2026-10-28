"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useUi } from "@/lib/ui-store";
import { withBasePath } from "@/lib/base-path";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Copy,
  Sparkles,
  Maximize2,
} from "lucide-react";

export function MediaLightbox({
  onReuse,
}: {
  onReuse?: (url: string, kind?: "image" | "video") => void;
}) {
  const { lightbox, closeLightbox, toast } = useUi();
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });

  // Reset zoom & pan on open
  useEffect(() => {
    if (lightbox) {
      setScale(1);
      setPos({ x: 0, y: 0 });
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
      <header className="flex h-14 w-full items-center justify-between border-b border-white/10 px-5 bg-black/40">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold tracking-wide text-white/90">
            {lightbox.title || (isVid ? "Xem Video Chi Tiết" : "Phóng To Ảnh")}
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-mono text-white/60">
            {Math.round(scale * 100)}%
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
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
              src={fullUrl}
              controls
              autoPlay
              playsInline
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
        {!isVid && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-3.5 py-1 text-[11px] text-white/50 backdrop-blur-md">
            Lăn chuột để phóng to/thu nhỏ • Nhấp đúp để đổi kích thước • Kéo để di chuyển • Phím ESC để đóng
          </div>
        )}
      </div>
    </div>
  );
}
