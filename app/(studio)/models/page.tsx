"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CloudDownload,
  Copy,
  Filter,
  ListPlus,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/api-client";
import { useStudio } from "@/lib/studio-store";
import { useUi } from "@/lib/ui-store";
import type { ModelConfig, ModelKind, ModelRecord } from "@/lib/types";
import { Badge, Button, Field, IconButton, Input, Modal, Select, Spinner, Textarea } from "@/components/ui/primitives";

const KIND_LABEL: Record<ModelKind, string> = {
  image: "Tạo ảnh",
  video: "Tạo video",
  upscale: "Upscale",
  train: "Train",
  chat: "Chat / phân tích",
};

const KIND_TONE: Record<ModelKind, "brass" | "violet" | "green" | "red" | "default"> = {
  image: "brass",
  video: "violet",
  upscale: "green",
  train: "red",
  chat: "default",
};

const EMPTY: ModelRecord = {
  id: "",
  label: "",
  kind: "image",
  provider: "openai-compatible",
  description: "",
  builtin: false,
  createdAt: 0,
  config: {
    endpoint: "/images/generations",
    body: { model: "{{model}}", prompt: "{{prompt}}", size: "{{size}}" },
    resultPath: "data.0.url",
    timeout: 300,
  },
};

export default function ModelsPage() {
  const { tr, toast } = useUi();
  const [models, setModels] = useState<ModelRecord[] | null>(null);
  const [editing, setEditing] = useState<ModelRecord | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<ModelKind | "all">("all");
  const [query, setQuery] = useState("");
  const setStoreModels = useStudio((s) => s.setModels);

  const load = () =>
    api.models
      .list()
      .then((list) => {
        setModels(list);
        setStoreModels(list);
      })
      .catch((error) => toast(error.message, "error"));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sync = async () => {
    setSyncing(true);
    try {
      const result = await api.models.sync({});
      toast(
        `Đã đồng bộ ${result.total} model · mới ${result.created} · cập nhật ${result.updated}`,
        "success",
      );
      load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Đồng bộ thất bại", "error");
    } finally {
      setSyncing(false);
    }
  };

  const filtered = useMemo(() => {
    if (!models) return [];
    return models.filter((model) => {
      if (filter !== "all" && model.kind !== filter) return false;
      if (query) {
        const text = `${model.label} ${model.id}`.toLowerCase();
        if (!text.includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [models, filter, query]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: models?.length ?? 0 };
    for (const model of models ?? []) map[model.kind] = (map[model.kind] ?? 0) + 1;
    return map;
  }, [models]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex flex-wrap items-end justify-between gap-3 px-8 pb-5 pt-8">
        <div>
          <h1 className="font-display text-[30px] leading-tight tracking-tight">{tr("models.title")}</h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-400">{tr("models.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setPasteOpen(true)}>
            <ListPlus size={14} />
            Dán danh sách
          </Button>
          <Button variant="primary" onClick={sync} disabled={syncing}>
            {syncing ? <Spinner /> : <CloudDownload size={14} />}
            {tr("models.discover")}
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 px-8 pb-4">
        <div className="flex flex-wrap gap-1 rounded-lg border border-ink-700 bg-ink-900/60 p-0.5">
          {(["all", "image", "video", "upscale", "chat", "train"] as const).map((kind) => (
            <button
              key={kind}
              onClick={() => setFilter(kind)}
              className={clsx(
                "rounded-md px-2.5 py-1.5 text-[12px] transition",
                filter === kind ? "bg-ink-750 text-ink-100" : "text-ink-400 hover:text-ink-200",
              )}
            >
              {kind === "all" ? tr("common.all") : KIND_LABEL[kind]}
              <span className="ml-1.5 text-[10.5px] text-ink-500">{counts[kind] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-64">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500" />
          <Input
            placeholder="Tìm theo tên model…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-10">
        {models === null ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="shimmer h-[132px] rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-24 text-center">
            <Filter size={22} className="mx-auto text-ink-600" />
            <p className="mt-2 text-[13px] text-ink-500">
              {models.length === 0
                ? "Chưa có model nào. Bấm “Lấy model từ API” để đồng bộ danh mục."
                : "Không có model khớp bộ lọc."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((model) => (
              <div
                key={model.id}
                className="group rounded-xl border border-ink-700/70 bg-ink-850/60 p-4 transition hover:border-ink-600"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-[14px] font-medium text-ink-100">{model.label}</h3>
                    <p className="mt-0.5 truncate font-mono text-[10.5px] text-ink-500">{model.id}</p>
                  </div>
                  {model.builtin ? (
                    <Badge tone="brass">{tr("models.builtin")}</Badge>
                  ) : model.provider === "provider" ? (
                    <Badge tone="violet">API</Badge>
                  ) : (
                    <Badge>custom</Badge>
                  )}
                </div>

                <p className="mt-2 line-clamp-2 min-h-[32px] text-[11.5px] leading-relaxed text-ink-400">
                  {model.description || model.config.endpoint}
                </p>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Badge tone={KIND_TONE[model.kind]}>{KIND_LABEL[model.kind]}</Badge>
                    <span className="font-mono text-[10px] text-ink-600">{model.config.endpoint}</span>
                  </div>
                  <div className="flex opacity-0 transition group-hover:opacity-100">
                    <IconButton
                      label={model.builtin ? tr("models.duplicate") : "Sửa"}
                      onClick={() =>
                        setEditing({
                          ...model,
                          builtin: false,
                          id: model.builtin ? "" : model.id,
                          label: model.builtin ? `${model.label} (bản sao)` : model.label,
                          config: JSON.parse(JSON.stringify(model.config)),
                        })
                      }
                    >
                      {model.builtin ? <Copy size={13.5} /> : <Pencil size={13.5} />}
                    </IconButton>
                    {!model.builtin && (
                      <IconButton
                        label={tr("common.delete")}
                        onClick={async () => {
                          if (!confirm(tr("common.confirmDelete"))) return;
                          await api.models.remove(model.id);
                          toast(tr("toast.deleted"), "success");
                          load();
                        }}
                      >
                        <Trash2 size={13.5} />
                      </IconButton>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PasteModels
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onDone={() => {
          setPasteOpen(false);
          load();
        }}
      />

      <ModelEditor
        draft={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
          toast(tr("models.saveOk"), "success");
        }}
      />
    </div>
  );
}

function PasteModels({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useUi();
  const [text, setText] = useState("");
  const [kind, setKind] = useState<ModelKind | "auto">("auto");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const ids = text
      .split(/[\s,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!ids.length) return;
    setBusy(true);
    try {
      const result = await api.models.sync({
        ids,
        kind: kind === "auto" ? undefined : kind,
      });
      toast(`Đã thêm ${result.created} model`, "success");
      setText("");
      onDone();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Lỗi", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Dán danh sách model" width={560}>
      <div className="space-y-3">
        <p className="text-[12px] leading-relaxed text-ink-400">
          Mỗi dòng một model id (ví dụ <code className="text-brass-300">seedance-2.0-fast</code>). Có thể dán
          nhiều id cách nhau bằng dấu phẩy. Loại model được đoán tự động từ tên.
        </p>
        <Textarea
          rows={9}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={"seedance-2.0-fast\nseedance-2.5\nveo-3.1\ngoogle-omni-flash"}
          className="font-mono text-[11.5px]"
        />
        <Field label="Loại model">
          <Select value={kind} onChange={(event) => setKind(event.target.value as ModelKind | "auto")}>
            <option value="auto">Tự nhận diện</option>
            {Object.entries(KIND_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" onClick={submit} disabled={busy || !text.trim()}>
            {busy ? <Spinner /> : <Plus size={13.5} />}
            Thêm model
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ModelEditor({
  draft,
  onClose,
  onSaved,
}: {
  draft: ModelRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { tr } = useUi();
  const [form, setForm] = useState<ModelRecord | null>(draft);
  const [bodyText, setBodyText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setForm(draft);
    setBodyText(JSON.stringify(draft?.config.body ?? {}, null, 2));
    setJsonError(null);
  }, [draft]);

  if (!form) return null;

  const patchConfig = (patch: Partial<ModelConfig>) =>
    setForm({ ...form, config: { ...form.config, ...patch } });

  const save = async () => {
    let body: Record<string, unknown> = {};
    try {
      body = bodyText.trim() ? JSON.parse(bodyText) : {};
    } catch {
      setJsonError(tr("models.jsonError"));
      return;
    }
    setSaving(true);
    try {
      await api.models.save({
        id: form.id || undefined,
        label: form.label || "Model chưa đặt tên",
        kind: form.kind,
        description: form.description,
        config: { ...form.config, body },
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={form.id ? "Sửa model" : tr("models.new")} width={680}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr("models.label")}>
            <Input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} />
          </Field>
          <Field label={tr("models.kind")}>
            <Select
              value={form.kind}
              onChange={(event) => setForm({ ...form, kind: event.target.value as ModelKind })}
            >
              {Object.entries(KIND_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Model id gửi lên API" hint="thường giống tên model">
          <Input
            value={String((form.config.body as Record<string, unknown>)?.model ?? "")}
            onChange={(event) =>
              patchConfig({
                body: { ...(form.config.body ?? {}), model: event.target.value },
              })
            }
            className="font-mono text-[12px]"
            placeholder="seedance-2.0-fast"
          />
        </Field>

        <Field label={tr("models.description")} hint={tr("common.optional")}>
          <Input
            value={form.description ?? ""}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </Field>

        <Field label={tr("models.endpoint")} hint="so với địa chỉ API trong Cài đặt">
          <Input
            value={form.config.endpoint}
            onChange={(event) => patchConfig({ endpoint: event.target.value })}
            placeholder="/images/generations"
            className="font-mono text-[12px]"
          />
        </Field>

        <Field
          label={tr("models.body")}
          hint="{{prompt}} {{image}} {{duration}} {{aspect}} {{size}} {{seed}} {{model}}"
        >
          <Textarea
            rows={8}
            value={bodyText}
            onChange={(event) => {
              setBodyText(event.target.value);
              setJsonError(null);
            }}
            className={clsx("font-mono text-[11.5px]", jsonError && "!border-red-800")}
          />
        </Field>
        {jsonError && <p className="text-[11.5px] text-red-400">{jsonError}</p>}

        <div className="grid grid-cols-2 gap-3">
          <Field label={tr("models.resultPath")} hint="vd: data.0.url">
            <Input
              value={form.config.resultPath ?? ""}
              onChange={(event) => patchConfig({ resultPath: event.target.value })}
              className="font-mono text-[12px]"
            />
          </Field>
          <Field label={tr("models.jobPath")} hint={tr("common.optional")}>
            <Input
              value={form.config.jobPath ?? ""}
              onChange={(event) => patchConfig({ jobPath: event.target.value })}
              placeholder="id"
              className="font-mono text-[12px]"
            />
          </Field>
        </div>

        <button
          onClick={() => setShowAdvanced((value) => !value)}
          className="text-[12px] text-brass-400 hover:underline"
        >
          {showAdvanced ? "− " : "+ "}
          {tr("models.advanced")}
        </button>

        {showAdvanced && (
          <div className="space-y-3 rounded-lg border border-ink-700/70 bg-ink-900/60 p-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label={tr("models.pollEndpoint")}>
                <Input
                  value={form.config.pollEndpoint ?? ""}
                  onChange={(event) => patchConfig({ pollEndpoint: event.target.value })}
                  placeholder="/videos/{{job}}"
                  className="font-mono text-[12px]"
                />
              </Field>
              <Field label="Endpoint tải file">
                <Input
                  value={form.config.contentEndpoint ?? ""}
                  onChange={(event) => patchConfig({ contentEndpoint: event.target.value })}
                  placeholder="/videos/{{job}}/content"
                  className="font-mono text-[12px]"
                />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Status path">
                <Input
                  value={form.config.statusPath ?? "status"}
                  onChange={(event) => patchConfig({ statusPath: event.target.value })}
                  className="font-mono text-[12px]"
                />
              </Field>
              <Field label="Done">
                <Input
                  value={(form.config.doneValues ?? []).join(",")}
                  onChange={(event) =>
                    patchConfig({ doneValues: event.target.value.split(",").map((item) => item.trim()) })
                  }
                  className="font-mono text-[11.5px]"
                />
              </Field>
              <Field label="Failed">
                <Input
                  value={(form.config.failedValues ?? []).join(",")}
                  onChange={(event) =>
                    patchConfig({ failedValues: event.target.value.split(",").map((item) => item.trim()) })
                  }
                  className="font-mono text-[11.5px]"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Method">
                <Select
                  value={form.config.method ?? "POST"}
                  onChange={(event) => patchConfig({ method: event.target.value as "POST" | "GET" })}
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                </Select>
              </Field>
              <Field label="Timeout (giây)">
                <Input
                  type="number"
                  value={form.config.timeout ?? 300}
                  onChange={(event) => patchConfig({ timeout: Number(event.target.value) })}
                />
              </Field>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            {tr("common.cancel")}
          </Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            <Sparkles size={13.5} />
            {tr("common.save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
