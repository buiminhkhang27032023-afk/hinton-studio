"use client";

import { withBasePath } from "@/lib/base-path";
import { LazyVideo } from "@/components/ui/lazy-video";

import { memo, useCallback, useRef, useState, type ReactNode } from "react";
import { Handle, NodeToolbar, Position, useReactFlow, useEdges, useNodes, type NodeProps } from "@xyflow/react";
import clsx from "clsx";
import {
  AlertCircle,
  Check,
  Columns,
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
  Sparkles,
  FolderInput,
  LayoutGrid,
  Unlink,
  Trash2,
} from "lucide-react";
import { NodeMasterPromptBar } from "./master-prompt-section";
import { useStudio, useModelsOfKind, useModelById } from "@/lib/studio-store";
import { useNodeMenu, useRunNode } from "./run-context";
import { sourceMediaRole, type PortKind } from "./ports";
import { useUi } from "@/lib/ui-store";
import type { StudioNodeData } from "@/lib/execute";
import { getProviderMeta, resolveProvider, durationOptions, getDefaultDuration } from "@/lib/provider-meta";

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

/** TapNow-style node: the picture is the node. Settings show once it is selected in Inspector. */
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
  width = 210,
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
  const { openLightbox } = useUi();
  const run = useRunNode();
  const menu = useNodeMenu();
  const lastRunTimeRef = useRef(0);

  const handleRun = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const now = Date.now();
      if (now - lastRunTimeRef.current < 400) return;
      lastRunTimeRef.current = now;
      run(id);
    },
    [id, run],
  );

  const hasMedia = Boolean(preview || video);

  const handleMediaClick = useCallback(
    (e: React.MouseEvent) => {
      if (hasMedia) {
        e.stopPropagation();
        openLightbox({
          url: (video || preview)!,
          kind: video ? "video" : "image",
          title: data.name || label,
        });
      } else if (onMediaClick) {
        onMediaClick();
      }
    },
    [hasMedia, video, preview, openLightbox, data.name, label, onMediaClick],
  );

  return (
    <div
      className="group relative"
      style={{ width }}
      onDragOver={onDrop ? (event) => event.preventDefault() : undefined}
      onDrop={onDrop}
    >
      <div className="pointer-events-none absolute -top-[24px] left-0 right-0 flex items-center justify-between text-[11.5px] font-medium text-neutral-400 select-none">
        <div className="flex max-w-[65%] items-center gap-1.5 truncate">
          <Icon size={12} className="text-neutral-400 shrink-0" strokeWidth={1.8} />
          <span className="truncate">{data.name || label}</span>
          {ready && data.status !== "running" && data.status !== "error" && (
            <Check size={11} className="text-emerald-400 shrink-0" strokeWidth={2.4} />
          )}
          {data.status === "running" && <Loader2 size={11} className="animate-spin text-amber-400 shrink-0" />}
          {data.status === "error" && <AlertCircle size={11} className="text-rose-400 shrink-0" />}
        </div>
        {canRun && (
          <button
            type="button"
            className="pointer-events-auto nodrag flex items-center gap-1 rounded-full bg-white/10 hover:bg-brass-400 hover:text-black px-2 py-0.5 text-[10.5px] text-white/90 transition shadow-sm font-medium"
            disabled={data.status === "running"}
            onMouseDown={handleRun}
            onClick={handleRun}
            title="Chạy khối này ngay (1 nhấp chuột)"
          >
            {data.status === "running" ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <Play size={10} fill="currentColor" />
            )}
            <span>{data.status === "running" ? "Đang tạo…" : ready ? "Tạo lại" : "Chạy"}</span>
          </button>
        )}
      </div>

      <div
        className={clsx(
          "relative overflow-hidden rounded-2xl bg-[#121216] border border-white/10 transition-all duration-150",
          selected ? "ring-1 ring-white/90 border-white/40 shadow-xl" : "hover:border-white/20",
          hasMedia && "cursor-pointer",
        )}
        style={text != null ? { minHeight: 120 } : { aspectRatio: "3 / 4" }}
        onClick={handleMediaClick}
      >
        {video ? (
          <LazyVideo src={withBasePath(video)} className="h-full w-full object-cover" />
        ) : preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img loading="lazy" decoding="async" src={withBasePath(preview)} alt="" className="h-full w-full object-cover" />
        ) : text != null ? (
          <p className={clsx("line-clamp-6 p-3 text-[12.5px] leading-relaxed", text ? "text-white/90" : "text-white/35")}>
            {text || "Nhập câu lệnh…"}
          </p>
        ) : (
          <span className="grid h-full place-items-center text-white/25">
            {busy ? <Loader2 size={20} className="animate-spin" /> : <Icon size={26} strokeWidth={1.3} />}
          </span>
        )}

        {/* Hover action overlay on media */}
        {hasMedia && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none flex flex-col justify-between p-2">
            <div className="flex items-center justify-between pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openLightbox({
                    url: (video || preview)!,
                    kind: video ? "video" : "image",
                    title: data.name || label,
                  });
                }}
                className="flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10.5px] font-medium text-white shadow-md backdrop-blur-md hover:bg-black/90 transition"
                title="Phóng to xem chi tiết"
              >
                <ZoomIn size={11} />
                <span>Phóng to</span>
              </button>

              {onMediaClick && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMediaClick();
                  }}
                  className="flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10.5px] font-medium text-white/80 shadow-md backdrop-blur-md hover:bg-black/90 hover:text-white transition"
                  title="Thay đổi file ảnh/video"
                >
                  <span>Đổi file</span>
                </button>
              )}
            </div>

            {menu?.reuse && (
              <div className="flex items-center gap-1 pointer-events-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    menu.reuse?.(id);
                  }}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brass-500/90 hover:bg-brass-400 px-2 py-1 text-[11px] font-medium text-black shadow-md transition"
                  title="Dùng lại ảnh/video này làm khối đầu vào mới trên Canvas"
                >
                  <Sparkles size={11} />
                  <span>Dùng lại</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

/** One input on the left, one output on the right. Both sit on the vertical center with enhanced hitbox. */
function NodePorts({ out, accept }: { out?: PortKind | null; accept?: string | null }) {
  const hasAccept = Boolean(accept && accept.trim().length > 0);
  const hasOut = Boolean(out);

  return (
    <>
      {hasAccept && (
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          title="Đầu vào"
          data-accept={accept}
          className="!h-2.5 !w-2.5 !border-2 !border-[#121216] !bg-neutral-400 hover:!bg-sky-400 hover:!scale-125 transition-all !cursor-crosshair"
        />
      )}
      {hasOut && (
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          title="Đầu ra"
          data-port={out}
          className="!h-2.5 !w-2.5 !border-2 !border-[#121216] !bg-neutral-400 hover:!bg-amber-400 hover:!scale-125 transition-all !cursor-crosshair"
        />
      )}
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
      label="Câu lệnh"
      icon={Type}
      data={nodeData}
      text={nodeData.text ?? ""}
      canRun={false}
      width={240}
      editor={
        <div className="space-y-1.5">
          <NodeMasterPromptBar data={nodeData} onPatch={update} />
          <textarea
            className="field nodrag min-h-[96px] text-[13px]"
            placeholder={tr("node.promptPlaceholder")}
            value={nodeData.text ?? ""}
            onChange={(event) => update({ text: event.target.value })}
          />
        </div>
      }
    >
      <NodePorts out="text" accept="text" />
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

  const isVideoMedia = Boolean(nodeData.videoUrl || nodeData.result?.kind === "video");
  const video = nodeData.videoUrl || (nodeData.result?.kind === "video" ? nodeData.result.url : undefined);
  const connectedPreview = useConnectedPreview(id, 0);
  const preview = !isVideoMedia
    ? (nodeData.imageUrl || (nodeData.result?.kind === "image" ? nodeData.result.url : undefined) || connectedPreview)
    : undefined;

  const upload = useCallback(
    async (file: File) => {
      setBusy(true);
      try {
        const { api } = await import("@/lib/api-client");
        const asset = await api.assets.upload(file, project?.id ?? null);
        const isVid = file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name);
        if (isVid) {
          update({ videoUrl: asset.url, imageUrl: undefined, result: asset, name: file.name, status: "done" });
          toast("Đã tải lên video thành công!", "success");
        } else {
          update({ imageUrl: asset.url, videoUrl: undefined, result: asset, name: file.name, status: "done" });
          toast(tr("toast.uploaded"), "success");
        }
      } catch (error) {
        toast(error instanceof Error ? error.message : "Tải lên thất bại", "error");
      } finally {
        setBusy(false);
      }
    },
    [project?.id, toast, tr, update],
  );

  return (
    <TapFrame
      id={id}
      selected={selected}
      label={isVideoMedia ? "Video nguồn" : "Ảnh nguồn"}
      icon={isVideoMedia ? Play : ImageIcon}
      data={nodeData}
      preview={preview}
      video={video}
      canRun={false}
      busy={busy}
      onMediaClick={() => inputRef.current?.click()}
      onDrop={(event) => {
        const file = event.dataTransfer.files?.[0];
        if (file) upload(file);
      }}
      editor={
        <button
          type="button"
          className="nodrag flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2 text-[12.5px] text-white hover:bg-white/20 transition"
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Đang tải…" : "Đổi ảnh hoặc video"}
        </button>
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) upload(file);
          event.target.value = "";
        }}
      />
      <NodePorts out={isVideoMedia ? "video" : "image"} accept="image video any" />
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
  options: { value: string; label: string; group?: string }[];
  className?: string;
}) {
  const hasGroup = options.some((o) => !!o.group);
  if (!hasGroup) {
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

  const groups: Record<string, { value: string; label: string }[]> = {};
  const ungrouped: { value: string; label: string }[] = [];
  for (const opt of options) {
    if (opt.group) {
      if (!groups[opt.group]) groups[opt.group] = [];
      groups[opt.group].push(opt);
    } else {
      ungrouped.push(opt);
    }
  }

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={clsx(
        "nodrag truncate rounded-full border border-ink-700 bg-ink-900/80 px-2.5 py-1 text-[11px] text-ink-200 outline-none transition hover:border-ink-600",
        className,
      )}
    >
      {ungrouped.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
      {Object.entries(groups).map(([grp, items]) => (
        <optgroup key={grp} label={`── ${grp} ──`}>
          {items.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </optgroup>
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
  const providerMeta = getProviderMeta(model?.provider || model?.id);
  const run = useRunNode();
  const result = nodeData.result;
  const imageTags = useConnectedImageTags(id);

  const isVideo = nodeData.modelKind === "video";
  return (
    <TapFrame
      id={id}
      selected={selected}
      label={isVideo ? "Tạo video" : "Tạo ảnh"}
      icon={isVideo ? Play : ImageIcon}
      data={nodeData}
      preview={result?.kind === "image" ? result.url : undefined}
      video={result?.kind === "video" ? result.url : undefined}
      editor={
        <div className="space-y-2">
          <NodeMasterPromptBar data={nodeData} onPatch={update} kind={isVideo ? "video" : "image"} />
          <MentionTextarea
            className="field nodrag min-h-[72px] text-[12.5px]"
            placeholder={tr("node.promptPlaceholder")}
            value={nodeData.prompt ?? ""}
            onChange={(next) => update({ prompt: next })}
            tags={imageTags}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            {model && (
              <span
                className="nodrag flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-white/80"
                title={`Nguồn: ${providerMeta.label}`}
              >
                <span>{providerMeta.icon}</span>
                <span>{providerMeta.short}</span>
              </span>
            )}
            <PillSelect
              value={nodeData.modelId ?? ""}
              onChange={(value) => {
                if (!value) {
                  update({ modelId: "" });
                  return;
                }
                const avail = durationOptions(value);
                let dur = nodeData.duration;
                if (!dur || !avail.includes(dur)) {
                  dur = getDefaultDuration(value);
                  if (!avail.includes(dur)) {
                    dur = avail[avail.length - 1] ?? 10;
                  }
                }
                let aspect = nodeData.aspect ?? "16:9";
                const p = (nodeData.prompt ?? "").toLowerCase();
                if (p.includes("9:16") || p.includes("dọc") || p.includes("vertical") || p.includes("tiktok")) {
                  aspect = "9:16";
                } else if (p.includes("16:9") || p.includes("ngang") || p.includes("landscape")) {
                  aspect = "16:9";
                }

                if (value.startsWith("iooai:")) {
                  update({ modelId: value, duration: dur, resolution: nodeData.resolution ?? "720p", aspect });
                } else if (value.includes("piapi")) {
                  const pDur = Math.min(15, Math.max(4, dur));
                  update({
                    modelId: value,
                    duration: pDur,
                    resolution: nodeData.resolution ?? "480p",
                    aspect,
                  });
                } else if (value.includes("veo")) {
                  const vDur = [4, 6, 8].includes(dur) ? dur : 6;
                  update({
                    modelId: value,
                    duration: vDur,
                    aspect,
                  });
                } else {
                  update({ modelId: value, duration: dur, aspect });
                }
              }}
              className="min-w-[140px] max-w-[220px]"
              options={[
                { value: "", label: models.length ? tr("node.model") : tr("node.noModel") },
                ...models.map((item) => ({
                  value: item.id,
                  label: item.label,
                  group: getProviderMeta(item.provider || item.id).short,
                })),
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
      label="Upscale"
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
                ...models.map((item) => ({
                  value: item.id,
                  label: item.label,
                  group: getProviderMeta(item.provider || item.id).short,
                })),
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
      label="Train model"
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
                ...models.map((item) => ({
                  value: item.id,
                  label: item.label,
                  group: getProviderMeta(item.provider || item.id).short,
                })),
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
      label="Kết quả"
      icon={Check}
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
      label="Thử đồ AI"
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
  const { setNodes } = useReactFlow();

  const convertToGenerate = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              type: "generate",
              data: {
                ...n.data,
                modelKind: "video",
                modelId: "iooai:omni_flash_10s",
                aspect: "9:16",
                duration: 10,
                resolution: "720p",
                prompt: "Người mẫu mặc trang phục sải bước tự tin, phong cách lookbook thời trang cao cấp.",
                status: "idle",
                error: null,
              },
            }
          : n,
      ),
    );
  }, [id, setNodes]);

  return (
    <TapFrame
      id={id}
      selected={selected}
      label="Ghép Lookbook"
      icon={Columns}
      data={nodeData}
      video={result?.url}
      editor={
        <div className="space-y-2">
          <p className="text-[11px] text-white/45">Ghép 60:40 (cần 1 video có sẵn). Hoặc chuyển sang Tạo Video AI bên dưới:</p>
          <button
            type="button"
            onClick={convertToGenerate}
            className="nodrag flex w-full items-center justify-center gap-1.5 rounded-xl border border-sky-400/40 bg-sky-500/20 py-2 text-[11.5px] font-medium text-sky-200 hover:bg-sky-500/30"
          >
            <Play size={12} />
            Đổi sang Tạo Video AI (Có Model)
          </button>
          <input className="field nodrag text-[12px] font-semibold" placeholder="Tiêu đề" value={nodeData.headline ?? "HÃY NHỚ"} onChange={(event) => update({ headline: event.target.value })} />
          <input className="field nodrag text-[12px]" placeholder="Tiêu đề phụ" value={nodeData.subheadline ?? "Bí quyết phối đồ"} onChange={(event) => update({ subheadline: event.target.value })} />
          <button onClick={() => run(id)} disabled={nodeData.status === "running"} className="nodrag flex w-full items-center justify-center gap-1.5 rounded-xl bg-white py-1.5 text-[12px] font-medium text-black disabled:opacity-50">
            {nodeData.status === "running" ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            {nodeData.status === "running" ? tr("node.running") : "Xuất video ghép"}
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
// durationOptions and getDefaultDuration imported from @/lib/provider-meta

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

export interface ImageTag {
  label: string;
  preview?: string;
}

export function getConnectedImageTags(
  nodeId: string,
  nodes: { id: string; type?: string; data?: unknown }[],
  edges: { source: string; target: string }[],
): ImageTag[] {
  const incoming = edges.filter((edge) => edge.target === nodeId);
  return incoming.flatMap((edge, index) => {
    const source = nodes.find((node) => node.id === edge.source);
    if (!source) return [];
    const role = sourceMediaRole(source.type, source.data as StudioNodeData);
    if (role !== "image" && role !== "look") return [];
    const sourceData = (source?.data ?? {}) as StudioNodeData;
    const preview = sourceData.imageUrl || sourceData.result?.url;
    return [{ label: `Ảnh${index + 1}`, preview }];
  });
}

/** Image-producing sources wired into this node, in connection order (@Ảnh1, @Ảnh2, …). */
export function useConnectedImageTags(nodeId: string): ImageTag[] {
  const nodes = useNodes();
  const edges = useEdges();
  return getConnectedImageTags(nodeId, nodes, edges);
}

/** The nth image-producing source on this node (0 = model, 1 = garment). */
export function useConnectedPreview(nodeId: string, index: number): string | undefined {
  const tags = useConnectedImageTags(nodeId);
  return tags[index]?.preview;
}

/** A prompt textarea that opens a picker of connected images when "@" is typed. */
export function MentionTextarea({
  value,
  onChange,
  placeholder,
  tags,
  className,
  rows,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  tags: ImageTag[];
  className?: string;
  rows?: number;
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
      {query !== null && (
        <div className="nodrag absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-xl border border-white/15 bg-neutral-900/95 p-1 shadow-2xl backdrop-blur-md">
          {tags.length === 0 ? (
            <div className="px-3 py-2 text-[11.5px] text-white/60 leading-relaxed">
              Chưa có ảnh nối vào khối này.<br />
              <span className="text-white/40 text-[10.5px]">Hãy kéo dây từ khối ảnh vào cổng bên trái để tag @Ảnh1, @Ảnh2...</span>
            </div>
          ) : matches.length === 0 ? (
            <div className="px-3 py-2 text-[11.5px] text-white/50">Không khớp ảnh nào với &quot;@{query}&quot;.</div>
          ) : (
            matches.map((tag) => (
              <button
                key={tag.label}
                type="button"
                className="nodrag flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12px] text-white/90 hover:bg-white/10 transition"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insert(tag.label)}
              >
                {tag.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy" decoding="async" src={withBasePath(tag.preview)} alt="" className="h-7 w-7 shrink-0 rounded-md border border-white/20 object-cover" />
                ) : (
                  <span className="h-7 w-7 shrink-0 rounded-md bg-white/10" />
                )}
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-emerald-400">@{tag.label}</span>
                  <span className="text-[10px] text-white/40 truncate">Ảnh tham chiếu số {tag.label.replace('Ảnh', '')}</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
          <span className="text-[10px] text-white/40">Gợi ý tag ảnh:</span>
          {tags.map((tag) => (
            <button
              key={tag.label}
              type="button"
              onClick={() => {
                const tagStr = `@${tag.label}`;
                if (!value.includes(tagStr)) {
                  onChange(value ? `${value} ${tagStr}` : tagStr);
                }
              }}
              className="nodrag flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10.5px] font-medium text-emerald-300 hover:bg-emerald-500/20 transition"
              title={`Bấm để chèn @${tag.label} vào câu lệnh`}
            >
              {tag.preview && (
                <img loading="lazy" decoding="async" src={withBasePath(tag.preview)} alt="" className="h-3.5 w-3.5 rounded object-cover" />
              )}
              <span>@{tag.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Group box -------------------------------- */

export const GroupNode = memo(function GroupNode({ id, data, selected }: NodeProps) {
  const { setNodes } = useReactFlow();
  const { toast } = useUi();
  const groupData = data as { label?: string; width?: number; height?: number };

  const setLabel = useCallback(
    (label: string) => {
      setNodes((current) => current.map((node) => (node.id === id ? { ...node, data: { ...node.data, label } } : node)));
    },
    [id, setNodes],
  );

  const handleAbsorbNearby = useCallback(() => {
    setNodes((current) => {
      const group = current.find((n) => n.id === id);
      if (!group) return current;
      const gX = group.position.x;
      const gY = group.position.y;
      const gW = groupData.width ?? 360;
      const gH = groupData.height ?? 260;

      // Find free nodes that intersect or sit inside this group's bounding box
      const candidates = current.filter(
        (n) =>
          !n.parentId &&
          n.id !== id &&
          n.type !== "group" &&
          n.position.x >= gX - 40 &&
          n.position.x <= gX + gW + 40 &&
          n.position.y >= gY - 40 &&
          n.position.y <= gY + gH + 40,
      );

      if (candidates.length === 0) {
        toast("Kéo các khối đặt vào hoặc đè lên khung nhóm rồi bấm nút này để gom vào.", "default");
        return current;
      }

      // Repack candidates inside the group
      const pad = 24;
      const gap = 16;
      const cols = Math.max(1, Math.ceil(Math.sqrt(candidates.length)));
      const childW = 240;
      const childH = 160;

      const newPlacements = new Map<string, { x: number; y: number }>();
      let y = pad + 32;
      let maxW = 0;
      for (let i = 0; i < candidates.length; i += cols) {
        const row = candidates.slice(i, i + cols);
        let x = pad;
        for (const item of row) {
          newPlacements.set(item.id, { x, y });
          x += childW + gap;
        }
        maxW = Math.max(maxW, x - gap + pad);
        y += childH + gap;
      }
      const newH = y - gap + pad;
      const newW = Math.max(gW, maxW);

      toast(`Đã gom ${candidates.length} khối vào "${groupData.label || "New Group"}"!`, "success");

      return current.map((n) => {
        if (n.id === id) {
          return { ...n, data: { ...n.data, width: newW, height: newH } };
        }
        const place = newPlacements.get(n.id);
        if (place) {
          return {
            ...n,
            parentId: id,
            extent: "parent" as const,
            position: place,
          };
        }
        return n;
      });
    });
  }, [groupData.label, groupData.width, groupData.height, id, setNodes, toast]);

  const handleTidy = useCallback(() => {
    setNodes((current) => {
      const children = current.filter((n) => n.parentId === id);
      if (children.length === 0) return current;
      const pad = 24;
      const gap = 16;
      const cols = Math.max(1, Math.ceil(Math.sqrt(children.length)));
      const childW = 240;
      const childH = 160;

      let y = pad + 32;
      let maxW = 0;
      const updatedChildren = new Map<string, { x: number; y: number }>();
      for (let i = 0; i < children.length; i += cols) {
        const row = children.slice(i, i + cols);
        let x = pad;
        for (const item of row) {
          updatedChildren.set(item.id, { x, y });
          x += childW + gap;
        }
        maxW = Math.max(maxW, x - gap + pad);
        y += childH + gap;
      }
      const newH = y - gap + pad;
      const newW = Math.max(groupData.width ?? 360, maxW);

      toast("Đã căn chỉnh gọn gàng các khối trong nhóm", "success");

      return current.map((n) => {
        if (n.id === id) {
          return { ...n, data: { ...n.data, width: newW, height: newH } };
        }
        const place = updatedChildren.get(n.id);
        if (place) {
          return { ...n, position: place };
        }
        return n;
      });
    });
  }, [groupData.width, id, setNodes, toast]);

  const handleUngroup = useCallback(() => {
    setNodes((current) => {
      const group = current.find((n) => n.id === id);
      if (!group) return current;
      return current
        .filter((n) => n.id !== id)
        .map((n) => {
          if (n.parentId !== id) return n;
          const { parentId, extent, ...rest } = n;
          void parentId;
          void extent;
          return {
            ...rest,
            position: {
              x: group.position.x + n.position.x,
              y: group.position.y + n.position.y,
            },
          };
        });
    });
    toast("Đã rã nhóm (Ungroup)", "default");
  }, [id, setNodes, toast]);

  const handleDeleteGroup = useCallback(() => {
    setNodes((current) => {
      const memberIds = new Set(current.filter((n) => n.parentId === id).map((n) => n.id));
      memberIds.add(id);
      return current.filter((n) => !memberIds.has(n.id));
    });
    toast("Đã xoá nhóm và toàn bộ khối bên trong", "default");
  }, [id, setNodes, toast]);

  return (
    <div
      className={clsx(
        "group/grp relative flex flex-col rounded-2xl border transition-all duration-200 select-none",
        selected
          ? "bg-[#141418]/85 ring-1 ring-white/30 border-white/40 shadow-2xl"
          : "bg-[#111116]/60 hover:border-white/20 backdrop-blur-sm border-white/10",
      )}
      style={{ width: groupData.width ?? 360, height: groupData.height ?? 260 }}
    >
      {selected && (
        <NodeToolbar
          isVisible
          position={Position.Top}
          offset={12}
          className="nodrag nopan flex items-center gap-1.5 rounded-full border border-white/15 bg-[#141418]/95 px-3 py-1.5 shadow-2xl backdrop-blur-md text-[12px] text-white z-50 select-none"
        >
          <button
            type="button"
            onClick={handleAbsorbNearby}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-neutral-200 hover:bg-white/10 hover:text-white transition"
            title="Gom tất cả các khối đang nằm trên khung này vào nhóm"
          >
            <FolderInput size={13} className="text-amber-400" />
            Gom khối vào
          </button>
          <button
            type="button"
            onClick={handleTidy}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-neutral-200 hover:bg-white/10 hover:text-white transition"
            title="Căn chỉnh lưới các khối con"
          >
            <LayoutGrid size={13} />
            Căn lưới
          </button>
          <span className="mx-0.5 h-3.5 w-px bg-white/20" />
          <button
            type="button"
            onClick={handleUngroup}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-neutral-200 hover:bg-white/10 hover:text-white transition"
            title="Rã nhóm (Ungroup)"
          >
            <Unlink size={13} />
            Rã nhóm
          </button>
          <button
            type="button"
            onClick={handleDeleteGroup}
            className="rounded-lg p-1 text-neutral-400 hover:bg-rose-500/20 hover:text-rose-300 transition"
            title="Xoá cả nhóm"
          >
            <Trash2 size={13} />
          </button>
        </NodeToolbar>
      )}

      {/* Group Title: Positioned cleanly at top-left inside or above group */}
      <div className="nodrag absolute -top-6 left-1 flex items-center gap-1.5 z-10">
        <input
          value={groupData.label ?? "New Group"}
          onChange={(event) => setLabel(event.target.value)}
          className="bg-transparent text-[12px] font-semibold text-neutral-400 hover:text-white focus:text-white focus:outline-none max-w-[200px] transition cursor-text tracking-wide"
          placeholder="New Group"
        />
      </div>
    </div>
  );
});

export const PromptMasterNode = memo(function PromptMasterNode({ id, data, selected }: NodeProps) {
  const update = useNodeUpdater(id);
  const run = useRunNode();
  const nodeData = data as StudioNodeData;
  return (
    <TapFrame
      id={id}
      selected={selected}
      label="Trợ lý Prompt Bậc Thầy"
      icon={Sparkles}
      data={nodeData}
      text={nodeData.text ?? nodeData.prompt ?? ""}
      canRun={true}
      width={250}
      editor={
        <div className="space-y-2">
          <NodeMasterPromptBar data={{ ...nodeData, masterPromptEnabled: true }} onPatch={update} />
          <textarea
            className="field nodrag min-h-[90px] text-[12.5px]"
            placeholder="Nhập ý tưởng thô hoặc nối câu lệnh vào đây..."
            value={nodeData.text ?? nodeData.prompt ?? ""}
            onChange={(event) => update({ text: event.target.value, prompt: event.target.value })}
          />
          <button
            type="button"
            onClick={() => run(id)}
            disabled={nodeData.status === "running"}
            className="nodrag flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-400 py-1.5 text-[12px] font-semibold text-black hover:bg-amber-300 transition disabled:opacity-50"
          >
            {nodeData.status === "running" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            {nodeData.status === "running" ? "Đang hoàn thiện..." : "Chạy Hoàn Thiện AI"}
          </button>
        </div>
      }
    >
      <NodePorts out="text" accept="text" />
    </TapFrame>
  );
});

export const NODE_TYPES = {
  prompt: PromptNode,
  prompt_master: PromptMasterNode,
  image: ImageNode,
  generate: GenerateNode,
  upscale: UpscaleNode,
  train: TrainNode,
  result: OutputNode,
  fashion_tryon: FashionTryOnNode,
  fashion_compose: FashionComposeNode,
  group: GroupNode,
};
