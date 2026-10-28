"use client";

import { useEffect, useRef, type VideoHTMLAttributes } from "react";

type Props = Omit<VideoHTMLAttributes<HTMLVideoElement>, "autoPlay" | "preload"> & {
  src: string;
  /** "hover": play only while the pointer is over it (default). "visible": play while on screen. */
  playMode?: "hover" | "visible";
};

/**
 * Thumbnail video that does NOT download/decode until needed.
 * Many simultaneous autoplaying <video> elements (canvas nodes, library grid)
 * were saturating CPU/GPU and network, freezing the UI.
 */
export function LazyVideo({ src, playMode = "hover", onMouseEnter, onMouseLeave, ...rest }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  // "#t=0.1" makes the browser show the first frame with only metadata loaded.
  const poster = src.includes("#") ? src : `${src}#t=0.1`;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) el.pause();
        else if (playMode === "visible") el.play().catch(() => {});
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [playMode]);

  return (
    <video
      ref={ref}
      src={poster}
      preload="metadata"
      muted
      loop
      playsInline
      onMouseEnter={(e) => {
        if (playMode === "hover") e.currentTarget.play().catch(() => {});
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (playMode === "hover") e.currentTarget.pause();
        onMouseLeave?.(e);
      }}
      {...rest}
    />
  );
}
