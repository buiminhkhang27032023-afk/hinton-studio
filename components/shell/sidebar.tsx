"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  BarChart3,
  Clapperboard,
  FolderOpen,
  Images,
  LayoutDashboard,
  Scissors,
  Settings,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";
import { useEffect } from "react";
import { useUi } from "@/lib/ui-store";
import { useStudio } from "@/lib/studio-store";
import { LogoMark, LogoWordmark } from "@/components/brand/logo";

const NAV = [
  { href: "/", key: "nav.projects", icon: LayoutDashboard },
  { href: "/quick", key: "nav.quick", icon: Clapperboard },
  { href: "/seecut", key: "nav.seecut", icon: Scissors },
  { href: "/canvas", key: "nav.canvas", icon: Boxes },
  { href: "/memory", key: "nav.memory", icon: BarChart3 },
  { href: "/library", key: "nav.library", icon: Images },
  { href: "/models", key: "nav.models", icon: Sparkles },
  { href: "/settings", key: "nav.settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { tr, lang, setLang } = useUi();
  const currentProjectId = useStudio((s) => s.project?.id);

  useEffect(() => {
    const stored = localStorage.getItem("atelier:lang");
    if (stored === "vi" || stored === "en") setLang(stored);
  }, [setLang]);

  return (
    <aside className="flex w-[208px] shrink-0 flex-col border-r border-white/10 bg-[#0e0e13]/90 backdrop-blur-md">
      {/* Brand Logo with Nefertiti Animated H and Kinetic Wordmark */}
      <Link href="/" className="group flex items-center gap-2.5 px-4 pb-4 pt-5 transition">
        <LogoMark size={32} />
        <LogoWordmark />
      </Link>

      <nav className="flex-1 space-y-0.5 px-2.5">
        {NAV.map(({ href, key, icon: Icon }) => {
          const targetHref =
            key === "nav.canvas" && currentProjectId ? `/canvas/${currentProjectId}` : href;
          const active =
            href === "/"
              ? pathname === "/"
              : key === "nav.canvas"
                ? pathname.startsWith("/canvas")
                : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={targetHref}
              className={clsx(
                "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-[13px] font-medium transition",
                active
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-3.5 w-[2.5px] -translate-y-1/2 rounded-full bg-amber-400" />
              )}
              <Icon
                size={15}
                strokeWidth={1.8}
                className={active ? "text-amber-300" : "text-neutral-500 group-hover:text-neutral-300"}
              />
              <span className="truncate">{tr(key)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Action & Lang Switch */}
      <div className="space-y-1.5 px-2.5 pb-3 pt-2 border-t border-white/5">
        <Link
          href="/quick"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-2 text-[12px] font-bold text-black shadow-md transition hover:from-amber-400 hover:to-amber-500"
        >
          <FolderOpen size={13} strokeWidth={2.2} />
          Tạo video nhanh
        </Link>

        <button
          type="button"
          onClick={() => setLang(lang === "vi" ? "en" : "vi")}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[11.5px] text-neutral-400 transition hover:bg-white/5 hover:text-white"
        >
          <span className="text-[11px] text-neutral-500">Ngôn ngữ</span>
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300 uppercase">
            {lang === "vi" ? "🇻🇳 Tiếng Việt" : "🇺🇸 English"}
          </span>
        </button>
      </div>
    </aside>
  );
}
