"use client";

import { withBasePath } from "@/lib/base-path";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Film, ImageIcon, Search, Trash2, Upload, FileText, Play } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/api-client";
import { useUi } from "@/lib/ui-store";
import type { Asset } from "@/lib/types";
import { Button, Input, Modal } from "@/components/ui/primitives";

const FILTERS = [
  { key: "all", label: "common.all", icon: null },
  { key: "image", label: "lib.images", icon: ImageIcon },
  { key: "video", label: "lib.videos", icon: Film },
  { key: "file", label: "lib.files", icon: FileText },
] as const;

export default function LibraryPage() {
  const { tr, toast } = useUi();
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<Asset | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = () =>
    api.assets
      .list()
      .then(setAssets)
      .catch((error) => toast(error.message, "error"));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!assets) return [];
    return assets.filter((asset) => {
      if (filter !== "all" && asset.kind !== filter) return false;
      if (query && !asset.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [assets, filter, query]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) await api.assets.upload(file);
      toast(tr("toast.uploaded"), "success");
      load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Tải lên thất bại", "error");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(tr("common.confirmDelete"))) return;
    await api.assets.remove(id);
    setPreview(null);
    toast(tr("toast.deleted"), "success");
    load();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex flex-wrap items-end justify-between gap-3 px-8 pb-5 pt-8">
        <div>
          <h1 className="font-display text-[30px] leading-tight tracking-tight">{tr("lib.title")}</h1>
          <p className="mt-1 text-[13px] text-ink-400">{tr("lib.subtitle")}</p>
        </div>
        <Button variant="primary" onClick={() => fileInput.current?.click()} disabled={uploading}>
          <Upload size={14} />
          {uploading ? tr("lib.uploading") : tr("common.upload")}
        </Button>
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          onChange={(event) => upload(event.target.files)}
        />
      </header>

      <div className="flex items-center gap-2 px-8 pb-4">
        <div className="flex rounded-lg border border-ink-700 bg-ink-900/60 p-0.5">
          {FILTERS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={clsx(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] transition",
                filter === key ? "bg-ink-750 text-ink-100" : "text-ink-400 hover:text-ink-200",
              )}
            >
              {Icon && <Icon size={12.5} />}
              {tr(label)}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-64">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500" />
          <Input
            placeholder={tr("common.search")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-10">
        {assets === null ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="shimmer aspect-square rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-20 text-center text-[13px] text-ink-500">{tr("common.empty")}</div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {filtered.map((asset) => (
              <button
                key={asset.id}
                onClick={() => setPreview(asset)}
                className="group relative aspect-square overflow-hidden rounded-xl border border-ink-700/70 bg-ink-850 transition hover:border-ink-500"
              >
                {asset.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={withBasePath(asset.url)}
                    alt={asset.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                ) : asset.kind === "video" ? (
                  <>
                    <video src={withBasePath(asset.url)} className="h-full w-full object-cover" muted />
                    <span className="absolute inset-0 grid place-items-center bg-ink-950/35">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-ink-950/70 text-ink-100 backdrop-blur">
                        <Play size={14} />
                      </span>
                    </span>
                  </>
                ) : (
                  <span className="grid h-full place-items-center text-ink-500">
                    <FileText size={26} strokeWidth={1.4} />
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink-950/95 to-transparent px-2.5 pb-2 pt-6 text-left text-[11.5px] text-ink-200">
                  {asset.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal open={Boolean(preview)} onClose={() => setPreview(null)} title={preview?.name ?? ""} width={720}>
        {preview && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-ink-700 bg-ink-950">
              {preview.kind === "video" ? (
                <video src={withBasePath(preview.url)} controls autoPlay className="max-h-[60vh] w-full" />
              ) : preview.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={withBasePath(preview.url)} alt="" className="max-h-[60vh] w-full object-contain" />
              ) : (
                <p className="p-6 text-center text-[13px] text-ink-400">{tr("common.empty")}</p>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11.5px] text-ink-500">
                {new Date(preview.createdAt).toLocaleString("vi-VN")}
              </p>
              <div className="flex gap-1.5">
                <a
                  href={withBasePath(preview.url)}
                  download
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-ink-700 px-3 text-[12px] text-ink-200 hover:border-ink-500"
                >
                  <Download size={13} />
                  {tr("common.download")}
                </a>
                <Button variant="danger" size="sm" onClick={() => remove(preview.id)}>
                  <Trash2 size={13} />
                  {tr("common.delete")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
