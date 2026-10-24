"use client";

import { withBasePath } from "@/lib/base-path";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BrainCircuit,
  Clapperboard,
  Clock,
  Copy,
  ImagePlus,
  Layers,
  Loader2,
  Play,
  Plus,
  ScanEye,
  Sparkles,
  UserRound,
  Wand2,
  X,
} from "lucide-react";
import clsx from "clsx";
import { api, type LookPreset, type MemoryEntry } from "@/lib/api-client";
import { useUi } from "@/lib/ui-store";
import { useStudio } from "@/lib/studio-store";
import { allowedDurations, planScenes } from "@/lib/scene-plan";
import type { Asset, ProjectSummary } from "@/lib/types";
import { Badge, Button, Field, Input, Modal, Select, Spinner, Textarea } from "@/components/ui/primitives";

const DRAFT_KEY = "hinton:quick-draft-v3";

const STYLE_PRESETS = [
  { id: "cinematic", label: "Điện ảnh 35mm", text: "shot on 35mm film, cinematic colour grading, shallow depth of field, natural grain" },
  { id: "editorial", label: "Editorial", text: "high fashion editorial photography, soft directional light, muted elegant palette" },
  { id: "golden", label: "Golden hour", text: "warm golden hour sunlight, soft rim light, dreamy atmosphere" },
  { id: "neon", label: "Neon đêm", text: "neon-lit night scene, wet reflections, anamorphic lens flare, high contrast" },
  { id: "minimal", label: "Studio tối giản", text: "clean studio backdrop, softbox lighting, minimal composition, luxury catalogue" },
  { id: "custom", label: "Tự viết…", text: "" },
];

interface Scene {
  id: string;
  title: string;
  prompt: string;
  seconds: number;
  imageUrl?: string;
  status: "idle" | "queued" | "running" | "done" | "error";
  error?: string | null;
  result?: Asset | null;
}

function newScene(index: number, seconds = 6): Scene {
  return {
    id: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: `Cảnh ${index + 1}`,
    prompt: "",
    seconds,
    status: "idle",
  };
}

export default function QuickVideoPage() {
  const { tr, toast } = useUi();
  const router = useRouter();
  const models = useStudio((s) => s.models);
  const videoModels = useMemo(() => models.filter((model) => model.kind === "video"), [models]);

  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [modelId, setModelId] = useState("");
  const [aspect, setAspect] = useState("16:9");
  const [scenes, setScenes] = useState<Scene[]>([newScene(0)]);
  const [running, setRunning] = useState(false);
  const [stopRequested, setStopRequested] = useState(false);
  const [projectAssets, setProjectAssets] = useState<Asset[]>([]);
  const stopRef = useRef(false);

  // Continuity
  const [presets, setPresets] = useState<LookPreset[]>([]);
  const [presetId, setPresetId] = useState("");
  const [characters, setCharacters] = useState<MemoryEntry[]>([]);
  const [characterId, setCharacterId] = useState("");
  const [wardrobe, setWardrobe] = useState("");
  const [location, setLocation] = useState("");
  const [styleId, setStyleId] = useState("cinematic");
  const [customStyle, setCustomStyle] = useState("");
  const [anchorUrl, setAnchorUrl] = useState<string | undefined>();
  const [useAnchor, setUseAnchor] = useState(true);
  const [lockSeed, setLockSeed] = useState(true);
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));

  // Planning
  const [totalSeconds, setTotalSeconds] = useState(12);
  const [idea, setIdea] = useState("");
  const [planning, setPlanning] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [anchorBusy, setAnchorBusy] = useState(false);

  /* ------------------------------- data --------------------------------- */

  useEffect(() => {
    let savedPrjId: string | null = null;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.projectId === "string") savedPrjId = parsed.projectId;
      }
    } catch {}

    api.projects
      .list()
      .then((list) => {
        if (savedPrjId) {
          const found = list.find((p) => p.id === savedPrjId);
          if (found) {
            setProject(found);
            return;
          }
        }
        const existing = list.find((p) => p.name === "Video nhanh");
        if (existing) {
          setProject(existing);
        } else {
          api.projects.create("Video nhanh").then(setProject).catch(() => {});
        }
      })
      .catch(() => {
        api.projects.create("Video nhanh").then(setProject).catch(() => {});
      });

    api.memory.list("character").then(setCharacters).catch(() => {});
    api.presets.list().then(setPresets).catch(() => {});
  }, []);

  useEffect(() => {
    if (!project?.id) return;
    api.assets.list(project.id).then(setProjectAssets).catch(() => {});
  }, [project?.id]);

  useEffect(() => {
    if (!modelId && videoModels.length) {
      const preferred = videoModels.find((model) => model.id.includes("veo")) ?? videoModels[0];
      setModelId(preferred.id);
    }
  }, [modelId, videoModels]);

  // Draft
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Record<string, unknown>;
      if (Array.isArray(saved.scenes) && saved.scenes.length) {
        setScenes(
          (saved.scenes as Scene[]).map((scene) => ({
            ...scene,
            status: scene.status === "running" || scene.status === "queued" ? "idle" : scene.status,
          })),
        );
      }
      for (const key of ["modelId", "aspect", "characterId", "wardrobe", "location", "styleId", "customStyle", "idea"] as const) {
        const value = saved[key];
        if (typeof value === "string") {
          if (key === "modelId") setModelId(value);
          else if (key === "aspect") setAspect(value);
          else if (key === "characterId") setCharacterId(value);
          else if (key === "wardrobe") setWardrobe(value);
          else if (key === "location") setLocation(value);
          else if (key === "styleId") setStyleId(value);
          else if (key === "customStyle") setCustomStyle(value);
          else if (key === "idea") setIdea(value);
        }
      }
      if (typeof saved.anchorUrl === "string") setAnchorUrl(saved.anchorUrl);
      if (typeof saved.totalSeconds === "number") setTotalSeconds(saved.totalSeconds);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        projectId: project?.id,
        modelId, aspect, scenes, characterId, wardrobe, location,
        styleId, customStyle, anchorUrl, totalSeconds, idea,
      }),
    );
  }, [project?.id, modelId, aspect, scenes, characterId, wardrobe, location, styleId, customStyle, anchorUrl, totalSeconds, idea]);

  /* ---------------------------- continuity ------------------------------- */

  const character = characters.find((item) => item.id === characterId) ?? null;
  const preset = presets.find((item) => item.id === presetId) ?? null;
  const style = STYLE_PRESETS.find((item) => item.id === styleId) ?? STYLE_PRESETS[0];
  const styleText = styleId === "custom" ? customStyle.trim() : style.text;

  /** The block repeated in every scene prompt — this is what stops drift. */
  const continuityBlock = useMemo(() => {
    const parts: string[] = [];
    if (character) parts.push(`SAME CHARACTER in every shot: ${character.description}`);
    if (wardrobe.trim()) parts.push(`Wardrobe: ${wardrobe.trim()}.`);
    if (location.trim()) parts.push(`Location: ${location.trim()}.`);
    if (styleText) parts.push(`Style: ${styleText}.`);
    parts.push(
      "Keep the same face, hairstyle, body, outfit and lighting across all shots. Consistent colour grade. No text overlays.",
    );
    return parts.join(" ");
  }, [character, location, styleText, wardrobe]);

  const composePrompt = useCallback(
    (scene: Scene) => [scene.prompt.trim(), continuityBlock].filter(Boolean).join(" "),
    [continuityBlock],
  );

  /* ------------------------------ planning ------------------------------- */

  const plan = useMemo(() => planScenes(totalSeconds, modelId), [totalSeconds, modelId]);
  const planTotal = plan.reduce((sum, value) => sum + value, 0);
  const durations = allowedDurations(modelId);

  /** Let the AI write the shot list, then fit it to the planned clip lengths. */
  const writeScript = async () => {
    if (!idea.trim()) {
      toast("Hãy nhập ý tưởng trước.", "error");
      return;
    }
    setPlanning(true);
    try {
      const result = await api.script({
        idea,
        totalSeconds,
        modelId,
        presetId: presetId || undefined,
        characterId: characterId || undefined,
        styleText,
        wardrobe,
        location,
      });
      setScenes(
        result.scenes.map((scene, index) => ({
          ...newScene(index, scene.seconds),
          title: scene.title,
          prompt: scene.prompt,
        })),
      );
      toast(`Đã viết ${result.scenes.length} cảnh · ${result.totalSeconds}s`, "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Không viết được kịch bản", "error");
    } finally {
      setPlanning(false);
    }
  };

  const applyPlan = () => {
    setScenes(
      plan.map((seconds, index) => {
        const existing = scenes[index];
        return existing
          ? { ...existing, seconds, title: `Cảnh ${index + 1}` }
          : newScene(index, seconds);
      }),
    );
    toast(`Đã chia ${plan.length} cảnh · ${planTotal}s`, "success");
  };

  /* ------------------------------- running ------------------------------- */

  const patch = useCallback((id: string, value: Partial<Scene>) => {
    setScenes((current) => current.map((scene) => (scene.id === id ? { ...scene, ...value } : scene)));
  }, []);

  const runScene = useCallback(
    async (scene: Scene) => {
      if (!project || !modelId) return false;
      if (scene.status === "done" && scene.result) return true;
      if (!scene.prompt.trim()) {
        patch(scene.id, { status: "error", error: "Hãy nhập kịch bản cho cảnh này." });
        return false;
      }
      patch(scene.id, { status: "running", error: null });
      try {
        const reference = scene.imageUrl ?? (useAnchor ? anchorUrl : undefined);
        const response = await api.run({
          modelId,
          kind: "video",
          projectId: project.id,
          nodeId: scene.id,
          name: scene.title || "video",
          vars: {
            prompt: composePrompt(scene),
            image: reference ?? "",
            images: reference ? [reference] : [],
            duration: scene.seconds,
            aspect,
            size: aspect === "9:16" ? "720x1280" : "1280x720",
            seed: lockSeed ? seed : Math.floor(Math.random() * 1_000_000),
          },
        });
        if (response.error) throw new Error(response.error);
        const outputAsset = response.output ?? null;
        patch(scene.id, { status: "done", result: outputAsset });
        if (outputAsset) {
          setProjectAssets((current) => [outputAsset, ...current.filter((a) => a.id !== outputAsset.id)]);
        }
        return true;
      } catch (error) {
        patch(scene.id, { status: "error", error: error instanceof Error ? error.message : "Lỗi" });
        return false;
      }
    },
    [anchorUrl, aspect, composePrompt, lockSeed, modelId, patch, project, seed, useAnchor],
  );

  const runAll = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setStopRequested(false);
    stopRef.current = false;
    setScenes((current) => current.map((s) => (s.status === "done" && s.result ? s : { ...s, status: "queued" })));
    for (const scene of scenes) {
      if (stopRef.current) break;
      if (scene.status === "done" && scene.result) continue;
      // eslint-disable-next-line no-await-in-loop
      await runScene(scene);
    }
    setRunning(false);
  }, [runScene, running, scenes]);

  const uploadAnchor = async (file: File) => {
    setAnchorBusy(true);
    try {
      const asset = await api.assets.upload(file, project?.id ?? null);
      setAnchorUrl(asset.url);
      toast(tr("toast.uploaded"), "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Tải lên thất bại", "error");
    } finally {
      setAnchorBusy(false);
    }
  };

  /** Teach the system this face: vision model writes the reusable description. */
  const learnCharacter = async () => {
    if (!anchorUrl) {
      toast("Hãy tải ảnh nhân vật trước.", "error");
      return;
    }
    setAnchorBusy(true);
    try {
      const entry = await api.memory.analyze({ assetUrl: anchorUrl, kind: "character", projectId: project?.id });
      setCharacters((current) => [entry, ...current]);
      setCharacterId(entry.id);
      toast(`Đã học nhân vật: ${entry.name}`, "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Phân tích thất bại", "error");
    } finally {
      setAnchorBusy(false);
    }
  };

  const done = useMemo(() => {
    const list: Array<{ id: string; title: string; url: string }> = [];
    const seen = new Set<string>();
    for (const s of scenes) {
      if (s.result?.url && !seen.has(s.result.url)) {
        seen.add(s.result.url);
        list.push({ id: s.id, title: s.title, url: s.result.url });
      }
    }
    for (const a of projectAssets) {
      if (a.url && !seen.has(a.url)) {
        seen.add(a.url);
        list.push({ id: a.id, title: a.name, url: a.url });
      }
    }
    return list;
  }, [scenes, projectAssets]);
  const failed = scenes.filter((s) => s.status === "error").length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700/60 px-8 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-ink-750 hover:text-ink-100"
            aria-label="Quay lại"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="font-display text-[24px] leading-tight tracking-tight">Tạo video nhanh</h1>
            <p className="text-[12px] text-ink-400">
              Ý tưởng + thời lượng → hệ thống tự chia cảnh, giữ nhân vật đồng nhất.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brass">
            <Clock size={10} />
            {planTotal}s / {totalSeconds}s · {scenes.length} cảnh
          </Badge>
          {failed > 0 && <Badge tone="red">{failed} lỗi</Badge>}
          <Button variant="outline" size="sm" onClick={() => setBatchOpen(true)}>
            Dán kịch bản
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/canvas")}>
            <Clapperboard size={13} />
            Canvas
          </Button>
          {running ? (
            <Button variant="danger" size="sm" onClick={() => { setStopRequested(true); stopRef.current = true; }}>
              <X size={13} />
              Dừng
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={runAll} disabled={!modelId}>
              <Sparkles size={13.5} />
              Tạo tất cả
            </Button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto px-8 py-5">
          {/* 1 — Idea + length → shot list */}
          <section className="mb-4 rounded-xl2 border border-brass-700/30 bg-brass-700/[0.06] p-4">
            <h2 className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-brass-300">
              <Wand2 size={12.5} />
              Ý tưởng → kịch bản
            </h2>
            <Textarea
              rows={3}
              value={idea}
              onChange={(event) => setIdea(event.target.value)}
              placeholder="Ví dụ: cô gái mặc đầm trắng đi dọc bãi biển lúc hoàng hôn, tà váy bay trong gió"
              className="text-[12.5px]"
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <Field label="Tổng thời lượng (giây)">
                <Input
                  type="number"
                  min={4}
                  value={totalSeconds}
                  onChange={(event) => setTotalSeconds(Number(event.target.value))}
                />
              </Field>
              <Field label="Model video">
                <Select value={modelId} onChange={(event) => setModelId(event.target.value)}>
                  {videoModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Khung hình">
                <Select value={aspect} onChange={(event) => setAspect(event.target.value)}>
                  <option value="16:9">Ngang 16:9</option>
                  <option value="9:16">Dọc 9:16</option>
                  <option value="1:1">Vuông 1:1</option>
                </Select>
              </Field>
              <Field label="Kế hoạch chia cảnh" hint={`model chỉ nhận ${durations.join("/")}s`}>
                <div className="field flex items-center justify-between text-ink-200">
                  <span className="font-mono text-[11.5px]">{plan.join(" + ")}</span>
                  <span className="text-[11px] text-ink-500">= {planTotal}s</span>
                </div>
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="primary" size="sm" onClick={writeScript} disabled={planning}>
                {planning ? <Spinner /> : <Sparkles size={13} />}
                {planning ? "Đang viết…" : "AI viết kịch bản"}
              </Button>
              <Button variant="outline" size="sm" onClick={applyPlan} disabled={planning}>
                Chỉ chia cảnh theo thời lượng
              </Button>
              <span className="text-[11px] text-ink-500">
                Luôn làm tròn lên — thừa vài giây, không bao giờ thiếu.
              </span>
            </div>
          </section>

          {/* 2 — Continuity */}
          <section className="mb-4 rounded-xl2 border border-ink-700/70 bg-ink-850/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                <Layers size={12.5} />
                Giữ đồng nhất giữa các video
              </h2>
              <label className="flex cursor-pointer items-center gap-1.5 text-[11.5px] text-ink-400">
                <input
                  type="checkbox"
                  checked={lockSeed}
                  onChange={(event) => setLockSeed(event.target.checked)}
                  className="h-3.5 w-3.5 accent-brass-500"
                />
                Khoá seed ({seed})
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Nhân vật (bộ nhớ)" hint={characters.length ? `${characters.length} đã học` : "chưa có"}>
                <Select value={characterId} onChange={(event) => setCharacterId(event.target.value)}>
                  <option value="">— Không dùng —</option>
                  {characters.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Bộ nhìn (nhân vật + phong cách)">
                <Select
                  value={presetId}
                  onChange={(event) => {
                    setPresetId(event.target.value);
                    const chosen = presets.find((item) => item.id === event.target.value);
                    if (chosen) {
                      setWardrobe(chosen.wardrobe);
                      setLocation(chosen.location);
                      setStripFromPreset(chosen);
                    }
                  }}
                >
                  <option value="">— Không dùng —</option>
                  {presets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Trang phục" hint="dùng chung mọi cảnh">
                <Input value={wardrobe} onChange={(event) => setWardrobe(event.target.value)} placeholder="đầm lụa trắng" />
              </Field>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label="Bối cảnh" hint="dùng chung mọi cảnh">
                <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="bãi biển lúc hoàng hôn" />
              </Field>
              <Field label="Ghi chú thêm cho AI" hint="tuỳ chọn">
                <Input value={customStyle} onChange={(event) => setCustomStyle(event.target.value)} placeholder="giữ đúng gương mặt, không đổi tóc" />
              </Field>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.08em] text-ink-500">Phong cách</span>
              {STYLE_PRESETS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setStyleId(item.id)}
                  className={clsx(
                    "rounded-md border px-2 py-1 text-[11.5px] transition",
                    styleId === item.id
                      ? "border-brass-600/70 bg-brass-700/15 text-brass-300"
                      : "border-ink-700 text-ink-400 hover:border-ink-500 hover:text-ink-200",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {styleId === "custom" && (
              <Textarea
                rows={2}
                value={customStyle}
                onChange={(event) => setCustomStyle(event.target.value)}
                placeholder="Tự viết phong cách, ví dụ: phim nhựa 16mm, tông pastel, nắng sớm, máy cầm tay rung nhẹ"
                className="mt-2 text-[12px]"
              />
            )}
            {styleId !== "custom" && customStyle.trim() && (
              <p className="mt-2 text-[11px] text-ink-500">
                Ghi chú thêm đang bật: <span className="text-ink-300">{customStyle}</span>
              </p>
            )}
          </section>

          {/* 3 — Reference image */}
          <section className="mb-4 rounded-xl2 border border-ink-700/70 bg-ink-850/50 p-4">
            <h2 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-400">
              <ImagePlus size={12.5} />
              Ảnh tham chiếu
            </h2>
            <p className="mb-3 text-[11.5px] leading-relaxed text-ink-500">
              Ảnh này trở thành <span className="text-ink-300">khung hình đầu tiên</span> của mỗi video. Dùng cùng một ảnh cho
              mọi cảnh thì nhân vật không bị đổi mặt. Bỏ trống nếu chỉ muốn tạo từ kịch bản chữ.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {anchorUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={withBasePath(anchorUrl)} alt="Ảnh tham chiếu" className="h-16 w-16 rounded-lg border border-ink-700 object-cover" />
                  <div className="flex flex-col gap-1.5">
                    <label className="flex cursor-pointer items-center gap-1.5 text-[11.5px] text-ink-300">
                      <input
                        type="checkbox"
                        checked={useAnchor}
                        onChange={(event) => setUseAnchor(event.target.checked)}
                        className="h-3.5 w-3.5 accent-brass-500"
                      />
                      Dùng cho mọi cảnh
                    </label>
                    <div className="flex gap-2">
                      <button onClick={learnCharacter} disabled={anchorBusy} className="flex items-center gap-1 text-[11.5px] text-brass-400 hover:underline disabled:opacity-50">
                        <BrainCircuit size={12} />
                        Dạy AI nhớ mặt này
                      </button>
                      <button onClick={() => setAnchorUrl(undefined)} className="text-[11.5px] text-ink-500 hover:text-red-300">
                        Bỏ ảnh
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-ink-600 px-3 py-2.5 text-[12px] text-ink-400 hover:border-brass-500/60 hover:text-ink-200">
                  {anchorBusy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                  Tải ảnh nhân vật / sản phẩm
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) uploadAnchor(file);
                    }}
                  />
                </label>
              )}
            </div>
          </section>

          {/* 4 — Shots */}
          <div className="space-y-3">
            {scenes.map((scene, index) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                index={index}
                aspect={aspect}
                durations={durations}
                onPatch={(value) => patch(scene.id, value)}
                onRun={() => runScene(scene)}
                onRemove={() =>
                  setScenes((current) =>
                    current.length === 1 ? [newScene(0)] : current.filter((s) => s.id !== scene.id),
                  )
                }
                onDuplicate={() =>
                  setScenes((current) => [
                    ...current.slice(0, index + 1),
                    { ...scene, id: `scene-${Date.now()}`, title: `${scene.title} (bản sao)`, status: "idle", result: null, error: null },
                    ...current.slice(index + 1),
                  ])
                }
                onAnalyze={
                  scene.result
                    ? async () => {
                        toast("Đang phân tích video…");
                        try {
                          const { result } = await api.analyze.video({ assetId: scene.result!.id, projectId: project?.id, remember: true });
                          patch(scene.id, { error: null });
                          toast(`Phân tích: ${result.summary.slice(0, 90)}`, "success");
                        } catch (error) {
                          toast(error instanceof Error ? error.message : "Phân tích lỗi", "error");
                        }
                      }
                    : undefined
                }
              />
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setScenes((c) => [...c, newScene(c.length)])}>
              <Plus size={14} />
              Thêm cảnh
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setScenes((c) => [...c, ...Array.from({ length: 5 }, (_, i) => newScene(c.length + i))])}
            >
              <Layers size={14} />
              Thêm 5 cảnh
            </Button>
          </div>

          <ContinuityHint preset={preset} character={character} />
        </div>

        <aside className="hidden w-[340px] shrink-0 flex-col overflow-y-auto border-l border-ink-700/60 bg-ink-900/40 p-4 lg:flex">
          <h2 className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            Video đã tạo
            <span className="text-ink-500">{done.length}</span>
          </h2>
          {done.length === 0 ? (
            <p className="mt-10 text-center text-[12.5px] leading-relaxed text-ink-500">
              Chưa có video. Nhập ý tưởng rồi bấm “Tạo tất cả”.
            </p>
          ) : (
            <div className="space-y-3">
              {done.map((item) => (
                <div key={item.id} className="overflow-hidden rounded-xl border border-ink-700 bg-ink-850">
                  <video src={withBasePath(item.url)} controls className="w-full" />
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="truncate text-[11.5px] text-ink-300">{item.title}</span>
                    <a href={withBasePath(item.url)} download className="shrink-0 text-[11px] text-brass-400 hover:underline">
                      {tr("common.download")}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      <BatchModal
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        onCreate={(prompts, seconds) => {
          setScenes(prompts.map((prompt, index) => ({ ...newScene(index, seconds), prompt })));
          setBatchOpen(false);
          toast(`Đã tạo ${prompts.length} cảnh`, "success");
        }}
      />
    </div>
  );

  function setStripFromPreset(chosen: LookPreset) {
    if (chosen.characterId) setCharacterId(chosen.characterId);
    if (chosen.refUrl) setAnchorUrl(chosen.refUrl);
    if (chosen.styleId) setStyleId(STYLE_PRESETS.some((s) => s.id === chosen.styleId) ? chosen.styleId : "custom");
    if (chosen.styleId === "custom") setCustomStyle(chosen.promptSuffix);
  }
}

/* ------------------------------- sub views -------------------------------- */

function ContinuityHint({ preset, character }: { preset: LookPreset | null; character: MemoryEntry | null }) {
  if (!preset && !character) {
    return (
      <p className="mt-4 rounded-lg border border-ink-700/60 bg-ink-900/40 px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-500">
        <UserRound size={12} className="mr-1 inline" />
        Mẹo: tải ảnh nhân vật rồi bấm <span className="text-brass-400">“Dạy AI nhớ mặt này”</span> — hệ thống lưu lại mô tả
        khuôn mặt, tóc, trang phục để các lần sau dùng lại, video không bị đổi người.
      </p>
    );
  }
  return (
    <div className="mt-4 rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-3 py-2.5 text-[11.5px] leading-relaxed text-emerald-200/90">
      Đang dùng bộ nhớ đồng nhất
      {character && <> · nhân vật “{character.name}”</>}
      {preset && <> · bộ nhìn “{preset.name}”</>}. Mọi cảnh dùng chung mô tả và seed.
    </div>
  );
}

function SceneCard({
  scene,
  index,
  aspect,
  durations,
  onPatch,
  onRun,
  onRemove,
  onDuplicate,
  onAnalyze,
}: {
  scene: Scene;
  index: number;
  aspect: string;
  durations: number[];
  onPatch: (value: Partial<Scene>) => void;
  onRun: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onAnalyze?: () => void;
}) {
  const { tr, toast } = useUi();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

  return (
    <div
      className={clsx(
        "rounded-xl2 border bg-ink-850/60 p-3.5 transition",
        scene.status === "error" ? "border-red-900/60" : scene.status === "running" ? "border-brass-600/60" : "border-ink-700/70",
      )}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ink-800 text-[11px] text-ink-400">{index + 1}</span>
          <Input value={scene.title} onChange={(event) => onPatch({ title: event.target.value })} className="h-7 w-40 !py-0 text-[12.5px]" />
          {scene.status === "running" && <Loader2 size={12} className="animate-spin text-brass-400" />}
          {scene.status === "done" && <Badge tone="green">{tr("node.done")}</Badge>}
        </div>
        <div className="flex items-center gap-1.5">
          <Select
            value={scene.seconds}
            onChange={(event) => onPatch({ seconds: Number(event.target.value) })}
            className="h-7 w-[92px] !py-0 text-[11.5px]"
          >
            {durations.map((value) => (
              <option key={value} value={value}>
                {value} giây
              </option>
            ))}
          </Select>
          <button onClick={onDuplicate} title="Nhân bản" className="rounded-md p-1 text-ink-500 hover:bg-ink-750 hover:text-ink-200">
            <Copy size={13} />
          </button>
          <button onClick={onRemove} title="Xoá" className="rounded-md p-1 text-ink-500 hover:bg-ink-750 hover:text-red-300">
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => inputRef.current?.click()}
          className={clsx(
            "relative w-[132px] shrink-0 overflow-hidden rounded-lg border border-dashed transition",
            scene.imageUrl ? "border-transparent" : "border-ink-600 hover:border-brass-500/60 hover:bg-ink-800",
          )}
          style={{ aspectRatio: aspect === "9:16" ? "9/16" : aspect === "1:1" ? "1/1" : "16/9" }}
        >
          {scene.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={withBasePath(scene.imageUrl)} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center text-[10.5px] text-ink-500">
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
              Ảnh riêng
            </span>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setUploading(true);
            try {
              const asset = await api.assets.upload(file);
              onPatch({ imageUrl: asset.url });
            } finally {
              setUploading(false);
            }
          }}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-ink-400">Câu lệnh cảnh</span>
            <button
              type="button"
              onClick={async () => {
                if (!scene.prompt.trim()) {
                  toast("Hãy nhập ý tưởng cho cảnh trước!", "error");
                  return;
                }
                setEnhancing(true);
                try {
                  const res = await api.promptMaster.enhance({ prompt: scene.prompt, kind: "video" });
                  onPatch({ prompt: res.enhancedPrompt });
                  toast("Đã hoàn thiện cảnh với AI Bùi Hữu Thắng!", "success");
                } catch (e) {
                  toast(e instanceof Error ? e.message : "Lỗi tối ưu", "error");
                } finally {
                  setEnhancing(false);
                }
              }}
              disabled={enhancing}
              className="flex items-center gap-1 rounded bg-amber-400/10 px-2 py-0.5 text-[10.5px] font-medium text-amber-300 hover:bg-amber-400/20 transition disabled:opacity-50"
              title="Tối ưu prompt cảnh này qua Trợ lý Bậc Thầy (Bùi Hữu Thắng)"
            >
              {enhancing ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
              <span>{enhancing ? "Đang xử lý..." : "✨ Bậc Thầy"}</span>
            </button>
          </div>
          <Textarea
            rows={4}
            value={scene.prompt}
            onChange={(event) => onPatch({ prompt: event.target.value })}
            placeholder="Mô tả cảnh này: máy quay, hành động, góc máy…"
            className="text-[12px]"
          />
        </div>
      </div>

      {scene.error && (
        <p className="mt-2 rounded-md bg-red-950/50 px-2 py-1.5 text-[11.5px] leading-snug text-red-300">{scene.error}</p>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-[10.5px] text-ink-500">
          {scene.status === "running"
            ? tr("node.running")
            : scene.status === "queued"
              ? "Đang chờ…"
              : scene.imageUrl
                ? "Ảnh riêng + kịch bản"
                : "Dùng ảnh tham chiếu chung"}
        </span>
        <div className="flex items-center gap-1.5">
          {scene.result && (
            <video src={withBasePath(scene.result.url)} className="h-8 w-14 rounded border border-ink-700 object-cover" muted />
          )}
          {scene.result && onAnalyze && (
            <button onClick={onAnalyze} title="Phân tích video này" className="rounded-md p-1.5 text-ink-500 hover:bg-ink-750 hover:text-violet-soft">
              <ScanEye size={13} />
            </button>
          )}
          <Button
            variant={scene.status === "done" ? "outline" : "primary"}
            size="sm"
            onClick={onRun}
            disabled={scene.status === "running"}
          >
            {scene.status === "running" ? <Loader2 size={12.5} className="animate-spin" /> : <Play size={12.5} />}
            {scene.status === "running" ? tr("node.running") : tr("node.run")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function BatchModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (prompts: string[], seconds: number) => void;
}) {
  const [text, setText] = useState("");
  const [seconds, setSeconds] = useState(6);
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);

  return (
    <Modal open={open} onClose={onClose} title="Dán kịch bản hàng loạt" width={620}>
      <div className="space-y-3">
        <p className="text-[12px] leading-relaxed text-ink-400">
          Mỗi dòng là một video riêng. Tất cả dùng chung phần “Giữ đồng nhất” ở trên, nên không bị lệch nhau.
        </p>
        <Textarea
          rows={12}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={"Model bước ra khỏi cửa, tà áo bay trong gió\nCận cảnh gương mặt, nắng xiên qua tóc\nQuay lưng bước vào hành lang"}
          className="text-[12px]"
        />
        <div className="flex items-end justify-between gap-3">
          <Field label="Thời lượng mỗi video" className="w-40">
            <Select value={seconds} onChange={(event) => setSeconds(Number(event.target.value))}>
              {[4, 5, 6, 8, 10, 15].map((value) => (
                <option key={value} value={value}>
                  {value} giây
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-center gap-2">
            <Badge>{lines.length} cảnh</Badge>
            <Button variant="outline" onClick={onClose}>
              Huỷ
            </Button>
            <Button variant="primary" onClick={() => onCreate(lines, seconds)} disabled={!lines.length}>
              <Wand2 size={13.5} />
              Tạo {lines.length || ""} cảnh
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}