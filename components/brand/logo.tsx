"use client";

import React, { useEffect, useRef } from "react";
import clsx from "clsx";
import gsap from "gsap";

/**
 * The Nefertiti-Inspired Regal "H" Mark.
 * Crafted with haute-couture faceted golden geometry, diamond-cut bridge,
 * and cinematic light-shimmer driven by GSAP animations.
 */
export function LogoMark({
  size = 36,
  className,
  animated = true,
}: {
  size?: number;
  className?: string;
  animated?: boolean;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const leftTowerRef = useRef<SVGPolygonElement>(null);
  const rightTowerRef = useRef<SVGPolygonElement>(null);
  const bridgeRef = useRef<SVGPolygonElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  const sheenRef = useRef<SVGLinearGradientElement>(null);

  useEffect(() => {
    if (!animated || !containerRef.current) return;

    const ctx = gsap.context(() => {
      // Entrance timeline
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        glowRef.current,
        { scale: 0.3, opacity: 0 },
        { scale: 1, opacity: 0.8, duration: 1.2, ease: "elastic.out(1, 0.5)" },
      )
        .fromTo(
          [leftTowerRef.current, rightTowerRef.current],
          { y: -16, opacity: 0, scaleY: 0.4, transformOrigin: "50% 50%" },
          { y: 0, opacity: 1, scaleY: 1, duration: 0.9, stagger: 0.12, ease: "back.out(2)" },
          "-=0.8",
        )
        .fromTo(
          bridgeRef.current,
          { scaleX: 0, opacity: 0, transformOrigin: "50% 50%" },
          { scaleX: 1, opacity: 1, duration: 0.6, ease: "power4.out" },
          "-=0.4",
        );

      // Continuous golden light sweep loop
      gsap.to(sheenRef.current, {
        attr: { x1: "150%", x2: "250%" },
        repeat: -1,
        duration: 3.2,
        ease: "power2.inOut",
        repeatDelay: 1.2,
      });
    }, containerRef);

    return () => ctx.revert();
  }, [animated]);

  const handleMouseEnter = () => {
    if (!containerRef.current) return;
    gsap.to(containerRef.current, {
      scale: 1.12,
      filter: "drop-shadow(0 0 12px rgba(234, 179, 8, 0.75))",
      duration: 0.3,
      ease: "power2.out",
    });
  };

  const handleMouseLeave = () => {
    if (!containerRef.current) return;
    gsap.to(containerRef.current, {
      scale: 1,
      filter: "drop-shadow(0 0 4px rgba(234, 179, 8, 0.2))",
      duration: 0.4,
      ease: "power2.out",
    });
  };

  return (
    <span
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={clsx("relative inline-grid shrink-0 place-items-center cursor-pointer transition-transform", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox="0 0 44 44"
        width={size}
        height={size}
        className="relative z-10 overflow-visible"
        shapeRendering="geometricPrecision"
      >
        <defs>
          {/* Ambient Nefertiti Gold Aura */}
          <radialGradient id="nef-aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#eab308" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#ca8a04" stopOpacity="0" />
          </radialGradient>

          {/* Primary Nefertiti Gold Gradient */}
          <linearGradient id="nef-gold-main" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fffdf0" />
            <stop offset="30%" stopColor="#fef08a" />
            <stop offset="70%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          {/* Faceted Shadow Gold Gradient */}
          <linearGradient id="nef-gold-shade" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#451a03" />
            <stop offset="50%" stopColor="#92400e" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Sweeping Light Sheen */}
          <linearGradient ref={sheenRef} id="nef-sheen" x1="-100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Ambient Back Glow */}
        <circle ref={glowRef} cx="22" cy="22" r="20" fill="url(#nef-aura)" />

        {/* Left Regal Tower (Chamfered Top & Stepped Egyptian Crown) */}
        <g ref={leftTowerRef}>
          {/* Main Tower Body */}
          <polygon points="7,8 14,4 15,38 8,40" fill="url(#nef-gold-main)" />
          {/* Beveled Outer Facet */}
          <polygon points="7,8 8,40 5,38 5,10" fill="url(#nef-gold-shade)" />
          {/* Crown Tip Highlight */}
          <polygon points="7,8 14,4 12,3 6,6" fill="#fffef5" opacity="0.9" />
        </g>

        {/* Right Regal Tower (Mirrored Symmetry) */}
        <g ref={rightTowerRef}>
          {/* Main Tower Body */}
          <polygon points="30,4 37,8 36,40 29,38" fill="url(#nef-gold-main)" />
          {/* Beveled Outer Facet */}
          <polygon points="37,8 39,10 39,38 36,40" fill="url(#nef-gold-shade)" />
          {/* Crown Tip Highlight */}
          <polygon points="30,4 37,8 38,6 32,3" fill="#fffef5" opacity="0.9" />
        </g>

        {/* Central Diamond-Cut Bridge */}
        <polygon
          ref={bridgeRef}
          points="14,18 30,18 27,24 17,24"
          fill="url(#nef-gold-main)"
          stroke="#fffaf0"
          strokeWidth="0.5"
        />

        {/* Center Diamond Gem Emblem */}
        <polygon points="22,17 25,21 22,25 19,21" fill="#fffef0" opacity="0.95" />

        {/* Light Sheen Overlay */}
        <rect x="5" y="3" width="34" height="38" fill="url(#nef-sheen)" style={{ mixBlendMode: "overlay" }} />
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
          opacity: 0,
          letterSpacing: "0.15em",
        },
        {
          opacity: 0.7,
          letterSpacing: "0.26em",
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
      <span className="flex items-center tracking-[0.04em] font-sans text-[17px] font-extrabold uppercase leading-none text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-200 to-amber-500">
        {word.split("").map((char, i) => (
          <span
            key={i}
            ref={(el) => {
              lettersRef.current[i] = el;
            }}
            className="inline-block transition-transform hover:-translate-y-0.5"
          >
            {char}
          </span>
        ))}
      </span>
      <span
        ref={subRef}
        className="mt-1 block text-[8.5px] font-semibold uppercase tracking-[0.26em] text-amber-200/60"
      >
        AI CINEMATIC
      </span>
    </span>
  );
}
