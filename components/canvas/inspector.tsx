"use client";

import { useEffect, useMemo, useState } from "react";
import { withBasePath } from "@/lib/base-path";

import { Copy, Download, Film, Image as ImageIcon, Play, Sparkles, Upload, X } from "lucide-react";
import clsx from "clsx";
import { useStudio } from "@/lib/studio-store";
import { useUi } from "@/lib/ui-store";
import type { StudioNode, StudioNodeData } from "@/lib/execute";
import { Badge, Button, Field, IconButton, Input, Select, Textarea } from "@/components/ui/primitives";
import { PROVIDER_METAS, resolveProvider, type ProviderId } from "@/lib/provider-meta";
import { MasterPromptSection } from "./master-prompt-section";

/** Allowed durations differ per video model */
function durationOptions(modelId?: string | null): number[] {
  if (modelId?.startsWith("iooai:")) return [10];
  if (modelId?.includes("veo")) return [4, 6, 8];
  if (modelId?.includes("piapi") || modelId?.includes("seedance")) {
    return Array.from({ length: 12 }, (_, i) => i + 4);
  }
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
  const [providerFilter, setProviderFilter] = useState<ProviderId>("all");

  const data = node?.data ?? {};
  const kind = node?.type === "upscale" ? "upscale" : node?.type === "train" ? "train" : (data.modelKind ?? "image");
  const options = models.filter((model) => model.kind === kind);
  const result = data.result;
  const modelId = data.modelId;
  const currentModel = models.find((m) => m.id === modelId);

  // Sync providerFilter when node or modelId changes
  useEffect(() => {
    if (currentModel) {
      const p = resolveProvider(currentModel);
      if (providerFilter !== "all" && providerFilter !== p) {
        setProviderFilter(p);
      }
    }
  }, [node?.id, modelId, currentModel, providerFilter]);

  if (!node) return null;

  const applyModelPatch = (id: string) => {
    if (!id) {
      onPatch(node.id, { modelId: "" });
      return;
    }
    if (id.startsWith("iooai:")) {
      onPatch(node.id, {
        modelId: id,
        duration: 10,
        resolution: "720p",
        aspect: data.aspect ?? "16:9",
      });
    } else if (id.includes("piapi")) {
      const dur = data.duration && data.duration >= 4 && data.duration <= 15 ? data.duration : 5;
      onPatch(node.id, {
        modelId: id,
        duration: dur,
        resolution: data.resolution ?? "480p",
        aspect: data.aspect ?? "16:9",
      });
    } else if (id.includes("veo")) {
      const dur = [4, 6, 8].includes(data.duration ?? 0) ? data.duration : 6;
      onPatch(node.id, {
        modelId: id,
        duration: dur,
        aspect: data.aspect ?? "16:9",
      });
    } else {
      onPatch(node.id, { modelId: id });
    }
  };

  const handleProviderChange = (newProvider: ProviderId) => {
    setProviderFilter(newProvider);
    if (newProvider === "all") return;
    const provModels = options.filter((m) => resolveProvider(m) === newProvider);
    if (provModels.length > 0) {
      if (!currentModel || resolveProvider(currentModel) !== newProvider) {
        applyModelPatch(provModels[0].id);
      }
    }
  };

  const handleModelChange = (newId: string) => {
    applyModelPatch(newId);
    const chosen = models.find((m) => m.id === newId);
    if (chosen) {
      const p = resolveProvider(chosen);
      if (providerFilter !== "all" && providerFilter !== p) {
        setProviderFilter(p);
      }
    }
  };

  const handleKindChange = (nextKind: "video" | "image") => {
    const nextModels = models.filter((m) => m.kind === nextKind);
    const provModels = providerFilter === "all" ? nextModels : nextModels.filter((m) => resolveProvider(m) === providerFilter);
    const chosen = provModels[0] ?? nextModels[0];
    onPatch(node.id, {
      modelKind: nextKind,
      modelId: chosen?.id ?? (nextKind === "video" ? "iooai:omni_flash_10s" : "seed:image:gpt-image"),
      duration: nextKind === "video" ? (chosen?.id?.startsWith("iooai:") ? 10 : 6) : undefined,
    });
  };

  const filteredOptions = providerFilter === "all"
    ? options
    : options.filter((m) => resolveProvider(m) === providerFilter);

  const activeMeta = PROVIDER_METAS.find((p) => p.id === (currentModel ? resolveProvider(currentModel) : "openai-compatible")) ?? PROVIDER_METAS[5];

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
          <div className="space-y-3">
            <Field label={tr("node.prompt")}>
              <Textarea
                rows={6}
                value={data.text ?? ""}
                onChange={(event) => onPatch(node.id, { text: event.target.value })}
                placeholder={tr("node.promptPlaceholder")}
              />
            </Field>
            <MasterPromptSection
              nodeId={node.id}
              data={data}
              onPatch={onPatch}
            />
          </div>
        )}

        {node.type === "prompt_master" && (
          <div className="space-y-3">
            <Field label="Ý tưởng / Câu lệnh cần hoàn thiện">
              <Textarea
                rows={6}
                value={data.text ?? data.prompt ?? ""}
                onChange={(event) => onPatch(node.id, { text: event.target.value, prompt: event.target.value })}
                placeholder="Nhập ý tưởng thô cần AI Bậc Thầy tối ưu hóa..."
              />
            </Field>
            <MasterPromptSection
              nodeId={node.id}
              data={data}
              onPatch={onPatch}
            />
          </div>
        )}

        {node.type === "image" && (
          <div className="space-y-3">
            {data.videoUrl ? (
              <video src={withBasePath(data.videoUrl)} controls className="w-full rounded-lg border border-ink-700" />
            ) : data.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={withBasePath(data.imageUrl)} alt="" className="w-full rounded-lg border border-ink-700" />
            ) : null}
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 py-2 text-[12px] font-medium text-white transition hover:bg-white/20">
                <Upload size={13} />
                Tải ảnh hoặc video mới
                <input
                  type="file"
                  accept="image/*,video/*"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      const { api } = await import("@/lib/api-client");
                      const asset = await api.assets.upload(f);
                      const isVid = f.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(f.name);
                      if (isVid) {
                        onPatch(node.id, { videoUrl: asset.url, imageUrl: undefined, result: asset, name: f.name });
                      } else {
                        onPatch(node.id, { imageUrl: asset.url, videoUrl: undefined, result: asset, name: f.name });
                      }
                      toast("Đã tải lên tệp thành công", "success");
                    } catch (err) {
                      toast(err instanceof Error ? err.message : "Tải lên thất bại", "error");
                    }
                  }}
                />
              </label>
              <p className="text-[11px] leading-relaxed text-ink-500">
                💡 Bạn cũng có thể kéo thả trực tiếp file từ máy tính vào canvas, hoặc chụp màn hình rồi bấm <b>Ctrl + V</b> để dán ngay!
              </p>
            </div>
          </div>
        )}

        {node.type === "generate" && (
          <>
            {/* Kind Switcher (Video / Image) */}
            <Field label="Loại nội dung tạo">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleKindChange("video")}
                  className={clsx(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[11.5px] font-medium transition",
                    kind === "video"
                      ? "border-brass-500/70 bg-brass-700/20 text-brass-300"
                      : "border-ink-700 text-ink-400 hover:border-ink-500",
                  )}
                >
                  <Film size={12} />
                  Video AI
                </button>
                <button
                  type="button"
                  onClick={() => handleKindChange("image")}
                  className={clsx(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[11.5px] font-medium transition",
                    kind === "image"
                      ? "border-brass-500/70 bg-brass-700/20 text-brass-300"
                      : "border-ink-700 text-ink-400 hover:border-ink-500",
                  )}
                >
                  <ImageIcon size={12} />
                  Ảnh AI
                </button>
              </div>
            </Field>

            {/* Provider Filter */}
            <Field label="Nguồn (Provider)">
              <Select
                value={providerFilter}
                onChange={(event) => handleProviderChange(event.target.value as ProviderId)}
              >
                <option value="all">🌐 Tất cả nguồn ({options.length} model)</option>
                {PROVIDER_METAS.filter((p) => p.id !== "all").map((p) => {
                  const count = options.filter((m) => resolveProvider(m) === p.id).length;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.icon} {p.short} ({count} model)
                    </option>
                  );
                })}
              </Select>
            </Field>

            {/* Model Select */}
            <Field label={tr("node.model")}>
              <Select
                value={data.modelId ?? ""}
                onChange={(event) => handleModelChange(event.target.value)}
              >
                <option value="">{filteredOptions.length ? "— Chọn model —" : tr("node.noModel")}</option>
                {providerFilter === "all" ? (
                  PROVIDER_METAS.filter((p) => p.id !== "all").map((p) => {
                    const groupModels = options.filter((m) => resolveProvider(m) === p.id);
                    if (groupModels.length === 0) return null;
                    return (
                      <optgroup key={p.id} label={`── ${p.icon} ${p.short} (${groupModels.length}) ──`}>
                        {groupModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })
                ) : (
                  filteredOptions.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))
                )}
              </Select>
            </Field>

            {/* Active Provider Tag & Model Description */}
            {currentModel && (
              <div className="rounded-lg border border-ink-800 bg-ink-900/60 p-2 text-[11px] leading-relaxed text-ink-300">
                <div className="flex items-center justify-between border-b border-ink-800/60 pb-1 font-medium">
                  <span className="flex items-center gap-1.5 text-white/90">
                    <span>{activeMeta.icon}</span>
                    <span>Nguồn: {activeMeta.short}</span>
                  </span>
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9.5px] uppercase tracking-wide text-ink-400">
                    {currentModel.kind}
                  </span>
                </div>
                {currentModel.description && (
                  <p className="mt-1 line-clamp-3 text-[10.5px] text-ink-400">
                    {currentModel.description}
                  </p>
                )}
              </div>
            )}

            <Field label={tr("node.prompt")}>
              <Textarea
                rows={4}
                value={data.prompt ?? ""}
                onChange={(event) => onPatch(node.id, { prompt: event.target.value })}
                placeholder={tr("node.promptPlaceholder")}
              />
            </Field>

            <MasterPromptSection
              nodeId={node.id}
              data={data}
              onPatch={onPatch}
              kind={kind === "video" ? "video" : "image"}
            />

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

            {/* Video Resolution & Mode Options */}
            {kind === "video" && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Độ phân giải">
                  <Select
                    value={currentModel?.provider === "iooai" ? (data.resolution === "1080p" ? "1080p" : "720p") : data.resolution ?? "480p"}
                    onChange={(event) => onPatch(node.id, { resolution: event.target.value })}
                  >
                    {currentModel?.provider !== "iooai" && <option value="480p">480p (Tiết kiệm)</option>}
                    <option value="720p">720p (HD)</option>
                    <option value="1080p">1080p (FHD)</option>
                  </Select>
                </Field>

                {currentModel?.provider === "piapi" && (
                  <Field label="Chế độ PiAPI">
                    <Select
                      value={data.piapiMode ?? "default"}
                      onChange={(event) => onPatch(node.id, { piapiMode: event.target.value })}
                    >
                      <option value="default">Tự động / Text-to-Video</option>
                      <option value="first_last_frames">Ảnh đầu cuối (2 ảnh)</option>
                      <option value="omni_reference">Tham chiếu ảnh (1-9)</option>
                    </Select>
                  </Field>
                )}
              </div>
            )}
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

        
        {node.type === "fashion_compose" && (
          <div className="space-y-3">
            <div className="rounded-lg border border-sky-400/30 bg-sky-500/10 p-2.5 text-[11.5px] leading-relaxed text-sky-200">
              💡 Đây là khối <b>Ghép Lookbook 60:40</b> (dùng cắt ghép video có sẵn). Nếu bạn muốn <b>DÙNG MODEL AI ĐỂ TẠO VIDEO TRỰC TIẾP TỪ ẢNH</b>, hãy bấm nút dưới:
            </div>
            <button
              type="button"
              onClick={() =>
                onPatch(node.id, {
                  _type: "generate",
                  modelKind: "video",
                  modelId: "iooai:omni_flash_10s",
                  aspect: "9:16",
                  duration: 10,
                  resolution: "720p",
                  prompt: "Người mẫu mặc trang phục sải bước tự tin, phong cách lookbook thời trang cao cấp.",
                  status: "idle",
                  error: null,
                } as any)
              }
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brass-500 py-2 text-[12px] font-medium text-black shadow-lg hover:bg-brass-400"
            >
              <Play size={13} />
              Đổi sang Tạo Video AI (Chọn Model)
            </button>
            <Field label="Tiêu đề chính">
              <Input
                value={data.headline ?? "HÃY NHỚ"}
                onChange={(event) => onPatch(node.id, { headline: event.target.value })}
                placeholder="HÃY NHỚ"
              />
            </Field>
            <Field label="Tiêu đề phụ">
              <Input
                value={data.subheadline ?? "Bí quyết phối đồ"}
                onChange={(event) => onPatch(node.id, { subheadline: event.target.value })}
                placeholder="Bí quyết phối đồ"
              />
            </Field>
          </div>
        )}

        {node.type === "fashion_tryon" && (
          <div className="space-y-3">
            <Field label={tr("node.model")}>
              <Select
                value={data.modelId ?? "seed:image:gemini-compose"}
                onChange={(event) => onPatch(node.id, { modelId: event.target.value })}
              >
                <option value="seed:image:gemini-compose">Gemini Thử Đồ (Khuyến nghị)</option>
                <option value="seed:image:fashion-tryon">Thử Đồ AI (GPT Image)</option>
              </Select>
            </Field>
            <Field label={tr("node.prompt")}>
              <Textarea
                rows={3}
                value={data.prompt ?? ""}
                onChange={(event) => onPatch(node.id, { prompt: event.target.value })}
                placeholder="Mô tả dáng đứng hoặc phong cách phối..."
              />
            </Field>
          </div>
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
