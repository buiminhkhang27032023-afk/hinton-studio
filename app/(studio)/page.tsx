"use client";

import { withBasePath } from "@/lib/base-path";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  FolderPlus,
  MoreHorizontal,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useUi } from "@/lib/ui-store";
import type { ProjectSummary } from "@/lib/types";
import { Button, IconButton, Modal, Input } from "@/components/ui/primitives";

export default function ProjectsPage() {
  const { tr, toast } = useUi();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const load = () =>
    api.projects
      .list()
      .then(setProjects)
      .catch((error) => toast(error.message, "error"));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex flex-wrap items-end justify-between gap-4 px-8 pb-5 pt-8">
        <div>
          <h1 className="font-display text-[28px] leading-tight tracking-tight text-white">
            HINTON & SEECUT AI STUDIO
          </h1>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-ink-400">
            Hệ sinh thái sản xuất video và hình ảnh AI cho thời trang.
          </p>
        </div>

        <Button variant="primary" onClick={() => setCreating(true)}>
          <Plus size={15} strokeWidth={2.4} />
          {tr("dash.newProject")}
        </Button>
      </header>

      <div className="flex-1 px-8 pb-10 space-y-8">
        <div>
            {projects === null ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="shimmer h-[190px] rounded-xl2" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="mx-auto mt-16 max-w-md rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 px-8 py-12 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-ink-800 text-brass-400">
                  <FolderPlus size={20} />
                </span>
                <h2 className="mt-4 font-display text-[21px]">{tr("dash.emptyTitle")}</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">{tr("dash.emptyBody")}</p>
                <Button variant="primary" className="mt-5" onClick={() => setCreating(true)}>
                  <Sparkles size={14} />
                  {tr("dash.newProject")}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="group relative overflow-hidden rounded-xl2 border border-ink-700/70 bg-ink-850/70 transition hover:border-ink-600 hover:bg-ink-800/80"
                  >
                    <Link href={`/canvas/${project.id}`} className="block">
                      <div className="relative aspect-[16/10] overflow-hidden bg-ink-900">
                        {project.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={withBasePath(project.thumbnail)}
                            alt=""
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(214,171,99,.12),transparent_55%)] text-ink-600">
                            <Sparkles size={26} strokeWidth={1.4} />
                          </div>
                        )}
                      </div>
                      <div className="flex items-start justify-between gap-2 px-4 py-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-[14px] font-medium text-ink-100">{project.name}</h3>
                          <p className="mt-0.5 text-[11.5px] text-ink-500">
                            {tr("dash.updated")} {new Date(project.updatedAt).toLocaleDateString("vi-VN")}
                          </p>
                        </div>
                        <ArrowRight
                          size={15}
                          className="mt-0.5 shrink-0 text-ink-500 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                        />
                      </div>
                    </Link>

                    <div className="absolute right-2 top-2">
                      <IconButton
                        label="Tuỳ chọn"
                        onClick={() => setMenuFor(menuFor === project.id ? null : project.id)}
                        className="bg-ink-950/70 backdrop-blur"
                      >
                        <MoreHorizontal size={15} />
                      </IconButton>
                      {menuFor === project.id && (
                        <div className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-lg border border-ink-700 bg-ink-850 shadow-xl">
                          <button
                            onClick={() => remove(project.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-red-300 hover:bg-ink-750"
                          >
                            <Trash2 size={13} />
                            {tr("common.delete")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title={tr("dash.newProject")} width={420}>
        <div className="space-y-4">
          <Input
            autoFocus
            placeholder={tr("dash.untitled")}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && create()}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreating(false)}>
              {tr("common.cancel")}
            </Button>
            <Button variant="primary" onClick={create}>
              {tr("common.new")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
