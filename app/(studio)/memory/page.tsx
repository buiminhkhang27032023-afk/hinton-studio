"use client";

import { withBasePath } from "@/lib/base-path";

import { useEffect, useState } from "react";
import {
  BrainCircuit,
  Loader2,
  Palette,
  ScanEye,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import clsx from "clsx";
import { api, type MemoryEntry } from "@/lib/api-client";
import { useUi } from "@/lib/ui-store";
import type { Asset } from "@/lib/types";
import { Badge, Button, Field, IconButton, Input, Modal, Select, Spinner, Textarea } from "@/components/ui/primitives";

const KINDS = [
  { id: "character", label: "Nhân vật", icon: UserRound, hint: "mặt, tóc, dáng, trang phục" },
  { id: "style", label: "Phong cách", icon: Palette, hint: "ánh sáng, màu, lens, mood" },
  { id: "wardrobe", label: "Trang phục", icon: Sparkles, hint: "quần áo, phụ kiện" },
  { id: "location", label: "Bối cảnh", icon: Sparkles, hint: "địa điểm, không gian" },
  { id: "trend", label: "Trend", icon: ScanEye, hint: "xu hướng đang lên" },
] as const;

type Kind = (typeof KINDS)[number]["id"];

export default function MemoryPage() {
  const { tr, toast } = useUi();
  const [entries, setEntries] = useState<MemoryEntry[] | null>(null);
  const [filter, setFilter] = useState<Kind | "all">("all");
  const [teachOpen, setTeachOpen] = useState(false);
  const [manual, setManual] = useState<{ kind: Kind; name: string; description: string } | null>(null);

  const load = () =>
    api.memory
      .list()
      .then(setEntries)
      .catch((error) => toast(error.message, "error"));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = (entries ?? []).filter((entry) => filter === "all" || entry.kind === filter);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex flex-wrap items-end justify-between gap-3 px-8 pb-5 pt-8">
        <div>
          <h1 className="font-display text-[30px] leading-tight tracking-tight">Bộ nhớ AI</h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-400">
            Những gì AI đã học từ ảnh và video của bạn. Càng nhiều bộ nhớ, các lần tạo sau càng ít bị lệch.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setManual({ kind: "character", name: "", description: "" })}>
            Tự viết
          </Button>
          <Button variant="primary" onClick={() => setTeachOpen(true)}>
            <BrainCircuit size={14} />
            Dạy AI từ ảnh
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-1.5 px-8 pb-4">
        <button
          onClick={() => setFilter("all")}
          className={clsx(
            "rounded-md border px-2.5 py-1.5 text-[12px] transition",
            filter === "all" ? "border-ink-600 bg-ink-750 text-ink-100" : "border-ink-700 text-ink-400 hover:text-ink-200",
          )}
        >
          Tất cả <span className="ml-1 text-[10.5px] text-ink-500">{entries?.length ?? 0}</span>
        </button>
        {KINDS.map(({ id, label, icon: Icon }) => {
          const count = (entries ?? []).filter((entry) => entry.kind === id).length;
          return (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={clsx(
                "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] transition",
                filter === id ? "border-ink-600 bg-ink-750 text-ink-100" : "border-ink-700 text-ink-400 hover:text-ink-200",
              )}
            >
              <Icon size={12} />
              {label}
              <span className="text-[10.5px] text-ink-500">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-10">
        {entries === null ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="shimmer h-[150px] rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-20 text-center">
            <BrainCircuit size={24} className="mx-auto text-ink-600" />
            <p className="mt-3 text-[13px] text-ink-500">
              Chưa có bộ nhớ nào. Bấm “Dạy AI từ ảnh” và tải một ảnh nhân vật lên.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((entry) => (
              <div key={entry.id} className="group flex gap-3 rounded-xl border border-ink-700/70 bg-ink-850/60 p-3.5 transition hover:border-ink-600">
                {entry.sourceUrl && entry.sourceUrl.startsWith("/api/files") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={withBasePath(entry.sourceUrl)} alt="" className="h-16 w-16 shrink-0 rounded-lg border border-ink-700 object-cover" />
                ) : (
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-ink-800 text-ink-600">
                    <BrainCircuit size={18} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate text-[13.5px] font-medium text-ink-100">{entry.name}</h3>
                    <Badge tone="violet">{KINDS.find((k) => k.id === entry.kind)?.label ?? entry.kind}</Badge>
                  </div>
                  <p className="mt-1.5 line-clamp-4 text-[11.5px] leading-relaxed text-ink-400">{entry.description}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10.5px] text-ink-600">
                      dùng {entry.uses} lần · {new Date(entry.updatedAt).toLocaleDateString("vi-VN")}
                    </span>
                    <div className="flex opacity-0 transition group-hover:opacity-100">
                      <IconButton
                        label="Sửa"
                        onClick={() => setManual({ kind: entry.kind, name: entry.name, description: entry.description })}
                      >
                        <Sparkles size={13} />
                      </IconButton>
                      <IconButton
                        label={tr("common.delete")}
                        onClick={async () => {
                          if (!confirm(tr("common.confirmDelete"))) return;
                          await api.memory.remove(entry.id);
                          toast(tr("toast.deleted"), "success");
                          load();
                        }}
                      >
                        <Trash2 size={13} />
                      </IconButton>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TeachModal
        open={teachOpen}
        onClose={() => setTeachOpen(false)}
        onDone={() => {
          setTeachOpen(false);
          load();
        }}
      />

      <ManualModal
        draft={manual}
        onClose={() => setManual(null)}
        onSave={async (value) => {
          try {
            await api.memory.save(value);
            setManual(null);
            toast("Đã lưu bộ nhớ", "success");
            load();
          } catch (error) {
            toast(error instanceof Error ? error.message : "Lỗi", "error");
          }
        }}
      />
    </div>
  );
}

function TeachModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { toast } = useUi();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [kind, setKind] = useState<Kind>("character");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const analyze = async () => {
    if (!asset) return;
    setBusy(true);
    try {
      const entry = await api.memory.analyze({ assetUrl: asset.url, kind, name: name || undefined });
      toast(`Đã học: ${entry.name}`, "success");
      setAsset(null);
      setName("");
      onDone();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Phân tích thất bại", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Dạy AI từ ảnh" width={560}>
      <div className="space-y-4">
        <p className="text-[12px] leading-relaxed text-ink-400">
          AI sẽ đọc ảnh và viết ra mô tả có thể tái sử dụng. Mô tả này được ghép vào mọi prompt sau đó, nên nhân vật
          hoặc phong cách không bị lệch.
        </p>

        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-ink-600 px-3 py-3 transition hover:border-brass-500/60">
          {asset ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={withBasePath(asset.url)} alt="" className="h-14 w-14 rounded-md object-cover" />
              <span className="text-[12px] text-ink-200">{asset.name}</span>
            </>
          ) : (
            <>
              {uploading ? <Loader2 size={16} className="animate-spin text-ink-400" /> : <Upload size={16} className="text-ink-400" />}
              <span className="text-[12px] text-ink-400">Chọn ảnh tham chiếu…</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setUploading(true);
              try {
                setAsset(await api.assets.upload(file));
              } catch (error) {
                toast(error instanceof Error ? error.message : "Tải lên thất bại", "error");
              } finally {
                setUploading(false);
              }
            }}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Học về">
            <Select value={kind} onChange={(event) => setKind(event.target.value as Kind)}>
              {KINDS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} — {item.hint}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tên gợi nhớ" hint="để trống AI tự đặt">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Vy, tóc dài…" />
          </Field>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" onClick={analyze} disabled={!asset || busy}>
            {busy ? <Spinner /> : <BrainCircuit size={13.5} />}
            {busy ? "Đang đọc ảnh…" : "Phân tích & lưu"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ManualModal({
  draft,
  onClose,
  onSave,
}: {
  draft: { kind: Kind; name: string; description: string } | null;
  onClose: () => void;
  onSave: (value: { kind: Kind; name: string; description: string }) => void;
}) {
  const [form, setForm] = useState(draft);
  useEffect(() => setForm(draft), [draft]);
  if (!form) return null;

  return (
    <Modal open onClose={onClose} title="Bộ nhớ tự viết" width={560}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Loại">
            <Select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as Kind })}>
              {KINDS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tên">
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </Field>
        </div>
        <Field label="Mô tả" hint="tiếng Anh cho kết quả tốt nhất">
          <Textarea
            rows={6}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className="text-[12px]"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" onClick={() => onSave(form)} disabled={!form.name.trim() || !form.description.trim()}>
            Lưu
          </Button>
        </div>
      </div>
    </Modal>
  );
}