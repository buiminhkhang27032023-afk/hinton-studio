"use client";

import { withBasePath } from "@/lib/base-path";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Clapperboard,
  Coins,
  Film,
  FolderPlus,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Lightbulb,
  Mic,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Scissors,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Video,
  Wand2,
} from "lucide-react";
import clsx from "clsx";
import gsap from "gsap";
import { api } from "@/lib/api-client";
import { useUi } from "@/lib/ui-store";
import type { ProjectSummary } from "@/lib/types";
import { Button, IconButton, Modal, Input } from "@/components/ui/primitives";
import { ScriptDirectorModal } from "@/components/canvas/script-director-modal";
import type { ProductionPlan } from "@/app/api/script-director/route";

export default function ProjectsPage() {
  const { tr, toast } = useUi();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<"all" | "film" | "fashion" | "ad">("all");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [flovaOpen, setFlovaOpen] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const load = () =>
    api.projects
      .list()
      .then((list) => {
        setProjects(list);
      })
      .catch((error) => toast(error.message, "error"));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // GSAP Smooth Entrance Animation
  useEffect(() => {
    if (!projects || !containerRef.current) return;
    const ctx = gsap.context(() => {
      if (heroRef.current) {
        gsap.from(heroRef.current, {
          opacity: 0.3,
          y: 10,
          duration: 0.4,
          ease: "power2.out",
        });
      }
      if (cardsRef.current) {
        gsap.from(cardsRef.current.children, {
          opacity: 0.3,
          y: 12,
          duration: 0.4,
          stagger: 0.03,
          ease: "power2.out",
        });
      }
    }, containerRef);
    return () => ctx.revert();
  }, [projects]);

  const create = async () => {
    try {
      const project = await api.projects.create(name || "Dự án mới");
      setCreating(false);
      setName("");
      router.push(`/canvas/${project.id}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Không tạo được dự án", "error");
    }
  };

  const remove = async (id: string) => {
    if (!confirm(tr("common.confirmDelete"))) return;
    await api.projects.remove(id);
    setMenuFor(null);
    toast(tr("toast.deleted"), "success");
    load();
  };

  // Featured project (e.g. Breakup 30s or first project with thumbnail)
  const featured =
    projects?.find((p) => p.id === "prj_breakup_30s") ??
    projects?.find((p) => p.thumbnail) ??
    projects?.[0];

  // Filtered projects
  const filteredProjects = (projects ?? []).filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;
    if (category === "film") return p.name.toLowerCase().includes("phim") || p.name.toLowerCase().includes("kiếm hiệp") || p.name.toLowerCase().includes("chiến đấu");
    if (category === "fashion") return p.name.toLowerCase().includes("lookbook") || p.name.toLowerCase().includes("thời trang") || p.name.toLowerCase().includes("outfit");
    if (category === "ad") return p.name.toLowerCase().includes("tvc") || p.name.toLowerCase().includes("quảng cáo") || p.name.toLowerCase().includes("galaxy");
    return true;
  });

  const handleApplyFlova = async (plan: ProductionPlan) => {
    try {
      const newPrj = await api.projects.create(plan.project_analysis.title || "Kịch bản Flova mới");
      toast(`Đã khởi tạo dự án "${newPrj.name}"!`, "success");
      router.push(`/canvas/${newPrj.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Lỗi tạo dự án", "error");
    }
  };

  return (
    <div ref={containerRef} className="flex h-full flex-col overflow-y-auto bg-[#0b0b0f] text-ink-100">
      {/* Top Header Matching Image 1 */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#0e0e13]/95 px-8 py-3.5 backdrop-blur-md">
        {/* Search Input */}
        <div className="relative w-full max-w-lg">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm dự án, nhân vật, cảnh phim..."
            className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-10 pr-10 text-[13px] text-white placeholder:text-ink-500 focus:border-amber-400 focus:bg-black/50 focus:outline-none transition"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-ink-400 font-mono">
            ⌘K
          </kbd>
        </div>

        {/* Right Controls Matching Image 1 */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-ink-300 hover:bg-white/10 hover:text-white transition"
            title="Trợ giúp & Hướng dẫn"
          >
            <HelpCircle size={17} />
          </button>

          {/* Credits Badge */}
          <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[12px] font-semibold text-amber-300">
            <Coins size={14} className="text-amber-400" />
            <span>1.250 tín dụng</span>
          </div>

          {/* Avatar */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-gradient-to-tr from-amber-600 to-amber-200 text-[12px] font-bold text-black shadow">
            H
          </div>

          {/* + Tạo dự án Button Matching Image 1 */}
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#eac476] to-[#dfb45e] px-4 py-2 text-[13px] font-bold text-black shadow-lg shadow-amber-500/20 hover:from-[#f3cf86] hover:to-[#ebc16e] transition"
          >
            <Plus size={16} strokeWidth={2.6} />
            Tạo dự án
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <div className="flex-1 space-y-8 px-8 py-6">
        {/* Section: Tiếp tục dự án (Hero Section Matching Image 1) */}
        <section ref={heroRef} className="space-y-3">
          <div>
            <h2 className="text-[20px] font-bold tracking-tight text-white">Tiếp tục dự án</h2>
            <p className="text-[12.5px] text-ink-400">Chọn dự án để bắt đầu làm việc</p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Left Featured Project Banner (7 cols) */}
            <div className="relative flex flex-col justify-end overflow-hidden rounded-2xl border border-white/10 bg-[#14141c] shadow-2xl lg:col-span-8 min-h-[340px] group">
              {featured?.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img loading="lazy" decoding="async"
                  src={withBasePath(featured.thumbnail)}
                  alt={featured.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-tr from-[#161622] via-[#212130] to-[#14141c]" />
              )}
              {/* Gradient Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />

              {/* Title & Actions */}
              <div className="relative z-10 p-6 space-y-3.5">
                <div className="space-y-1">
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-amber-300 border border-amber-500/30">
                    Dự án tiêu điểm
                  </span>
                  <h3 className="text-[28px] font-black tracking-tight text-white drop-shadow-md">
                    {featured?.name || "Cơn mưa chia tay"}
                  </h3>
                </div>

                {/* Bottom Action Bar Matching Image 1 */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (featured) router.push(`/canvas/${featured.id}`);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-[12.5px] font-semibold text-white backdrop-blur hover:bg-white/20 transition"
                  >
                    <Play size={13} fill="currentColor" />
                    Xem trước
                  </button>

                  <Link
                    href={featured ? `/canvas/${featured.id}` : "/canvas"}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#eac476] to-[#dfb45e] px-4 py-2 text-[12.5px] font-bold text-black shadow-lg shadow-amber-500/20 hover:from-[#f3cf86] hover:to-[#ebc16e] transition"
                  >
                    Tiếp tục dựng
                    <ArrowRight size={14} />
                  </Link>

                  <span className="h-4 w-px bg-white/20 mx-1 hidden sm:block" />

                  <Link
                    href={featured ? `/canvas/${featured.id}` : "/canvas"}
                    className="flex items-center gap-1 rounded-lg bg-black/40 px-2.5 py-1.5 text-[12px] text-ink-200 hover:bg-white/15 hover:text-white transition"
                  >
                    <ImageIcon size={13} className="text-sky-300" />
                    Tạo ảnh
                  </Link>

                  <Link
                    href={featured ? `/canvas/${featured.id}` : "/canvas"}
                    className="flex items-center gap-1 rounded-lg bg-black/40 px-2.5 py-1.5 text-[12px] text-ink-200 hover:bg-white/15 hover:text-white transition"
                  >
                    <Video size={13} className="text-amber-300" />
                    Tạo video
                  </Link>

                  <Link
                    href={featured ? `/canvas/${featured.id}` : "/canvas"}
                    className="flex items-center gap-1 rounded-lg bg-black/40 px-2.5 py-1.5 text-[12px] text-ink-200 hover:bg-white/15 hover:text-white transition"
                  >
                    <Mic size={13} className="text-rose-300" />
                    Âm thanh
                  </Link>

                  <Link
                    href="/seecut"
                    className="flex items-center gap-1 rounded-lg bg-black/40 px-2.5 py-1.5 text-[12px] text-ink-200 hover:bg-white/15 hover:text-white transition"
                  >
                    <Scissors size={13} className="text-emerald-300" />
                    Biên tập
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column (4 cols) Matching Image 1 */}
            <div className="flex flex-col gap-4 lg:col-span-4">
              {/* Widget: Đang xử lý Matching Image 1 */}
              <div className="flex-1 rounded-2xl border border-white/10 bg-[#121218] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[13px] font-bold text-white">
                    <Sparkles size={14} className="text-amber-400" />
                    Đang xử lý
                  </div>
                  <Link
                    href="/memory"
                    className="text-[11.5px] font-medium text-amber-300 hover:underline"
                  >
                    Xem hàng đợi &gt;
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {/* Task 1 */}
                  <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 hover:bg-white/5 transition">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async"
                      src="/api/files/prj_wuxia_30s/asset_poster_kiem_hiep.jpg"
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover bg-black/50"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="truncate font-semibold text-white">Phim Kiếm Hiệp 30s</span>
                        <span className="font-mono text-[11px] text-amber-300">72%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500" style={{ width: "72%" }} />
                      </div>
                    </div>
                    <button type="button" className="p-1 text-ink-400 hover:text-white">
                      <Pause size={13} />
                    </button>
                    <button type="button" className="p-1 text-ink-400 hover:text-white">
                      <MoreHorizontal size={13} />
                    </button>
                  </div>

                  {/* Task 2 */}
                  <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 hover:bg-white/5 transition">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async"
                      src="/api/files/prj_a9c0d8476382/asset_3106e08099f9-Nh-n-di-n-ng--i-m-u.png"
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover bg-black/50"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="truncate font-semibold text-white">Lookbook nam 15s</span>
                        <span className="font-mono text-[11px] text-amber-300">40%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500" style={{ width: "40%" }} />
                      </div>
                    </div>
                    <button type="button" className="p-1 text-ink-400 hover:text-white">
                      <Pause size={13} />
                    </button>
                    <button type="button" className="p-1 text-ink-400 hover:text-white">
                      <MoreHorizontal size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Widget: Tạo nhanh Matching Image 1 */}
              <div className="rounded-2xl border border-white/10 bg-[#121218] p-4 space-y-2.5">
                <div className="flex items-center gap-1.5 text-[13px] font-bold text-white">
                  <Wand2 size={14} className="text-amber-400" />
                  Tạo nhanh
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFlovaOpen(true)}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center transition hover:border-amber-400/50 hover:bg-amber-500/10 group"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 group-hover:scale-110 transition">
                      <Lightbulb size={16} />
                    </div>
                    <span className="text-[11.5px] font-medium text-ink-200 group-hover:text-white">
                      Từ ý tưởng
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center transition hover:border-sky-400/50 hover:bg-sky-500/10 group"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 group-hover:scale-110 transition">
                      <ImageIcon size={16} />
                    </div>
                    <span className="text-[11.5px] font-medium text-ink-200 group-hover:text-white">
                      Từ ảnh
                    </span>
                  </button>

                  <Link
                    href="/quick"
                    className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center transition hover:border-rose-400/50 hover:bg-rose-500/10 group"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 group-hover:scale-110 transition">
                      <Video size={16} />
                    </div>
                    <span className="text-[11.5px] font-medium text-ink-200 group-hover:text-white">
                      Từ video
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Dự án gần đây Matching Image 1 */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-[18px] font-bold text-white">Dự án gần đây</h2>

              {/* Filter Pills Matching Image 1 */}
              <div className="flex items-center gap-1 rounded-full bg-white/5 p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => setCategory("all")}
                  className={clsx(
                    "rounded-full px-3 py-1 text-[12px] font-medium transition",
                    category === "all"
                      ? "bg-amber-400 text-black font-bold shadow"
                      : "text-ink-400 hover:text-white",
                  )}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setCategory("film")}
                  className={clsx(
                    "rounded-full px-3 py-1 text-[12px] font-medium transition",
                    category === "film"
                      ? "bg-amber-400 text-black font-bold shadow"
                      : "text-ink-400 hover:text-white",
                  )}
                >
                  Phim
                </button>
                <button
                  type="button"
                  onClick={() => setCategory("fashion")}
                  className={clsx(
                    "rounded-full px-3 py-1 text-[12px] font-medium transition",
                    category === "fashion"
                      ? "bg-amber-400 text-black font-bold shadow"
                      : "text-ink-400 hover:text-white",
                  )}
                >
                  Thời trang
                </button>
                <button
                  type="button"
                  onClick={() => setCategory("ad")}
                  className={clsx(
                    "rounded-full px-3 py-1 text-[12px] font-medium transition",
                    category === "ad"
                      ? "bg-amber-400 text-black font-bold shadow"
                      : "text-ink-400 hover:text-white",
                  )}
                >
                  Quảng cáo
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex items-center gap-1 text-[12px] text-ink-400 hover:text-white"
              >
                <SlidersHorizontal size={13} />
                Mới nhất
              </button>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-[12px] font-semibold text-amber-300 hover:underline"
              >
                Xem tất cả &gt;
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#14141c] hover:border-amber-400/40 hover:shadow-xl hover:shadow-amber-500/5 transition duration-300"
              >
                <Link href={`/canvas/${project.id}`} className="block flex-1">
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/60">
                    {project.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img loading="lazy" decoding="async"
                        src={withBasePath(project.thumbnail)}
                        alt={project.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(245,158,11,.15),transparent_60%)] text-ink-600">
                        <Clapperboard size={28} className="text-amber-400/40 group-hover:text-amber-400 transition" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300" />
                  </div>

                  <div className="p-3.5 space-y-1">
                    <h4 className="truncate text-[13.5px] font-semibold text-white group-hover:text-amber-300 transition">
                      {project.name}
                    </h4>
                    <p className="text-[11px] text-ink-500">
                      Cập nhật {new Date(project.updatedAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </Link>

                {/* 3-dots menu button */}
                <div className="absolute right-2 bottom-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuFor(menuFor === project.id ? null : project.id);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-ink-400 hover:bg-white/10 hover:text-white transition"
                  >
                    <MoreHorizontal size={15} />
                  </button>

                  {menuFor === project.id && (
                    <div className="absolute right-0 bottom-8 z-30 w-36 overflow-hidden rounded-xl border border-white/15 bg-[#181822] shadow-2xl animate-in fade-in">
                      <Link
                        href={`/canvas/${project.id}`}
                        className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-ink-200 hover:bg-white/10 hover:text-white"
                      >
                        <Play size={12} /> Mở Canvas
                      </Link>
                      <button
                        type="button"
                        onClick={() => remove(project.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-rose-300 hover:bg-rose-500/20"
                      >
                        <Trash2 size={12} /> {tr("common.delete")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* New Project Modal */}
      <Modal open={creating} onClose={() => setCreating(false)} title="Tạo dự án mới" width={420}>
        <div className="space-y-4 pt-1">
          <Input
            autoFocus
            placeholder="Nhập tên dự án (ví dụ: TVC Thời Trang Thu Đông, Phim Hành Động 15s...)"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && create()}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCreating(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={create}>
              Tạo không gian dựng
            </Button>
          </div>
        </div>
      </Modal>

      {/* Flova Script Director Modal launched from Dashboard "Từ ý tưởng" */}
      <ScriptDirectorModal
        isOpen={flovaOpen}
        onClose={() => setFlovaOpen(false)}
        onApplyPlan={handleApplyFlova}
      />
    </div>
  );
}
