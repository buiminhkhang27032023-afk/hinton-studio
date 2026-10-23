"use client";

import clsx from "clsx";

/**
 * The Hinton mark: an H drawn the way the Netflix N is — thick squared strokes
 * with a folded face, so one side of each stem catches light and the other
 * falls into shadow. A bright band sweeps across it on a loop.
 */
export function LogoMark({
  size = 32,
  className,
  animated = true,
}: {
  size?: number;
  className?: string;
  animated?: boolean;
}) {
  return (
    <span
      className={clsx("logo-mark relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="logo-face" />
      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        className="relative z-10"
        shapeRendering="geometricPrecision"
      >
        <defs>
          {/* Lit face of each stroke */}
          <linearGradient id="h-lit" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fffaf0" />
            <stop offset="55%" stopColor="#f5e2ba" />
            <stop offset="100%" stopColor="#d8b57a" />
          </linearGradient>
          {/* Shadowed face */}
          <linearGradient id="h-shade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c69b5c" />
            <stop offset="60%" stopColor="#9a7238" />
            <stop offset="100%" stopColor="#6d4f24" />
          </linearGradient>
          {/* Crossbar gets its own gradient so the fold reads clearly */}
          <linearGradient id="h-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff8e8" />
            <stop offset="100%" stopColor="#dcb980" />
          </linearGradient>
        </defs>

        {/* Left stem: lit face + shadow face, hard vertical crease */}
        <polygon points="6,5 9.4,5 9.4,27 6,27" fill="url(#h-lit)" />
        <polygon points="9.4,5 11.6,5 11.6,27 9.4,27" fill="url(#h-shade)" />

        {/* Right stem: mirrored, shadow on the outside edge */}
        <polygon points="20.4,5 22.6,5 22.6,27 20.4,27" fill="url(#h-shade)" />
        <polygon points="22.6,5 26,5 26,27 22.6,27" fill="url(#h-lit)" />

        {/* Crossbar: upper face lit, lower face shaded */}
        <polygon points="11.6,12.6 20.4,12.6 20.4,15.6 11.6,15.6" fill="url(#h-bar)" />
        <polygon points="11.6,15.6 20.4,15.6 20.4,18.6 11.6,18.6" fill="url(#h-shade)" opacity="0.92" />

        {/* Thin dark seam where the faces meet — the fold */}
        <path d="M11.6 5v22M20.4 5v22" stroke="#5c4118" strokeWidth="0.5" opacity="0.55" />
        <path d="M11.6 15.6h8.8" stroke="#5c4118" strokeWidth="0.5" opacity="0.55" />
      </svg>
      {animated && <span className="logo-streak" />}
    </span>
  );
}

/** Wordmark: uppercase, with a metallic light band sweeping through it. */
export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span className={clsx("leading-none", className)}>
      <span className="logo-word block font-sans text-[19px] font-bold uppercase leading-none tracking-[-0.01em]">
        Hinton
      </span>
      <span className="mt-1 block text-[9.5px] uppercase tracking-[0.22em] text-ink-500">
        AI Studio
      </span>
    </span>
  );
}
