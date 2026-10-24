"use client";

import { withBasePath } from "@/lib/base-path";

import { memo, useCallback, useRef, useState, type ReactNode } from "react";
import { Handle, NodeToolbar, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import clsx from "clsx";
import {
  AlertCircle,
  Check,
  Image as ImageIcon,
  Loader2,
  Play,
  Type,
  ZoomIn,
  BrainCircuit,
  Shirt,
  RefreshCw,
  ArrowUp,
  Download,
} from "lucide-react";
import { useStudio, useModelsOfKind, useModelById } from "@/lib/studio-store";
import { useNodeMenu, useRunNode } from "./run-context";
import { sourceMediaRole, type PortKind } from "./ports";
import { useUi } from "@/lib/ui-store";
import type { StudioNodeData } from "@/lib/execute";

function NodeActions({ id, canRun = true }: { id: string; canRun?: boolean }) {
  const { tr } = useUi();
  const run = useRunNode();
  const menu = useNodeMenu();
  return (
    <div className="mt-2 flex items-center gap-1">
      {canRun && (
        <button
          type="button"
          onClick={() => run(id)}
          className="rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-black"
        >
          {tr("canvas.toolbar.run")}
        </button>
      )}
      <button type="button" onClick={() => menu.duplicate(id)} className="rounded-full px-2.5 py-1 text-[12px] text-white/80 hover:bg-white/10">
        {tr("canvas.duplicate")}
      </button>
      <button type="button" onClick={() => menu.remove(id)} className="rounded-full px-2.5 py-1 text-[12px] text-red-300 hover:bg-white/10">
        {tr("common.delete")}
      </button>
    </div>
  );
}

/** TapNow-style node: the picture is the node. Settings only show once it is selected. */
function TapFrame({
  id,
  selected,
  label,
  icon: Icon,
  data,
  preview,
  video,
  text,
  canRun = true,
  busy,
  width = 176,
  onMediaClick,
  onDrop,
  editor,
  children,
}: {
  id: string;
  selected?: boolean;
  label: string;
  icon: typeof ImageIcon;
  data: StudioNodeData;
  preview?: string;
  video?: string;
  text?: string;
  canRun?: boolean;
  busy?: boolean;
  width?: number;
  onMediaClick?: () => void;
  onDrop?: (event: React.DragEvent) => void;
  editor?: ReactNode;
  children?: ReactNode;
}) {
  const ready = data.status === "done" || Boolean(preview || video);
  return (
    <div
      className="relative"
      style={{ width }}
      onDragOver={onDrop ? (event) => event.preventDefault() : undefined}
      onDrop={onDrop}
    >
      {selected && (
        <NodeToolbar isVisible position={Position.Bottom} offset={12} align="center">
          <div className="nodrag nopan w-[280px] rounded-2xl border border-white/10 bg-[#141414]/95 p-2.5 text-white shadow-[0_18px_50px_rgba(0,0,0,.7)]">
            {editor}
            <NodeActions id={id} canRun={canRun} />
          </div>
        </NodeToolbar>
      )}
      <div className="pointer-events-none absolute -top-[22px] left-0 flex max-w-full items-center gap-1 text-[12.5px] font-medium text-white">
        <Icon size={13} strokeWidth={1.8} />
        <span className="truncate">{label}</span>
        {ready && data.status !== "running" && data.status !== "error" && <Check size={12} strokeWidth={2.6} />}
        {data.status === "running" && <Loader2 size={12} className="animate-spin text-white/70" />}
        {data.status === "error" && <AlertCircle size={12} className="text-red-400" />}
      </div>
      <div
        className={clsx(
          "overflow-hidden rounded-[18px] bg-[#141414]",
          selected && "outline outline-[1.5px] outline-white",
        )}
        style={text != null ? { minHeight: 120 } : { aspectRatio: "3 / 4" }}
        onClick={onMediaClick}
      >
        {video ? (
          <video src={withBasePath(video)} className="h-full w-full object-cover" muted playsInline />
        ) : preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={withBasePath(preview)} alt="" className="h-full w-full object-cover" />
        ) : text != null ? (
          <p className={clsx("line-clamp-6 p-3 text-[12.5px] leading-relaxed", text ? "text-white/90" : "text-white/35")}>
            {text || "Nhập câu lệnh…"}
          </p>
        ) : (
          <span className="grid h-full place-items-center text-white/25">
            {busy ? <Loader2 size={20} className="animate-spin" /> : <Icon size={26} strokeWidth={1.3} />}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/** One input on the left, one output on the right. Both sit on the vertical center. */
function NodePorts({ out, accept }: { out: PortKind; accept?: string }) {
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        title="Đầu vào"
        data-accept={accept}
        className="!border-2 !border-black !bg-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        title="Đầu ra"
        data-port={out}
        className="!border-2 !border-black !bg-white"
      />
    </>
  );
}

/* ------------------------------- Prompt node ------------------------------ */

export const PromptNode = memo(function PromptNode({ id, data, selected }: NodeProps) {
  const { tr } = useUi();
  const update = useNodeUpdater(id);
  const nodeData = data as StudioNodeData;
  return (
    <TapFrame
      id={id}
      selected={selected}
      label="Chữ"
      icon={Type}
      data={nodeData}
      text={nodeData.text ?? ""}
      canRun={false}
      width={200}
      editor={
        <textarea
          className="field nodrag min-h-[96px] text-[13px]"
          placeholder={tr("node.promptPlaceholder")}
          value={nodeData.text ?? ""}
          onChange={(event) => update({ text: event.target.value })}
        />
      }
    >
      <NodePorts out="text" />
    </TapFrame>
  );
});

/* ------------------------------- Image node ------------------------------- */

export const ImageNode = memo(function ImageNode({ id, data, selected }: NodeProps) {
  const { tr, toast } = useUi();
  const update = useNodeUpdater(id);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const project = useStudio((s) => s.project);
  const nodeData = data as StudioNodeData;

  const upload = useCallback(
    async (file: File) => {
      setBusy(true);
      try {
        const { api } = await import("@/lib/api-client");
        const asset = await api.assets.upload(file, project?.id ?? null);
        update({ imageUrl: asset.url, result: asset });
        toast(tr("toast.uploaded"), "success");
      } catch (error) {
        toast(error instanceof Error ? error.message : "Tải lên thất bại", "error");
      } finally {
        setBusy(false);
      }
    },
    [project?.id, toast, tr, update],
  );

  const preview = nodeData.imageUrl || nodeData.result?.url;

  return (
    <TapFrame
      id={id}
      selected={selected}
      label="Ảnh"
      icon={ImageIcon}
      data={nodeData}
      preview={preview}
      canRun={false}
      busy={busy}
      onMediaClick={() => selected && inputRef.current?.click()}
      onDrop={(event) => {
        const file = event.dataTransfer.files?.[0];
        if (file) upload(file);
      }}
      editor={
        <button type="button" className="nodrag w-full rounded-xl bg-white/10 py-2 text-[12.5px] text-white" onClick={() => inputRef.current?.click()}>
          {busy ? "Đang tải…" : tr("node.uploadHint")}
        </button>
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) upload(file);
        }}
      />
      <NodePorts out="image" />
    </TapFrame>
  );
});

/* ------------------------------ Generate node ----------------------------- */

/** A compact pill-styled <select> — model/aspect/resolution/duration quick-pickers. */
function PillSelect({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={clsx(
        "nodrag truncate rounded-full border border-ink-700 bg-ink-900/80 px-2.5 py-1 text-[11px] text-ink-200 outline-none transition hover:border-ink-600",
        className,
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export const GenerateNode = memo(function GenerateNode({ id, data, selected }: NodeProps) {
  const { tr } = useUi();
  const update = useNodeUpdater(id);
  const nodeData = data as StudioNodeData;
  const models = useModelsOfKind(nodeData.modelKind ?? "image");
  const model = useModelById(nodeData.modelId);
  const run = useRunNode();
  const result = nodeData.result;
  const imageTags = useConnectedImageTags(id);

  const isVideo = nodeData.modelKind === "video";
  return (
    <TapFrame
      id={id}
      selected={selected}
      label={isVideo ? "Video" : "Ảnh"}
      icon={isVideo ? Play : ImageIcon}
      data={nodeData}
      preview={result?.kind === "image" ? result.url : undefined}
      video={result?.kind === "video" ? result.url : undefined}
      editor={
        <div className="space-y-2">
          <MentionTextarea
            className="field nodrag min-h-[72px] text-[12.5px]"
            placeholder={tr("node.promptPlaceholder")}
            value={nodeData.prompt ?? ""}
            onChange={(next) => update({ prompt: next })}
            tags={imageTags}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <PillSelect
              value={nodeData.modelId ?? ""}
              onChange={(value) => update(value.startsWith("iooai:") ? { modelId: value, duration: 10, resolution: "720p", aspect: "16:9" } : { modelId: value })}
              className="max-w-[120px]"
              options={[
                { value: "", label: models.length ? tr("node.model") : tr("node.noModel") },
                ...models.map((item) => ({ value: item.id, label: item.label })),
              ]}
            />
            <PillSelect
              value={nodeData.aspect ?? "16:9"}
              onChange={(value) => update({ aspect: value })}
              options={["16:9", "9:16", "1:1", "4:5", "3:2", "2:3"].map((ratio) => ({ value: ratio, label: ratio }))}
            />
            <PillSelect
              value={model?.provider === "iooai" ? (nodeData.resolution === "1080p" ? "1080p" : "720p") : nodeData.resolution ?? "480p"}
              onChange={(value) => update({ resolution: value })}
              options={[
                ...(model?.provider === "iooai" ? [] : [{ value: "480p", label: "480p" }]),
                { value: "720p", label: "720p" },
                { value: "1080p", label: "1080p" },
              ]}
            />
            {isVideo ? (
              <PillSelect
                value={String(nodeData.duration ?? 6)}
                onChange={(value) => update({ duration: Number(value) })}
                options={durationOptions(model?.id).map((seconds) => ({ value: String(seconds), label: `${seconds}s` }))}
              />
            ) : (
              <button
                className="nodrag rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/70"
                onClick={() => update({ seed: Math.floor(Math.random() * 1_000_000) })}
                title={tr("node.seed")}
              >
                🎲 {nodeData.seed ?? "—"}
              </button>
            )}
            <button
              onClick={() => run(id)}
              disabled={nodeData.status === "running"}
              className="nodrag ml-auto grid h-7 w-7 place-items-center rounded-full bg-white text-black disabled:opacity-50"
            >
              {nodeData.status === "running" ? <Loader2 size={13} className="animate-spin" /> : <ArrowUp size={14} />}
            </button>
          </div>
          {nodeData.error && <p className="text-[11.5px] text-red-300">{nodeData.error}</p>}
          {result?.kind !== "image" && result?.kind !== "video" && result?.meta?.text != null && (
            <p className="max-h-24 overflow-y-auto whitespace-pre-wrap text-[11.5px] text-white/70">{String(result.meta.text)}</p>
          )}
        </div>
      }
    >
      <NodePorts out={isVideo ? "video" : "image"} accept={isVideo ? "text image video" : "text image"} />
    </TapFrame>
  );
});

/* ------------------------------- Upscale node ----------------------------- */

export const UpscaleNode = memo(function UpscaleNode({ id, data, selected }: NodeProps) {
  const { tr } = useUi();
  const update = useNodeUpdater(id);
  const nodeData = data as StudioNodeData;
  const models = useModelsOfKind("upscale");
  const run = useRunNode();

  return (
    <TapFrame
      id={id}
      selected={selected}
      label="Ảnh"
      icon={ZoomIn}
      data={nodeData}
      preview={nodeData.result?.url}
      editor={
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <PillSelect
              value={nodeData.modelId ?? ""}
              onChange={(value) => update({ modelId: value })}
              className="max-w-[140px]"
              options={[
                { value: "", label: models.length ? tr("node.model") : tr("node.noModel") },
                ...models.map((item) => ({ value: item.id, label: item.label })),
              ]}
            />
            {[2, 4, 8].map((scale) => (
              <button
                key={scale}
                onClick={() => update({ scale })}
                className={clsx(
                  "nodrag rounded-full border px-2.5 py-1 text-[11px]",
                  (nodeData.scale ?? 2) === scale ? "border-white bg-white text-black" : "border-white/20 text-white/70",
                )}
              >
                ×{scale}
              </button>
            ))}
            <button onClick={() => run(id)} disabled={nodeData.status === "running"} className="nodrag ml-auto grid h-7 w-7 place-items-center rounded-full bg-white text-black disabled:opacity-50">
              {nodeData.status === "running" ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            </button>
          </div>
          {nodeData.error && <p className="text-[11.5px] text-red-300">{nodeData.error}</p>}
        </div>
      }
    >
      <NodePorts out="image" accept="image" />
    </TapFrame>
  );
});

/* -------------------------------- Train node ------------------------------ */

export const TrainNode = memo(function TrainNode({ id, data, selected }: NodeProps) {
  const { tr } = useUi();
  const update = useNodeUpdater(id);
  const nodeData = data as StudioNodeData;
  const models = useModelsOfKind("train");
  const run = useRunNode();

  return (
    <TapFrame
      id={id}
      selected={selected}
      label="Train"
      icon={BrainCircuit}
      data={nodeData}
      text={nodeData.name || "Model của tôi"}
      editor={
        <div className="space-y-2">
          <input className="field nodrag text-[12px]" placeholder="Tên model" value={nodeData.name ?? ""} onChange={(event) => update({ name: event.target.value })} />
          <div className="flex flex-wrap items-center gap-1.5">
            <PillSelect
              value={nodeData.modelId ?? ""}
              onChange={(value) => update({ modelId: value })}
              className="max-w-[150px]"
              options={[
                { value: "", label: models.length ? tr("node.model") : tr("node.noModel") },
                ...models.map((item) => ({ value: item.id, label: item.label })),
              ]}
            />
            <span className="flex items-center gap-1 rounded-full border border-white/15 px-2 py-1 text-[11px] text-white/70">
              Steps
              <input type="number" className="nodrag w-14 bg-transparent text-right outline-none" value={nodeData.steps ?? 1000} onChange={(event) => update({ steps: Number(event.target.value) })} />
            </span>
          </div>
          <p className="text-[11px] text-white/45">Nối các khối Ảnh vào để làm dữ liệu huấn luyện.</p>
          {nodeData.error && <p className="text-[11.5px] text-red-300">{nodeData.error}</p>}
          <button onClick={() => run(id)} disabled={nodeData.status === "running"} className="nodrag flex w-full items-center justify-center gap-1.5 rounded-xl bg-white py-1.5 text-[12px] font-medium text-black disabled:opacity-50">
            {nodeData.status === "running" ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            {nodeData.status === "running" ? tr("node.running") : tr("node.run")}
          </button>
        </div>
      }
    >
      <NodePorts out="any" accept="image" />
    </TapFrame>
  );
});

/* ------------------------------- Output node ------------------------------ */

export const OutputNode = memo(function OutputNode({ id, data, selected }: NodeProps) {
  const { tr } = useUi();
  const nodeData = data as StudioNodeData;
  const asset = nodeData.result;

  const isVideo = asset?.kind === "video";
  return (
    <TapFrame
      id={id}
      selected={selected}
      label={isVideo ? "Video" : "Ảnh"}
      icon={isVideo ? Play : ImageIcon}
      data={nodeData}
      preview={asset?.kind === "image" ? asset.url : undefined}
      video={isVideo ? asset?.url : undefined}
      text={asset && asset.kind !== "image" && asset.kind !== "video" ? String(asset.meta?.text ?? "") : undefined}
      canRun={false}
      editor={
        asset ? (
          <a href={withBasePath(asset.url)} download className="nodrag flex items-center justify-center gap-1.5 rounded-xl bg-white py-1.5 text-[12px] font-medium text-black">
            <Download size={13} />
            {tr("common.download")}
          </a>
        ) : (
          <p className="text-[12px] text-white/50">Nối một khối kết quả vào đây để xem trước.</p>
        )
      }
    >
      <NodePorts out={isVideo ? "video" : "any"} accept="text image video any" />
    </TapFrame>
  );
});

/* --------------------------- Fashion Try-On node -------------------------- */

export const FashionTryOnNode = memo(function FashionTryOnNode({ id, data, selected }: NodeProps) {
  const { tr } = useUi();
  const update = useNodeUpdater(id);
  const nodeData = data as StudioNodeData;
  const run = useRunNode();
  const result = nodeData.result;
  const garmentPreview = useConnectedPreview(id, 1);

  return (
    <TapFrame
      id={id}
      selected={selected}
      label="Ảnh"
      icon={Shirt}
      data={nodeData}
      preview={result?.kind === "video" ? garmentPreview : result?.url || garmentPreview}
      video={result?.kind === "video" ? result.url : undefined}
      editor={
        <div className="space-y-2">
          <textarea
            className="field nodrag min-h-[64px] text-[12.5px]"
            placeholder="Mô tả phối đồ (không bắt buộc)"
            value={nodeData.prompt ?? ""}
            onChange={(event) => update({ prompt: event.target.value })}
          />
          <p className="text-[11px] text-white/45">Ảnh thứ nhất là người mẫu, ảnh thứ hai là trang phục.</p>
          <button onClick={() => run(id)} disabled={nodeData.status === "running"} className="nodrag flex w-full items-center justify-center gap-1.5 rounded-xl bg-white py-1.5 text-[12px] font-medium text-black disabled:opacity-50">
            {nodeData.status === "running" ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            {nodeData.status === "running" ? tr("node.running") : "Chạy Thử Đồ"}
          </button>
        </div>
      }
    >
      <NodePorts out="image" accept="text image" />
    </TapFrame>
  );
});

/* ----------------------- Fashion Compose (9:16) Node ---------------------- */

export const FashionComposeNode = memo(function FashionComposeNode({ id, data, selected }: NodeProps) {
  const { tr } = useUi();
  const update = useNodeUpdater(id);
  const nodeData = data as StudioNodeData;
  const run = useRunNode();
  const result = nodeData.result;

  return (
    <TapFrame
      id={id}
      selected={selected}
      label="Video"
      icon={Play}
      data={nodeData}
      video={result?.url}
      editor={
        <div className="space-y-2">
          <p className="text-[11px] text-white/45">Lookbook 9:16 · ảnh 1 người mẫu, ảnh 2 trang phục, video hoặc ảnh thử đồ.</p>
          <input className="field nodrag text-[12px] font-semibold" placeholder="Tiêu đề" value={nodeData.headline ?? "HÃY NHỚ"} onChange={(event) => update({ headline: event.target.value })} />
          <input className="field nodrag text-[12px]" placeholder="Tiêu đề phụ" value={nodeData.subheadline ?? "Bí quyết phối đồ"} onChange={(event) => update({ subheadline: event.target.value })} />
          <button onClick={() => run(id)} disabled={nodeData.status === "running"} className="nodrag flex w-full items-center justify-center gap-1.5 rounded-xl bg-white py-1.5 text-[12px] font-medium text-black disabled:opacity-50">
            {nodeData.status === "running" ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            {nodeData.status === "running" ? tr("node.running") : "Xuất video"}
          </button>
        </div>
      }
    >
      <NodePorts out="video" accept="image video" />
    </TapFrame>
  );
});

/* --------------------------------- helper -------------------------------- */

/**
 * Allowed durations differ per video model (Veo only takes 4/6/8), so the
 * picker reflects what this gateway actually accepts.
 */
function durationOptions(modelId?: string | null): number[] {
  if (modelId === "seed:video:piapi-omni-reference") return Array.from({ length: 12 }, (_, i) => i + 4);
  if (modelId?.includes("veo")) return [4, 6, 8];
  if (modelId?.startsWith("iooai:")) return [10];
  if (modelId?.includes("omni")) return [5, 10];
  // PiAPI Seedance accepts any whole second from 4 to 15.
  if (modelId?.includes("piapi") || modelId?.includes("seedance")) {
    return Array.from({ length: 12 }, (_, i) => i + 4);
  }
  // Otherwise let the user pick any second up to 30 instead of a sparse preset list.
  return Array.from({ length: 30 }, (_, i) => i + 1);
}

function useNodeUpdater(id: string) {
  const { setNodes } = useReactFlow();
  return useCallback(
    (patch: Partial<StudioNodeData>) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, ...patch } } : node,
        ),
      );
    },
    [id, setNodes],
  );
}

interface ImageTag {
  label: string;
  preview?: string;
}

/** Image-producing sources wired into this node, in connection order (@Ảnh1, @Ảnh2, …). */
function useConnectedImageTags(nodeId: string): ImageTag[] {
  const { getEdges, getNodes } = useReactFlow();
  const nodes = getNodes();
  const edges = getEdges().filter((edge) => {
    if (edge.target !== nodeId) return false;
    const source = nodes.find((node) => node.id === edge.source);
    if (!source) return false;
    const role = sourceMediaRole(source.type, source.data as StudioNodeData);
    return role === "image" || role === "look";
  });
  return edges.map((edge, index) => {
    const source = nodes.find((node) => node.id === edge.source);
    const sourceData = (source?.data ?? {}) as StudioNodeData;
    const preview = sourceData.imageUrl || sourceData.result?.url;
    return { label: `Ảnh${index + 1}`, preview };
  });
}

/** The nth image-producing source on this node (0 = model, 1 = garment). */
function useConnectedPreview(nodeId: string, index: number): string | undefined {
  const tags = useConnectedImageTags(nodeId);
  return tags[index]?.preview;
}

/** A prompt textarea that opens a picker of connected images when "@" is typed. */
function MentionTextarea({
  value,
  onChange,
  placeholder,
  tags,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  tags: ImageTag[];
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);

  const mentionAt = (text: string, caret: number) => {
    const match = /@([^\s@]*)$/.exec(text.slice(0, caret));
    return match ? { query: match[1], start: caret - match[0].length } : null;
  };

  const insert = (label: string) => {
    const el = ref.current;
    if (!el) return;
    const caret = el.selectionStart ?? value.length;
    const hit = mentionAt(value, caret);
    if (!hit) return;
    const next = `${value.slice(0, hit.start)}@${label} ${value.slice(caret)}`;
    onChange(next);
    setQuery(null);
    requestAnimationFrame(() => {
      el.focus();
      const pos = hit.start + label.length + 2;
      el.setSelectionRange(pos, pos);
    });
  };

  const matches = tags.filter((tag) => tag.label.toLowerCase().includes((query ?? "").toLowerCase()));

  return (
    <div className="relative">
      <textarea
        ref={ref}
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next);
          const hit = mentionAt(next, event.target.selectionStart ?? next.length);
          setQuery(hit ? hit.query : null);
        }}
        onKeyDown={(event) => event.key === "Escape" && setQuery(null)}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
      />
      {query !== null && tags.length > 0 && (
        <div className="nodrag absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-y-auto rounded-lg border border-ink-700 bg-ink-900 shadow-xl">
          {matches.length === 0 ? (
            <div className="px-2.5 py-1.5 text-[11.5px] text-ink-500">Không khớp ảnh nào.</div>
          ) : (
            matches.map((tag) => (
              <button
                key={tag.label}
                type="button"
                className="nodrag flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11.5px] text-ink-200 hover:bg-ink-800"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insert(tag.label)}
              >
                {tag.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={withBasePath(tag.preview)} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
                ) : (
                  <span className="h-6 w-6 shrink-0 rounded bg-ink-800" />
                )}
                <span>@{tag.label}</span>
              </button>
            ))
          )}
        </div>
      )}
      {query === null && tags.length > 0 && (
        <p className="pointer-events-none absolute -bottom-4 left-0 text-[10px] text-ink-600">
          Gõ @ để gắn thẻ ảnh đã nối ({tags.length})
        </p>
      )}
    </div>
  );
}

/* --------------------------------- Group box -------------------------------- */

export const GroupNode = memo(function GroupNode({ id, data, selected }: NodeProps) {
  const { setNodes } = useReactFlow();
  const groupData = data as { label?: string; width?: number; height?: number };
  const setLabel = useCallback(
    (label: string) => {
      setNodes((current) => current.map((node) => (node.id === id ? { ...node, data: { ...node.data, label } } : node)));
    },
    [id, setNodes],
  );

  return (
    <div
      className={clsx("relative rounded-[28px] bg-[#2a2a2a]/75", selected && "outline outline-1 outline-white/40")}
      style={{ width: groupData.width ?? 320, height: groupData.height ?? 220 }}
    >
      <input
        value={groupData.label ?? "Nhóm mới"}
        onChange={(event) => setLabel(event.target.value)}
        className="nodrag absolute -top-6 left-1 bg-transparent text-[13px] text-white/90 outline-none"
        placeholder="Nhóm mới"
      />
    </div>
  );
});

export const NODE_TYPES = {
  prompt: PromptNode,
  image: ImageNode,
  generate: GenerateNode,
  upscale: UpscaleNode,
  train: TrainNode,
  result: OutputNode,
  fashion_tryon: FashionTryOnNode,
  fashion_compose: FashionComposeNode,
  group: GroupNode,
};
