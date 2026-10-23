"use client";

import { withBasePath } from "@/lib/base-path";

import { Copy, Download, Play, X } from "lucide-react";
import clsx from "clsx";
import { useStudio } from "@/lib/studio-store";
import { useUi } from "@/lib/ui-store";
import type { StudioNode, StudioNodeData } from "@/lib/execute";
import { Badge, Button, Field, IconButton, Input, Select, Textarea } from "@/components/ui/primitives";

/** Allowed durations differ per video model (Veo only takes 4/6/8). */
function durationOptions(modelId?: string | null): number[] {
  if (modelId === "seed:video:piapi-omni-reference") return Array.from({ length: 12 }, (_, i) => i + 4);
  if (modelId?.includes("veo")) return [4, 6, 8];
  if (modelId?.startsWith("iooai:")) return [10];
  if (modelId?.includes("omni")) return [5, 10];
  return [5, 10, 15, 20, 30];
}

export function Inspector({
  node,
  onPatch,
  onRun,
  onClose,
}: {
  node: StudioNode | null;
  onPatch: (id: string, patch: Partial<StudioNodeData>) => void;
  onRun: () => void;
  onClose: () => void;
}) {
  const { tr, toast } = useUi();
  const models = useStudio((s) => s.models);

  if (!node) return null;

  const data = node.data ?? {};
  const kind = node.type === "upscale" ? "upscale" : node.type === "train" ? "train" : (data.modelKind ?? "image");
  const options = models.filter((model) => model.kind === kind);
  const result = data.result;
  const modelId = data.modelId;

  return (
    <aside className="absolute right-3 top-3 z-30 flex max-h-[min(680px,calc(100%-1.5rem))] w-[288px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141414]/95 shadow-[0_18px_50px_rgba(0,0,0,.65)]">
      <div className="flex items-center justify-between border-b border-ink-700/60 px-4 py-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
          {tr("canvas.inspector")}
        </h2>
        <IconButton label={tr("common.close")} onClick={onClose}>
          <X size={14} />
        </IconButton>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="flex items-center gap-2">
          <Badge tone="brass">{node.type}</Badge>
          {data.status === "done" && <Badge tone="green">{tr("node.done")}</Badge>}
          {data.status === "running" && <Badge tone="violet">{tr("node.running")}</Badge>}
          {data.status === "error" && <Badge tone="red">{tr("node.failed")}</Badge>}
        </div>

        {node.type === "prompt" && (
          <Field label={tr("node.prompt")}>
            <Textarea
              rows={7}
              value={data.text ?? ""}
              onChange={(event) => onPatch(node.id, { text: event.target.value })}
              placeholder={tr("node.promptPlaceholder")}
            />
          </Field>
        )}

        {node.type === "image" && (
          <div className="space-y-3">
            {data.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={withBasePath(data.imageUrl)} alt="" className="w-full rounded-lg border border-ink-700" />
            )}
            <p className="text-[11.5px] leading-relaxed text-ink-500">{tr("node.uploadHint")}</p>
          </div>
        )}

        {node.type === "generate" && (
          <>
            <Field label={tr("node.model")}>
              <Select
                value={data.modelId ?? ""}
                onChange={(event) => onPatch(node.id, event.target.value.startsWith("iooai:") ? { modelId: event.target.value, duration: 10, resolution: "720p", aspect: "16:9" } : { modelId: event.target.value })}
              >
                <option value="">{options.length ? "—" : tr("node.noModel")}</option>
                {options.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={tr("node.prompt")}>
              <Textarea
                rows={4}
                value={data.prompt ?? ""}
                onChange={(event) => onPatch(node.id, { prompt: event.target.value })}
                placeholder={tr("node.promptPlaceholder")}
              />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label={tr("node.aspect")}>
                <Select
                  value={data.aspect ?? "16:9"}
                  onChange={(event) => onPatch(node.id, { aspect: event.target.value })}
                >
                  {["16:9", "9:16", "1:1", "4:5", "3:2", "2:3"].map((ratio) => (
                    <option key={ratio} value={ratio}>
                      {ratio}
                    </option>
                  ))}
                </Select>
              </Field>
              {kind === "video" ? (
                <Field label={tr("node.duration")}>
                  <Select
                    value={data.duration ?? 6}
                    onChange={(event) => onPatch(node.id, { duration: Number(event.target.value) })}
                  >
                    {durationOptions(modelId).map((seconds) => (
                      <option key={seconds} value={seconds}>
                        {seconds} {tr("node.seconds")}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : (
                <Field label={tr("node.seed")}>
                  <Input
                    type="number"
                    value={data.seed ?? ""}
                    placeholder={tr("node.random")}
                    onChange={(event) => onPatch(node.id, { seed: Number(event.target.value) })}
                  />
                </Field>
              )}
            </div>
          </>
        )}

        {node.type === "upscale" && (
          <>
            <Field label={tr("node.model")}>
              <Select
                value={data.modelId ?? ""}
                onChange={(event) => onPatch(node.id, event.target.value.startsWith("iooai:") ? { modelId: event.target.value, duration: 10, resolution: "720p", aspect: "16:9" } : { modelId: event.target.value })}
              >
                <option value="">{options.length ? "—" : tr("node.noModel")}</option>
                {options.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tr("node.upscale")}>
              <div className="flex gap-1.5">
                {[2, 4, 8].map((scale) => (
                  <button
                    key={scale}
                    onClick={() => onPatch(node.id, { scale })}
                    className={clsx(
                      "flex-1 rounded-md border py-1.5 text-[12px] transition",
                      (data.scale ?? 2) === scale
                        ? "border-brass-500/70 bg-brass-700/20 text-brass-300"
                        : "border-ink-700 text-ink-400 hover:border-ink-500",
                    )}
                  >
                    ×{scale}
                  </button>
                ))}
              </div>
            </Field>
          </>
        )}

        {node.type === "train" && (
          <>
            <Field label="Tên model">
              <Input
                value={data.name ?? ""}
                onChange={(event) => onPatch(node.id, { name: event.target.value })}
              />
            </Field>
            <Field label={tr("node.model")}>
              <Select
                value={data.modelId ?? ""}
                onChange={(event) => onPatch(node.id, event.target.value.startsWith("iooai:") ? { modelId: event.target.value, duration: 10, resolution: "720p", aspect: "16:9" } : { modelId: event.target.value })}
              >
                <option value="">{options.length ? "—" : tr("node.noModel")}</option>
                {options.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Steps">
              <Input
                type="number"
                value={data.steps ?? 1000}
                onChange={(event) => onPatch(node.id, { steps: Number(event.target.value) })}
              />
            </Field>
          </>
        )}

        {data.error && (
          <p className="rounded-lg bg-red-950/50 px-2.5 py-2 text-[11.5px] leading-relaxed text-red-300">
            {data.error}
          </p>
        )}

        {result && result.url && (
          <div className="space-y-2">
            <div className="overflow-hidden rounded-lg border border-ink-700">
              {result.kind === "video" ? (
                <video src={withBasePath(result.url)} controls className="w-full" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={withBasePath(result.url)} alt="" className="w-full" />
              )}
            </div>
            <div className="flex gap-1.5">
              <a
                href={withBasePath(result.url)}
                download
                className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink-700 text-[12px] text-ink-200 transition hover:border-ink-500 hover:bg-ink-800"
              >
                <Download size={13} />
                {tr("common.download")}
              </a>
              <IconButton
                label={tr("common.copy")}
                onClick={() => {
                  navigator.clipboard.writeText(result.url);
                  toast(tr("toast.copied"), "success");
                }}
              >
                <Copy size={14} />
              </IconButton>
            </div>
          </div>
        )}

        {node.type === "result" && !result && (
          <p className="text-[12px] leading-relaxed text-ink-500">
            Nối một khối kết quả vào để xem trước và tải về.
          </p>
        )}
      </div>

      {!["prompt", "image", "result"].includes(node.type ?? "") && (
        <div className="border-t border-ink-700/60 p-3">
          <Button variant="primary" className="w-full" onClick={onRun}>
            <Play size={13.5} />
            {tr("node.run")}
          </Button>
        </div>
      )}
    </aside>
  );
}
