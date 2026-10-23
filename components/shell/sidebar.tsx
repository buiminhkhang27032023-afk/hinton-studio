"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  BrainCircuit,
  Clapperboard,
  FolderOpen,
  Images,
  LayoutDashboard,
  Network,
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
  { href: "/memory", key: "nav.memory", icon: BrainCircuit },
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
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-ink-700/60 bg-ink-900/60">
      <Link href="/" className="group flex items-center gap-2.5 px-5 pb-5 pt-6">
        <LogoMark size={34} />
        <LogoWordmark />
      </Link>

      <nav className="flex-1 space-y-0.5 px-3">
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
                "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition",
                active
                  ? "bg-ink-750/90 text-ink-100"
                  : "text-ink-300 hover:bg-ink-800/70 hover:text-ink-100",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-brass-500" />
              )}
              <Icon
                size={15.5}
                strokeWidth={1.9}
                className={active ? "text-brass-400" : "text-ink-400 group-hover:text-ink-200"}
              />
              {tr(key)}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 px-3 pb-4">
        <Link
          href="/quick"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-brass-500 py-2 text-[13px] font-semibold text-ink-950 transition hover:bg-brass-400"
        >
          <FolderOpen size={14} strokeWidth={2.2} />
          Tạo video nhanh
        </Link>

        <button
          onClick={() => setLang(lang === "vi" ? "en" : "vi")}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-[12.5px] text-ink-400 transition hover:bg-ink-800/70 hover:text-ink-200"
        >
          <LogoMark size={28} />
          <span className="flex-1 text-left">{lang === "vi" ? "Tiếng Việt" : "English"}</span>
          <span className="rounded bg-ink-750 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
            {lang === "vi" ? "VI" : "EN"}
          </span>
        </button>
      </div>
    </aside>
  );
}
