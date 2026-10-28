"use client";

import React, { useEffect, useId, useRef } from "react";
import clsx from "clsx";
import gsap from "gsap";

// Slightly curved pen movements and tapered ink silhouettes, rather than a font wipe.
const PEN_STROKES = [
  { d: "M37 19 C35 40 27 76 29 99", ink: "M34 19 Q37 15 40 19 C39 44 32 76 33 96 Q32 102 27 100 C23 81 31 39 34 19Z", start: 0.35, duration: 1.12 },
  { d: "M87 19 C84 42 77 77 81 98", ink: "M85 18 Q88 15 91 19 C88 43 81 77 84 96 Q84 101 79 100 C72 85 81 40 85 18Z", start: 1.7, duration: 1.16 },
  { d: "M24 65 C43 56 65 61 93 51", ink: "M23 64 C44 53 65 60 94 49 Q97 49 94 53 C68 64 45 59 25 67 Q21 68 23 64Z", start: 3.08, duration: 0.94 },
];

export function LogoMark({ size = 36, className, animated = true }: {
  size?: number; className?: string; animated?: boolean;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const id = useId().replace(/:/g, "");
  const url = (name: string) => `url(#${id}-${name})`;

  useEffect(() => {
    if (!animated || !containerRef.current) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        const root = containerRef.current!;
        const nib = root.querySelector<SVGGElement>(".h-nib")!;
        const bloom = root.querySelector<SVGGElement>(".h-bloom")!;
        const ease = gsap.parseEase("power2.inOut");
        const strokes = PEN_STROKES.map((stroke, i) => {
          const guide = root.querySelector<SVGPathElement>(`.h-guide-${i}`)!;
          const trail = root.querySelector<SVGPathElement>(`.h-trail-${i}`)!;
          const ink = root.querySelector<SVGPathElement>(`.h-ink-${i}`)!;
          const length = guide.getTotalLength();
          // Use real SVG units for both the reveal and the moving pen.
          for (const path of [guide, trail]) {
            path.setAttribute("stroke-dasharray", `${length} ${length}`);
          }
          const sparks = Array.from({ length: 6 }, (_, j) => {
            const fraction = (j + 1) / 7;
            return {
              node: root.querySelector<SVGCircleElement>(`.h-spark-${i * 6 + j}`)!,
              point: guide.getPointAtLength(ease(fraction) * length),
              time: stroke.start + stroke.duration * fraction,
              drift: j % 2 ? 3 : -3,
            };
          });
          return { ...stroke, guide, trail, ink, length, sparks, mask: `url(#${id}-mask-${i})` };
        });
        const render = (seconds: number) => {
          nib.setAttribute("opacity", "0");
          for (const stroke of strokes) {
            const elapsed = seconds - stroke.start;
            const fraction = Math.max(0, Math.min(1, elapsed / stroke.duration));
            const progress = ease(fraction);
            const offset = stroke.length * (1 - progress);
            stroke.guide.setAttribute("stroke-dashoffset", String(offset));
            stroke.trail.setAttribute("stroke-dashoffset", String(offset));
            stroke.ink.setAttribute("opacity", elapsed > 0 ? "1" : "0");
            stroke.ink.setAttribute("mask", fraction === 1 ? "none" : stroke.mask);
            const fade = Math.max(0, 1 - Math.max(0, elapsed - stroke.duration) / 0.8);
            stroke.trail.setAttribute("opacity", elapsed > 0 ? String(0.65 * fade) : "0");
            if (elapsed >= 0 && fraction < 1) {
              const point = stroke.guide.getPointAtLength(progress * stroke.length);
              nib.setAttribute("transform", `translate(${point.x} ${point.y})`);
              nib.setAttribute("opacity", String(Math.min(1, elapsed / 0.08, (stroke.duration - elapsed) / 0.08)));
            }
            for (const spark of stroke.sparks) {
              const age = seconds - spark.time;
              const life = Math.max(0, Math.min(1, age / 0.7));
              spark.node.setAttribute("cx", String(spark.point.x + spark.drift * life));
              spark.node.setAttribute("cy", String(spark.point.y - 5 * life));
              spark.node.setAttribute("opacity", age >= 0 && age < 0.7 ? String(0.6 * (1 - life)) : "0");
            }
          }
          // The whole-letter glow starts only after the last stroke is complete.
          const finish = PEN_STROKES[2].start + PEN_STROKES[2].duration;
          const pulse = Math.max(0, Math.min(1, (seconds - finish) / 0.3)) * Math.max(0, 1 - Math.max(0, seconds - finish - 0.3) / 1.2);
          bloom.setAttribute("opacity", String(pulse * 0.24));
        };
        const clock = { seconds: 0 };
        render(0);
        const tl = gsap.timeline();
        timelineRef.current = tl;
        tl.fromTo(clock, { seconds: 0 }, {
          seconds: 5.7, duration: 5.7, ease: "none",
          onUpdate: () => render(clock.seconds),
        }, 0)
          .fromTo(".h-camera", { scale: 1.07, transformOrigin: "50% 50%" },
            { scale: 1, duration: 5.7, ease: "power2.out" }, 0);
        // GSAP owns the clock; restore a complete static mark on unmount/media change.
        return () => {
          render(5.7);
          for (const stroke of strokes) {
            stroke.guide.setAttribute("stroke-dasharray", "none");
            stroke.guide.setAttribute("stroke-dashoffset", "0");
          }
        };
      }, containerRef);
      return () => { timelineRef.current = null; ctx.revert(); };
    });
    return () => media.revert();
  }, [animated]);

  return (
    <span ref={containerRef} aria-hidden="true"
      onMouseEnter={() => { const tl = timelineRef.current; if (tl && !tl.isActive()) tl.restart(); }}
      className={clsx("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}>
      <svg className="h-camera relative overflow-visible" viewBox="0 0 120 120" width={size} height={size} shapeRendering="geometricPrecision">
        <defs>
          <linearGradient id={`${id}-ink`} x1="20" y1="15" x2="95" y2="105" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff4da" /><stop offset="0.5" stopColor="#e8c98d" /><stop offset="1" stopColor="#b99253" />
          </linearGradient>
          <filter id={`${id}-glow`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="1.7" /></filter>
          <filter id={`${id}-bloom`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5" /></filter>
          {PEN_STROKES.map((stroke, i) => (
            <mask key={i} id={`${id}-mask-${i}`} maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120" style={{ maskType: "luminance" }}>
              <path className={`h-guide-${i} h-draw-${i}`} d={stroke.d} fill="none" stroke="white" strokeWidth="16" strokeLinecap="butt" strokeDashoffset="0" />
            </mask>
          ))}
        </defs>
        <g className="h-bloom" opacity="0" filter={url("bloom")} fill="#ebc880">
          {PEN_STROKES.map((stroke, i) => <path key={i} d={stroke.ink} />)}
        </g>
        {PEN_STROKES.map((stroke, i) => (
          <g key={i}>
            <path className={`h-trail-${i}`} d={stroke.d} stroke="#f5cc7c" strokeWidth="5" strokeLinecap="butt" fill="none" opacity="0" filter={url("glow")} />
            <path className={`h-ink h-ink-${i}`} d={stroke.ink} fill={url("ink")} mask={url(`mask-${i}`)} />
          </g>
        ))}
        <g fill="#ffe8b5">
          {Array.from({ length: 18 }, (_, i) => <circle key={i} className={`h-spark-${i}`} r={i % 3 === 0 ? 0.35 : 0.18} opacity="0" />)}
        </g>
        <g className="h-nib" opacity="0">
          <circle r="3.4" fill="#ffcf7a" opacity="0.75" filter={url("glow")} />
          <ellipse rx="2.2" ry="0.38" fill="#fff2d1" opacity="0.8" />
          <circle r="0.65" fill="#fffaf0" />
        </g>
      </svg>
    </span>
  );
}

/**
 * Wordmark: "HINTON AI STUDIO" with kinetic typography entrance
 * and continuous high-end luxury luster.
 */
export function LogoWordmark({ className }: { className?: string }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const lettersRef = useRef<(HTMLSpanElement | null)[]>([]);
  const subRef = useRef<HTMLSpanElement>(null);

  const word = "HINTON";

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // Kinetic letter entrance
      gsap.fromTo(
        lettersRef.current,
        {
          y: 8,
          opacity: 0,
          scale: 0.85,
          filter: "blur(4px)",
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          filter: "blur(0px)",
          duration: 0.7,
          stagger: 0.05,
          ease: "power3.out",
        },
      );

      // Subtitle expand animation
      gsap.fromTo(
        subRef.current,
        {
          opacity: 0.5,
          letterSpacing: "0.2em",
        },
        {
          opacity: 0.85,
          letterSpacing: "0.28em",
          duration: 1,
          delay: 0.3,
          ease: "power2.out",
        },
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <span ref={containerRef} className={clsx("inline-flex flex-col select-none", className)}>
      <span className="flex items-center tracking-[0.04em] text-[18px] font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#fff5dd] via-[#eec988] to-[#d4a04d]">
        {word.split("").map((char, i) => (
          <span
            key={i}
            ref={(el) => {
              lettersRef.current[i] = el;
            }}
            className="inline-block transition-transform duration-200 hover:-translate-y-0.5"
          >
            {char}
          </span>
        ))}
      </span>
      <span
        ref={subRef}
        className="-mt-0.5 block text-[10.5px] font-bold lowercase tracking-[0.28em] text-[#e8c98d]"
      >
        studio
      </span>
    </span>
  );
}
