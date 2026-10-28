"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";

export default function BrandPreview() {
  const [take, setTake] = useState(0);
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-black text-amber-100">
      <Link href="/" className="absolute left-6 top-6 text-xs text-white/40 transition hover:text-white">← Về studio</Link>
      <div className="flex flex-col items-center gap-10" role="img" aria-label="Chữ H được vẽ tay từng nét bằng ánh sáng trên nền đen">
        <LogoMark key={take} size={280} />

      </div>
      <div className="mt-16 flex flex-wrap items-center justify-center gap-3">
      <button onClick={() => setTake((value) => value + 1)} className="rounded-full border border-amber-100/15 px-6 py-2.5 text-xs text-amber-100/65 transition hover:border-amber-100/40 hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200">Phát lại hiệu ứng ↻</button>
        <a href="/brand/h-handdraw-intro.mp4" download="H-ve-tay.mp4" className="rounded-full bg-amber-100 px-6 py-2.5 text-xs font-semibold text-black transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200">Tải video MP4 ↓</a>
      </div>
      <p className="mt-4 text-[11px] text-white/35">1080 × 1080 · 6,5 giây · nền đen</p>
    </main>
  );
}
