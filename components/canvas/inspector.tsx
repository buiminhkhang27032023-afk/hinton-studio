"use client";

import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { withBasePath } from "@/lib/base-path";

import { Copy, Download, Film, Image as ImageIcon, Loader2, Play, Sparkles, Upload, X, ZoomIn } from "lucide-react";
import clsx from "clsx";
import { useStudio } from "@/lib/studio-store";
import { useUi } from "@/lib/ui-store";
import type { StudioNode, StudioNodeData } from "@/lib/execute";
import { Badge, Button, Field, IconButton, Input, Select, Textarea } from "@/components/ui/primitives";
import { PROVIDER_METAS, resolveProvider, durationOptions, getDefaultDuration, type ProviderId } from "@/lib/provider-meta";
import type { Edge } from "@xyflow/react";
import { MasterPromptSection } from "./master-prompt-section";
import { MentionTextarea, getConnectedImageTags } from "./nodes";

export function Inspector({
  node,
  nodes = [],
  edges = [],
  onPatch,
  onRun,
  onReuse,
  onClose,
}: {
  node: StudioNode | null;
  nodes?: StudioNode[];
  edges?: Edge[];
  onPatch: (id: string, patch: Partial<StudioNodeData>) => void;
  onRun: () => void;
  onReuse?: (url: string, kind?: "image" | "video") => void;
  onClose: () => void;
}) {
  const imageTags = useMemo(
    () => (node ? getConnectedImageTags(node.id, nodes, edges) : []),
    [node, nodes, edges],
  );
  const { tr, toast, openLightbox } = useUi();
  const models = useStudio((s) => s.models);
  const [providerFilter, setProviderFilter] = useState<ProviderId>("all");
  const [familyFilter, setFamilyFilter] = useState<string>("all");
  const lastRunTimeRef = useRef(0);

  const handleImmediateRun = useCallback(
    (e?: React.SyntheticEvent) => {
      if (e) e.preventDefault();
      const now = Date.now();
      if (now - lastRunTimeRef.current < 400) return;
      lastRunTimeRef.current = now;
      onRun();
    },
    [onRun],
  );

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
    const availDurations = durationOptions(id);
    const mid = id.toLowerCase();

    // Preserve duration if supported by new model, else default to model's best fit
    let dur = data.duration;
    if (!dur || !availDurations.includes(dur)) {
      dur = getDefaultDuration(id);
      if (!availDurations.includes(dur)) {
        dur = availDurations[availDurations.length - 1] ?? 10;
      }
    }

    // Auto-detect aspect ratio from prompt if prompt explicitly specifies 9:16 / dọc or 16:9
    let aspect = data.aspect ?? "16:9";
    const p = (data.prompt || data.text || "").toLowerCase();
    if (p.includes("9:16") || p.includes("dọc") || p.includes("vertical") || p.includes("tiktok") || p.includes("reels") || p.includes("shorts")) {
      aspect = "9:16";
    } else if (p.includes("16:9") || p.includes("ngang") || p.includes("landscape")) {
      aspect = "16:9";
    }

    if (id.startsWith("iooai:")) {
      onPatch(node.id, {
        modelId: id,
        duration: dur,
        resolution: data.resolution ?? "720p",
        aspect,
      });
    } else if (id.includes("piapi")) {
      const pDur = Math.min(15, Math.max(4, dur));
      onPatch(node.id, {
        modelId: id,
        duration: pDur,
        resolution: data.resolution ?? "480p",
        aspect,
      });
    } else if (id.includes("veo")) {
      const vDur = [4, 6, 8].includes(dur) ? dur : 6;
      onPatch(node.id, {
        modelId: id,
        duration: vDur,
        aspect,
      });
    } else {
      onPatch(node.id, { modelId: id, duration: dur, aspect });
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
      duration: nextKind === "video" ? getDefaultDuration(chosen?.id) : undefined,
    });
  };

  const handleFamilyChange = (fam: string) => {
    setFamilyFilter(fam);
    if (fam === "all") return;
    const matching = options.filter((m) => {
      const s = `${m.id} ${m.label}`.toLowerCase();
      if (fam === "kling") return s.includes("kling");
      if (fam === "wan") return s.includes("wan");
      if (fam === "seedance") return s.includes("seedance");
      if (fam === "minimax") return s.includes("minimax") || s.includes("hailuo");
      if (fam === "vidu") return s.includes("vidu");
      return true;
    });
    if (matching.length > 0) {
      const hasInCurrent = providerFilter !== "all" && matching.some((m) => resolveProvider(m) === providerFilter);
      if (!hasInCurrent) {
        setProviderFilter("all");
      }
      if (!currentModel || !matching.some((m) => m.id === currentModel.id)) {
        applyModelPatch(matching[0].id);
      }
    }
  };

  const familyFilteredOptions = options.filter((m) => {
    if (familyFilter === "all") return true;
    const s = `${m.id} ${m.label}`.toLowerCase();
    if (familyFilter === "kling") return s.includes("kling");
    if (familyFilter === "wan") return s.includes("wan");
    if (familyFilter === "seedance") return s.includes("seedance");
    if (familyFilter === "minimax") return s.includes("minimax") || s.includes("hailuo");
    if (familyFilter === "vidu") return s.includes("vidu");
    return true;
  });

  const filteredOptions = providerFilter === "all"
    ? familyFilteredOptions
    : familyFilteredOptions.filter((m) => resolveProvider(m) === providerFilter);

  const activeMeta = PROVIDER_METAS.find((p) => p.id === (currentModel ? resolveProvider(currentModel) : "openai-compatible")) ?? PROVIDER_METAS[5];

  return (
    <aside className="absolute right-3 top-3 z-30 flex max-h-[min(680px,calc(100%-1.5rem))] w-[324px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141414]/95 shadow-[0_18px_50px_rgba(0,0,0,.65)]">
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
              <video src={withBasePath(data.videoUrl)} controls preload="metadata" className="w-full rounded-lg border border-ink-700" />
            ) : data.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img loading="lazy" decoding="async" src={withBasePath(data.imageUrl)} alt="" className="w-full rounded-lg border border-ink-700" />
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

            {/* Quick Family Filter for Video */}
            {kind === "video" && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-ink-300">Dòng Model Nhanh</span>
                <div className="flex flex-wrap items-center gap-1">
                  {[
                    { id: "all", label: "Tất cả" },
                    { id: "kling", label: "🎬 Kling AI" },
                    { id: "wan", label: "🟠 Wan 2.7" },
                    { id: "seedance", label: "⚡ Seedance" },
                    { id: "minimax", label: "🌟 MiniMax" },
                    { id: "vidu", label: "✨ Vidu" },
                  ].map((f) => {
                    const active = familyFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleFamilyChange(f.id)}
                        className={clsx(
                          "rounded-lg px-2 py-0.5 text-[11px] font-medium transition",
                          active
                            ? "border border-amber-400/40 bg-amber-400/20 text-amber-300 shadow-sm"
                            : "border border-white/5 bg-white/5 text-neutral-400 hover:border-white/10 hover:bg-white/10 hover:text-white",
                        )}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
                    const groupModels = filteredOptions.filter((m) => resolveProvider(m) === p.id);
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
              <MentionTextarea
                className="field nodrag min-h-[96px] w-full text-[12.5px]"
                rows={4}
                value={data.prompt ?? ""}
                onChange={(val) => {
                  const patch: Partial<StudioNodeData> = { prompt: val };
                  const lower = val.toLowerCase();
                  if (lower.includes("9:16") || lower.includes("dọc") || lower.includes("vertical") || lower.includes("tiktok")) {
                    if (data.aspect !== "9:16") patch.aspect = "9:16";
                  } else if (lower.includes("16:9") || lower.includes("ngang") || lower.includes("landscape")) {
                    if (data.aspect !== "16:9") patch.aspect = "16:9";
                  }
                  if (lower.includes("15s") || lower.includes("15 giây")) {
                    if (durationOptions(modelId).includes(15) && data.duration !== 15) patch.duration = 15;
                  }
                  onPatch(node.id, patch);
                }}
                placeholder={tr("node.promptPlaceholder")}
                tags={imageTags}
              />
              {kind === "video" && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                  <span className="text-[11px] text-ink-400">Gợi ý vũ đạo:</span>
                  <button
                    type="button"
                    onClick={() =>
                      onPatch(node.id, {
                        prompt:
                          "Nhân vật nhảy nhí nhảnh dễ thương theo điệu nhạc, hai tay lắc lư nhịp nhàng trước ngực, nghiêng đầu mỉm cười duyên dáng trước ống kính, chuyển động mượt mà tự nhiên, ánh sáng mềm mại, 4k.",
                        aspect: "9:16",
                        duration: durationOptions(modelId).includes(15) ? 15 : data.duration ?? 5,
                      })
                    }
                    className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300 hover:bg-amber-500/20 transition-colors"
                  >
                    💃 Nhảy TikTok (9:16)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onPatch(node.id, {
                        prompt:
                          "Người mẫu sải bước catwalk tự tin, tà áo và váy bay bổng uyển chuyển, chuyển động mượt mà tự nhiên, góc máy quay chậm điện ảnh, ánh sáng runway thời trang cao cấp, 4k.",
                        aspect: "9:16",
                      })
                    }
                    className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[11px] font-medium text-purple-300 hover:bg-purple-500/20 transition-colors"
                  >
                    👠 Catwalk thời trang
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onPatch(node.id, {
                        prompt:
                          "Người mẫu từ từ xoay người 360 độ tạo dáng lookbook, khoe trọn phom dáng trang phục, nụ cười tươi tắn trước ống kính, ánh sáng studio sang trọng, 4k.",
                        aspect: "9:16",
                      })
                    }
                    className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                  >
                    ✨ Xoay người Lookbook
                  </button>
                </div>
              )}
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

            {/* RunningHub ComfyUI Custom Workflow ID */}
            {currentModel?.provider === "runninghub" &&
              (String(modelId).includes("mimicmotion") ||
                String(modelId).includes("animate") ||
                String(modelId).includes("comfyui")) && (
                <Field label="Mã Workflow ID (RunningHub)">
                  <Input
                    type="text"
                    value={(data.workflowId as string) ?? ""}
                    placeholder="vd: 1904136902449209346 (lấy từ URL web)"
                    onChange={(event) =>
                      onPatch(node.id, { workflowId: event.target.value.trim() })
                    }
                  />
                  <div className="mt-1.5 space-y-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-[11px] leading-relaxed text-amber-300/90">
                    <p>
                      ⚠️ Model này cần Workflow riêng trên tài khoản RunningHub của bạn. Nếu chưa tạo workflow riêng, hãy chuyển sang Kling 2.6 Pro:
                    </p>
                    <button
                      type="button"
                      onClick={() => onPatch(node.id, { modelId: "runninghub:kling-2.6-pro", workflowId: "" })}
                      className="inline-flex items-center gap-1 rounded bg-emerald-600/30 px-2 py-1 font-semibold text-emerald-300 hover:bg-emerald-600/50 hover:text-emerald-200 transition-colors"
                    >
                      ⚡ Chuyển sang Kling 2.6 Pro (Chạy ngay từ ví ¥21.3)
                    </button>
                  </div>
                </Field>
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
              <MentionTextarea
                className="field nodrag min-h-[80px] w-full text-[12.5px]"
                rows={3}
                value={data.prompt ?? ""}
                onChange={(val) => onPatch(node.id, { prompt: val })}
                placeholder="Mô tả dáng đứng hoặc phong cách phối..."
                tags={imageTags}
              />
            </Field>
          </div>
        )}

        {data.error && (
          <p className="rounded-lg bg-red-950/50 px-2.5 py-2 text-[11.5px] leading-relaxed text-red-300">
            {data.error}
          </p>
        )}

        {result && result.url && (() => {
          const mediaKind: "image" | "video" = result.kind === "video" ? "video" : "image";
          return (
          <div className="space-y-2">
            <div
              className="group relative cursor-pointer overflow-hidden rounded-lg border border-ink-700 transition hover:border-ink-500"
              onClick={() => {
                openLightbox({
                  url: result.url,
                  kind: mediaKind,
                  title: data.name || node.data?.name || "Kết quả",
                });
              }}
              title="Nhấp để phóng to xem chi tiết"
            >
              {mediaKind === "video" ? (
                <video src={withBasePath(result.url)} controls preload="metadata" className="w-full" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img loading="lazy" decoding="async" src={withBasePath(result.url)} alt="" className="w-full" />
              )}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                <span className="flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-[11.5px] font-medium text-white backdrop-blur-sm">
                  <ZoomIn size={13} />
                  Phóng to chi tiết
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  openLightbox({
                    url: result.url,
                    kind: mediaKind,
                    title: data.name || node.data?.name || "Kết quả",
                  });
                }}
                className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink-700 bg-ink-800/60 text-[12px] text-ink-200 transition hover:border-ink-500 hover:bg-ink-700 hover:text-white"
                title="Mở ảnh phóng to toàn màn hình"
              >
                <ZoomIn size={13} />
                Phóng to
              </button>
              {onReuse && (
                <button
                  type="button"
                  onClick={() => onReuse(result.url, mediaKind)}
                  className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-brass-500/40 bg-brass-500/10 text-[12px] font-medium text-brass-300 transition hover:bg-brass-500/20 hover:border-brass-400 hover:text-brass-200"
                  title="Dùng lại ảnh/video này làm khối đầu vào mới trên Canvas"
                >
                  <Sparkles size={13} />
                  Dùng lại
                </button>
              )}
              <a
                href={withBasePath(result.url)}
                download
                className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-ink-700 px-3 text-[12px] text-ink-200 transition hover:border-ink-500 hover:bg-ink-800 hover:text-white"
                title="Tải về máy"
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
          );
        })()}

        {node.type === "result" && !result && (
          <p className="text-[12px] leading-relaxed text-ink-500">
            Nối một khối kết quả vào để xem trước và tải về.
          </p>
        )}
      </div>

      {!["prompt", "image", "result"].includes(node.type ?? "") && (
        <div className="border-t border-ink-700/60 p-3">
          <Button
            variant="primary"
            className="w-full"
            disabled={data.status === "running"}
            onMouseDown={handleImmediateRun}
            onClick={handleImmediateRun}
          >
            {data.status === "running" ? (
              <Loader2 size={13.5} className="animate-spin" />
            ) : (
              <Play size={13.5} />
            )}
            {data.status === "running" ? "Đang xử lý…" : tr("node.run")}
          </Button>
        </div>
      )}
    </aside>
  );
}
