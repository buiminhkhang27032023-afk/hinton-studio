"use client";

import { withBasePath } from "@/lib/base-path";

import { memo, useCallback, useRef, useState } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import clsx from "clsx";
import {
  AlertCircle,
  Check,
  Image as ImageIcon,
  Loader2,
  Play,
  Type,
  Upload,
  Wand2,
  ZoomIn,
  BrainCircuit,
  Shirt,
  SplitSquareVertical,
  Layers,
  RefreshCw,
  ArrowUp,
  Download,
} from "lucide-react";
import { useStudio, useModelsOfKind, useModelById } from "@/lib/studio-store";
import { useRunNode } from "./run-context";
import { useUi } from "@/lib/ui-store";
import type { StudioNodeData } from "@/lib/execute";

const NODE_SHELL =
  "group relative rounded-xl2 border bg-white shadow-[0_10px_28px_-10px_rgba(0,0,0,.6)] transition-[border-color,box-shadow,transform] duration-150 ease-out hover:shadow-[0_16px_36px_-10px_rgba(0,0,0,.7)]";

function StatusPill({ data }: { data: StudioNodeData }) {
  const { tr } = useUi();
  if (!data.status || data.status === "idle") return null;
  const map = {
    running: { icon: Loader2, text: tr("node.running"), tone: "bg-brass-700/25 text-brass-300" },
    done: { icon: Check, text: tr("node.done"), tone: "bg-emerald-900/35 text-emerald-300" },
    error: { icon: AlertCircle, text: tr("node.failed"), tone: "bg-red-950/70 text-red-300" },
  } as const;
  const { icon: Icon, text, tone } = map[data.status as keyof typeof map] ?? map.running;
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium", tone)}>
      <Icon size={10} className={data.status === "running" ? "animate-spin" : ""} />
      {text}
    </span>
  );
}

function NodeHeader({
  icon: Icon,
  title,
  data,
  accent,
}: {
  icon: typeof Type;
  title: string;
  data: StudioNodeData;
  accent: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-ink-200 px-3.5 py-2.5">
      <div className="flex items-center gap-2">
        <span className={clsx("grid h-6 w-6 place-items-center rounded-md", accent)}>
          <Icon size={12.5} strokeWidth={2.2} />
        </span>
        <span className="text-[12.5px] font-medium tracking-tight text-ink-900">{title}</span>
      </div>
      <StatusPill data={data} />
    </div>
  );
}

/* ------------------------------- Prompt node ------------------------------ */

export const PromptNode = memo(function PromptNode({ id, data, selected }: NodeProps) {
  const { tr } = useUi();
  const update = useNodeUpdater(id);
  return (
    <div
      className={clsx(
        NODE_SHELL,
        "w-[300px]",
        selected ? "border-brass-500/70" : "border-ink-200",
      )}
    >
      <NodeHeader
        icon={Type}
        title={tr("node.prompt")}
        data={data as StudioNodeData}
        accent="bg-violet-900/50 text-violet-soft"
      />
      <div className="p-3">
        <textarea
          className="field nodrag min-h-[104px] text-[13px]"
          placeholder={tr("node.promptPlaceholder")}
          value={(data as StudioNodeData).text ?? ""}
          onChange={(event) => update({ text: event.target.value })}
        />
        <div className="mt-2 flex items-center justify-between text-[11px] text-ink-500">
          <span>{((data as StudioNodeData).text ?? "").length} ký tự</span>
          <span>{tr("canvas.connectionHint")}</span>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="prompt"
        className="!bg-violet-400"
      />
    </div>
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
    <div
      className={clsx(NODE_SHELL, "w-[260px]", selected ? "border-brass-500/70" : "border-ink-200")}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files?.[0];
        if (file) upload(file);
      }}
    >
      <NodeHeader
        icon={ImageIcon}
        title={tr("node.image")}
        data={nodeData}
        accent="bg-sky-100 text-sky-600"
      />
      <div className="p-3">
        <button
          onClick={() => inputRef.current?.click()}
          className={clsx(
            "relative grid w-full overflow-hidden rounded-lg border border-dashed transition",
            preview ? "border-transparent" : "border-ink-300 hover:border-brass-500/60 hover:bg-ink-100",
          )}
          style={{ aspectRatio: "4/3" }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={withBasePath(preview)} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center justify-center gap-1.5 px-4 text-center text-[12px] text-ink-500">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {tr("node.uploadHint")}
            </span>
          )}
        </button>
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
      </div>
      <Handle type="source" position={Position.Right} id="image" className="!bg-sky-400" />
    </div>
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

  return (
    <div
      className={clsx(NODE_SHELL, "w-[300px]", selected ? "border-brass-500/70" : "border-ink-200")}
    >
      <Handle type="target" position={Position.Left} id="prompt" className="!top-[38%] !bg-violet-400" />
      <Handle type="target" position={Position.Left} id="image" className="!top-[62%] !bg-sky-400" />
      <NodeHeader
        icon={nodeData.modelKind === "video" ? Play : Wand2}
        title={nodeData.modelKind === "video" ? "Tạo video" : "Tạo ảnh"}
        data={nodeData}
        accent="bg-brass-300/60 text-brass-700"
      />

      <div className="space-y-2.5 p-3">
        <MentionTextarea
          className="field nodrag min-h-[72px] text-[12.5px]"
          placeholder={tr("node.promptPlaceholder")}
          value={nodeData.prompt ?? ""}
          onChange={(next) => update({ prompt: next })}
          tags={imageTags}
        />
        {imageTags.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {imageTags.map((tag) => (
              <span
                key={tag.label}
                className="flex items-center gap-1 rounded-full border border-ink-700 bg-ink-900/70 px-1.5 py-0.5 text-[10px] text-ink-400"
              >
                {tag.preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={withBasePath(tag.preview)} alt="" className="h-3.5 w-3.5 rounded-full object-cover" />
                )}
                @{tag.label}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <PillSelect
            value={nodeData.modelId ?? ""}
            onChange={(value) => update(value.startsWith("iooai:") ? { modelId: value, duration: 10, resolution: "720p", aspect: "16:9" } : { modelId: value })}
            className="max-w-[108px]"
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
          {nodeData.modelKind === "video" ? (
            <PillSelect
              value={String(nodeData.duration ?? 6)}
              onChange={(value) => update({ duration: Number(value) })}
              options={durationOptions(model?.id).map((seconds) => ({ value: String(seconds), label: `${seconds}s` }))}
            />
          ) : (
            <button
              className="nodrag rounded-full border border-ink-700 bg-ink-900/80 px-2.5 py-1 text-[11px] text-ink-300 hover:border-ink-600 hover:text-ink-100"
              onClick={() => update({ seed: Math.floor(Math.random() * 1_000_000) })}
              title={tr("node.seed")}
            >
              🎲 {nodeData.seed ?? "—"}
            </button>
          )}

          <button
            onClick={() => run(id)}
            disabled={nodeData.status === "running"}
            title={nodeData.status === "running" ? tr("node.running") : tr("canvas.toolbar.run")}
            className="nodrag ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brass-500 text-ink-950 transition hover:bg-brass-400 disabled:opacity-50"
          >
            {nodeData.status === "running" ? <Loader2 size={13} className="animate-spin" /> : <ArrowUp size={14} strokeWidth={2.4} />}
          </button>
        </div>

        {result && (
          <div className="overflow-hidden rounded-lg border border-ink-700 bg-ink-900">
            {result.kind === "video" ? (
              <video src={withBasePath(result.url)} controls className="w-full" />
            ) : result.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={withBasePath(result.url)} alt="" className="w-full" />
            ) : (
              <div className="max-h-32 overflow-y-auto whitespace-pre-wrap p-2 text-[11.5px] text-ink-300">
                {String(result.meta?.text ?? "")}
              </div>
            )}
          </div>
        )}

        {nodeData.error && (
          <p className="rounded-md bg-red-950/50 px-2 py-1.5 text-[11.5px] leading-snug text-red-300">
            {nodeData.error}
          </p>
        )}

        {!nodeData.modelId && models.length > 0 && (
          <p className="rounded-md border border-amber-300/60 bg-amber-50 px-2 py-1 text-[10.5px] text-amber-700">
            Chọn model ở hàng phía trên để bắt đầu.
          </p>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="result" className="!bg-brass-400" />
    </div>
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
    <div
      className={clsx(NODE_SHELL, "w-[270px]", selected ? "border-brass-500/70" : "border-ink-200")}
    >
      <Handle type="target" position={Position.Left} id="image" className="!bg-sky-400" />
      <NodeHeader
        icon={ZoomIn}
        title={tr("node.upscale")}
        data={nodeData}
        accent="bg-emerald-900/45 text-emerald-300"
      />
      <div className="space-y-2.5 p-3">
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
          {[2, 4, 8].map((scale) => (
            <button
              key={scale}
              onClick={() => update({ scale })}
              className={clsx(
                "nodrag rounded-full border px-2.5 py-1 text-[11px] transition",
                (nodeData.scale ?? 2) === scale
                  ? "border-brass-500/70 bg-brass-300/40 text-brass-700"
                  : "border-ink-200 text-ink-500 hover:border-ink-400",
              )}
            >
              ×{scale}
            </button>
          ))}
          {!nodeData.result && (
            <button
              onClick={() => run(id)}
              disabled={nodeData.status === "running"}
              className="nodrag ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brass-500 text-ink-950 transition hover:bg-brass-400 disabled:opacity-50"
            >
              {nodeData.status === "running" ? <Loader2 size={13} className="animate-spin" /> : <ArrowUp size={14} strokeWidth={2.4} />}
            </button>
          )}
        </div>
        {nodeData.result && (
          <div className="group/card relative overflow-hidden rounded-lg border border-ink-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={withBasePath(nodeData.result.url)} alt="" className="w-full" />
            <button
              onClick={() => run(id)}
              disabled={nodeData.status === "running"}
              title="Tạo lại"
              className="nodrag absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-ink-950/70 text-white opacity-70 backdrop-blur transition hover:bg-ink-950/90 hover:opacity-100"
            >
              {nodeData.status === "running" ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            </button>
          </div>
        )}
        {nodeData.error && (
          <p className="rounded-md bg-red-950/50 px-2 py-1.5 text-[11.5px] text-red-300">{nodeData.error}</p>
        )}
      </div>
      <Handle type="source" position={Position.Right} id="result" className="!bg-brass-400" />
    </div>
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
    <div
      className={clsx(NODE_SHELL, "w-[280px]", selected ? "border-brass-500/70" : "border-ink-200")}
    >
      <Handle type="target" position={Position.Left} id="images" className="!bg-sky-400" />
      <NodeHeader
        icon={BrainCircuit}
        title={tr("node.train")}
        data={nodeData}
        accent="bg-fuchsia-900/40 text-fuchsia-300"
      />
      <div className="space-y-2.5 p-3">
        <input
          className="field nodrag text-[12px]"
          placeholder="Tên model (vd: ao-dai-lora)"
          value={nodeData.name ?? ""}
          onChange={(event) => update({ name: event.target.value })}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <PillSelect
            value={nodeData.modelId ?? ""}
            onChange={(value) => update(value.startsWith("iooai:") ? { modelId: value, duration: 10, resolution: "720p", aspect: "16:9" } : { modelId: value })}
            className="max-w-[140px]"
            options={[
              { value: "", label: models.length ? tr("node.model") : tr("node.noModel") },
              ...models.map((item) => ({ value: item.id, label: item.label })),
            ]}
          />
          <span className="flex items-center gap-1 rounded-full border border-ink-200 px-2.5 py-1 text-[11px] text-ink-600">
            Steps
            <input
              type="number"
              className="nodrag w-14 bg-transparent text-right text-ink-900 outline-none"
              value={nodeData.steps ?? 1000}
              onChange={(event) => update({ steps: Number(event.target.value) })}
            />
          </span>
        </div>
        <p className="text-[10.5px] leading-relaxed text-ink-500">
          Nối các khối Ảnh vào để làm bộ dữ liệu huấn luyện.
        </p>
        {nodeData.error && (
          <p className="rounded-md bg-red-950/50 px-2 py-1.5 text-[11.5px] text-red-300">{nodeData.error}</p>
        )}
        <button
          onClick={() => run(id)}
          disabled={nodeData.status === "running"}
          className="nodrag flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-brass-500 text-[12px] font-medium text-ink-950 transition hover:bg-brass-400 disabled:opacity-50"
        >
          {nodeData.status === "running" ? <Loader2 size={12.5} className="animate-spin" /> : <Play size={12.5} />}
          {nodeData.status === "running" ? tr("node.running") : tr("node.run")}
        </button>
      </div>
      <Handle type="source" position={Position.Right} id="result" className="!bg-brass-400" />
    </div>
  );
});

/* ------------------------------- Output node ------------------------------ */

export const OutputNode = memo(function OutputNode({ data, selected }: NodeProps) {
  const { tr } = useUi();
  const nodeData = data as StudioNodeData;
  const asset = nodeData.result;

  return (
    <div
      className={clsx(NODE_SHELL, "w-[300px]", selected ? "border-brass-500/70" : "border-ink-200")}
    >
      <Handle type="target" position={Position.Left} id="in" className="!bg-brass-400" />
      <NodeHeader
        icon={Check}
        title={tr("node.output")}
        data={nodeData}
        accent="bg-emerald-900/45 text-emerald-300"
      />
      <div className="p-3">
        {asset ? (
          <div className="group/card relative overflow-hidden rounded-lg border border-ink-200">
            {asset.kind === "video" ? (
              <video src={withBasePath(asset.url)} controls className="w-full" />
            ) : asset.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={withBasePath(asset.url)} alt="" className="w-full" />
            ) : (
              <div className="whitespace-pre-wrap bg-ink-900 p-2 text-[11.5px] text-ink-300">
                {String(asset.meta?.text ?? "")}
              </div>
            )}
            <a
              href={withBasePath(asset.url)}
              download
              title={tr("common.download")}
              className="nodrag absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-ink-950/70 text-white opacity-70 backdrop-blur transition hover:bg-ink-950/90 hover:opacity-100"
            >
              <Download size={13} />
            </a>
          </div>
        ) : (
          <p className="py-6 text-center text-[11.5px] text-ink-500">
            Nối một khối kết quả vào đây để xem trước.
          </p>
        )}
      </div>
    </div>
  );
});

/* --------------------------- Fashion Try-On node -------------------------- */

export const FashionTryOnNode = memo(function FashionTryOnNode({ id, data, selected }: NodeProps) {
  const { tr } = useUi();
  const update = useNodeUpdater(id);
  const nodeData = data as StudioNodeData;
  const run = useRunNode();
  const result = nodeData.result;
  const garmentPreview = useConnectedPreview(id, "garment");

  return (
    <div
      className={clsx(NODE_SHELL, "w-[270px]", selected ? "border-brass-500/70" : "border-ink-200")}
    >
      <Handle type="target" position={Position.Left} id="model" className="!top-[28%] !bg-rose-400" />
      <Handle type="target" position={Position.Left} id="garment" className="!top-[56%] !bg-amber-400" />
      <Handle type="target" position={Position.Left} id="prompt" className="!top-[84%] !bg-violet-400" />

      <NodeHeader
        icon={Shirt}
        title="Thử Đồ AI"
        data={nodeData}
        accent="bg-rose-900/40 text-rose-300"
      />

      <div className="space-y-2 p-2.5">
        <textarea
          className="field nodrag min-h-[36px] text-[11.5px]"
          placeholder="Mô tả phối đồ (không bắt buộc)"
          value={nodeData.prompt ?? ""}
          onChange={(event) => update({ prompt: event.target.value })}
        />

        {result?.url && (
          <div className="group/card relative overflow-hidden rounded-xl border border-ink-200 bg-white">
            <div className="flex items-center justify-between bg-ink-100 px-2.5 py-1.5">
              <span className="text-[11px] font-semibold tracking-tight text-ink-900">Today&apos;s outfit</span>
              {garmentPreview && (
                <span className="flex items-center gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={withBasePath(garmentPreview)}
                    alt=""
                    className="h-5 w-5 rounded border border-ink-300 object-cover"
                    title="Trang phục gốc"
                  />
                </span>
              )}
            </div>
            <div className="relative">
              {result.kind === "video" ? (
                <video src={withBasePath(result.url)} controls className="aspect-[9/16] w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={withBasePath(result.url)} alt="" className="aspect-[4/3] w-full object-cover" />
              )}
              <button
                onClick={() => run(id)}
                disabled={nodeData.status === "running"}
                title="Tạo lại"
                className="nodrag absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-ink-950/70 text-white opacity-70 backdrop-blur transition hover:bg-ink-950/90 hover:opacity-100"
              >
                {nodeData.status === "running" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <RefreshCw size={13} />
                )}
              </button>
            </div>
          </div>
        )}

        {!result?.url && (
          <button
            onClick={() => run(id)}
            disabled={nodeData.status === "running"}
            className="btn-primary nodrag flex w-full items-center justify-center gap-2 py-2 text-[12.5px]"
          >
            {nodeData.status === "running" ? <Loader2 size={12.5} className="animate-spin" /> : <Play size={12.5} />}
            {nodeData.status === "running" ? tr("node.running") : "Chạy Thử Đồ"}
          </button>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="result" className="!bg-rose-400" />
    </div>
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
    <div
      className={clsx(NODE_SHELL, "w-[320px]", selected ? "border-brass-500/70" : "border-ink-200")}
    >
      <Handle type="target" position={Position.Left} id="video" className="!top-[26%] !bg-sky-400" />
      <Handle type="target" position={Position.Left} id="model" className="!top-[50%] !bg-rose-400" />
      <Handle type="target" position={Position.Left} id="garment" className="!top-[74%] !bg-amber-400" />

      <NodeHeader
        icon={SplitSquareVertical}
        title="Ghép Lookbook (9:16)"
        data={nodeData}
        accent="bg-amber-900/40 text-amber-300"
      />

      <div className="space-y-2.5 p-3">
        <div className="flex items-center justify-between text-[11px] text-ink-400">
          <span>Bố cục TikTok Split (60:40)</span>
          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">1080x1920</span>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-ink-600">Tiêu đề chính (Banner):</label>
          <input
            type="text"
            className="field nodrag text-[12px] font-bold tracking-wide"
            placeholder="VD: HÃY NHỚ"
            value={nodeData.headline ?? "HÃY NHỚ"}
            onChange={(e) => update({ headline: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-ink-600">Tiêu đề phụ:</label>
          <input
            type="text"
            className="field nodrag text-[12px] text-amber-300"
            placeholder="VD: Bí quyết phối đồ"
            value={nodeData.subheadline ?? "Bí quyết phối đồ"}
            onChange={(e) => update({ subheadline: e.target.value })}
          />
        </div>

        <p className="flex items-center gap-1.5 text-[10.5px] text-ink-500">
          <Layers size={11} className="text-amber-500" />
          3 cổng: Video (trái) · Người mẫu + Trang phục (phải)
        </p>

        {result?.url && (
          <div className="group/card relative overflow-hidden rounded-lg border border-ink-200">
            <video src={withBasePath(result.url)} controls className="aspect-[9/16] w-full object-cover" />
            <button
              onClick={() => run(id)}
              disabled={nodeData.status === "running"}
              title="Tạo lại"
              className="nodrag absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-ink-950/70 text-white opacity-70 backdrop-blur transition hover:bg-ink-950/90 hover:opacity-100"
            >
              {nodeData.status === "running" ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            </button>
          </div>
        )}

        {!result?.url && (
          <button
            onClick={() => run(id)}
            disabled={nodeData.status === "running"}
            className="btn-primary nodrag flex w-full items-center justify-center gap-2 py-2 text-[12.5px] font-medium"
          >
            {nodeData.status === "running" ? <Loader2 size={12.5} className="animate-spin" /> : <Play size={12.5} />}
            {nodeData.status === "running" ? tr("node.running") : "Xuất Video Lookbook 9:16"}
          </button>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="result" className="!bg-amber-400" />
    </div>
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

/**
 * Images connected to this node's "image" handle, in connection order — used
 * to power the "@" mention list in prompt textareas (@Ảnh1, @Ảnh2, ...).
 */
function useConnectedImageTags(nodeId: string): ImageTag[] {
  const { getEdges, getNodes } = useReactFlow();
  const edges = getEdges().filter((edge) => edge.target === nodeId && edge.targetHandle === "image");
  const nodes = getNodes();
  return edges.map((edge, index) => {
    const source = nodes.find((node) => node.id === edge.source);
    const sourceData = (source?.data ?? {}) as StudioNodeData;
    const preview = sourceData.imageUrl || sourceData.result?.url;
    return { label: `Ảnh${index + 1}`, preview };
  });
}

/** The image feeding a single target handle on this node, if any (for small reference icons). */
function useConnectedPreview(nodeId: string, handle: string): string | undefined {
  const { getEdges, getNodes } = useReactFlow();
  const edge = getEdges().find((e) => e.target === nodeId && e.targetHandle === handle);
  if (!edge) return undefined;
  const source = getNodes().find((n) => n.id === edge.source);
  const sourceData = (source?.data ?? {}) as StudioNodeData;
  return sourceData.imageUrl || sourceData.result?.url;
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
      className={clsx(
        "relative rounded-2xl bg-[#161618]/90 transition-shadow duration-150",
        selected && "ring-1 ring-brass-400/70",
      )}
      style={{ width: groupData.width ?? 320, height: groupData.height ?? 220 }}
    >
      <input
        value={groupData.label ?? "New Group"}
        onChange={(event) => setLabel(event.target.value)}
        className="nodrag absolute -top-6 left-0 bg-transparent text-[12px] text-ink-400 outline-none placeholder:text-ink-500"
        placeholder="New Group"
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
