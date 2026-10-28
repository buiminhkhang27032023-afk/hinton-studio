import { withBasePath } from "./base-path";
import type { Edge, Node } from "@xyflow/react";
import { sourceMediaRole } from "@/components/canvas/ports";
import { api } from "./api-client";
import type { Asset } from "./types";

export interface StudioNodeData {
  [key: string]: unknown;
  prompt?: string;
  modelId?: string;
  aspect?: string;
  resolution?: string;
  duration?: number;
  seed?: number;
  scale?: number;
  steps?: number;
  name?: string;
  imageUrl?: string;
  videoUrl?: string;
  headline?: string;
  subheadline?: string;
  /** Text repeated in every prompt from this node — keeps a batch consistent. */
  continuity?: string;
  text?: string;
  piapiMode?: string;
  result?: Asset | null;
  status?: "idle" | "running" | "done" | "error";
  error?: string | null;
  modelKind?: "image" | "video";
  masterPromptEnabled?: boolean;
  masterPromptUndo?: string;
  masterPromptEnhanced?: boolean;
  masterPromptEn?: string;
  masterPromptVi?: string;
  masterPromptHighlights?: string[];
}

export type StudioNode = Node<StudioNodeData>;

/** Video models on this gateway accept 1280x720-style sizes; images use 1024-class. */
const IMAGE_SIZE: Record<string, string> = {
  "1:1": "1024x1024",
  "3:2": "1536x1024",
  "2:3": "1024x1536",
  "16:9": "1536x864",
  "9:16": "864x1536",
  "4:5": "1024x1280",
};

const VIDEO_SIZE: Record<string, string> = {
  "1:1": "1024x1024",
  "3:2": "1280x854",
  "2:3": "854x1280",
  "16:9": "1280x720",
  "9:16": "720x1280",
  "4:5": "864x1080",
};

/** PiAPI's Seedance only accepts this fixed enum — map our aspect dropdown onto it. */
const PIAPI_ASPECT: Record<string, string> = {
  "1:1": "1:1",
  "3:2": "4:3",
  "2:3": "3:4",
  "16:9": "16:9",
  "9:16": "9:16",
  "4:5": "3:4",
};

export interface ResolvedInputs {
  prompt: string;
  image?: string;
  images: string[];
  model?: string;
  modelImage?: string;
  garmentImage?: string;
  videoUrl?: string;
}

const LEGACY_HANDLES = new Set([
  "model",
  "model_image",
  "garment",
  "garment_image",
  "video",
  "prompt",
  "image",
  "images",
]);

/** Old graphs named the port. New graphs store that hint on the edge, if at all. */
function legacyHandle(edge: Edge): string | null {
  const stored = (edge.data as { legacyHandle?: string } | undefined)?.legacyHandle;
  if (stored && LEGACY_HANDLES.has(stored)) return stored;
  const handle = edge.targetHandle;
  if (handle && LEGACY_HANDLES.has(handle)) return handle;
  return null;
}

/**
 * Walk upstream edges. Every wire hits the same input point, so the role
 * (prompt, reference image, video, look) comes from the source node.
 * Connection order is kept: the first photo is the model, the second the garment.
 */
export function resolveInputs(nodeId: string, nodes: StudioNode[], edges: Edge[]): ResolvedInputs {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const incoming = edges.filter((edge) => edge.target === nodeId);

  const texts: string[] = [];
  const images: string[] = [];
  const refs: string[] = [];
  const looks: string[] = [];
  const models: string[] = [];
  let modelImage: string | undefined;
  let garmentImage: string | undefined;
  let videoUrl: string | undefined;

  for (const edge of incoming) {
    const source = byId.get(edge.source);
    if (!source) continue;
    const data = source.data ?? {};
    const srcUrl = data.result?.url || (data.imageUrl as string) || (data.videoUrl as string);
    const textValue = (data.text as string) || (data.prompt as string) || "";
    const legacy = legacyHandle(edge);

    if (legacy === "model" || legacy === "model_image") {
      if (srcUrl) {
        modelImage = srcUrl;
        images.push(srcUrl);
        refs.push(srcUrl);
      }
      continue;
    }
    if (legacy === "garment" || legacy === "garment_image") {
      if (srcUrl) {
        garmentImage = srcUrl;
        images.push(srcUrl);
        refs.push(srcUrl);
      }
      continue;
    }
    if (legacy === "video") {
      if (srcUrl) videoUrl = srcUrl;
      continue;
    }
    if (legacy === "prompt") {
      if (textValue) texts.push(textValue);
      continue;
    }
    if (legacy === "image" || legacy === "images") {
      if (srcUrl) {
        images.push(srcUrl);
        refs.push(srcUrl);
      }
      continue;
    }

    const role = sourceMediaRole(source.type, data);
    if (role === "text") {
      if (textValue) texts.push(textValue);
      else if (data.result?.name) models.push(String(data.result.name));
      continue;
    }
    if (role === "video") {
      if (srcUrl) videoUrl = srcUrl;
      continue;
    }
    if (!srcUrl) continue;
    images.push(srcUrl);
    if (role === "look") looks.push(srcUrl);
    else refs.push(srcUrl);
  }

  if (!modelImage) modelImage = refs[0] ?? looks[0];
  if (!garmentImage) {
    if (refs[1]) garmentImage = refs[1];
    else if (refs[0]) garmentImage = looks.find((url) => url !== modelImage);
    else garmentImage = looks[1];
  }
  if (!videoUrl) {
    videoUrl = looks.find((url) => url !== modelImage && url !== garmentImage);
  }

  return {
    prompt: texts.join("\n\n"),
    image: images[0],
    images,
    model: models[0],
    modelImage,
    garmentImage,
    videoUrl,
  };
}

export function sizeFor(aspect?: string, kind: "image" | "video" = "image"): string {
  const table = kind === "video" ? VIDEO_SIZE : IMAGE_SIZE;
  return table[aspect ?? "16:9"] ?? "1024x1024";
}

/**
 * Provider servers cannot read our local /api/files URLs, so inline the bytes
 * as a data URI before sending an image upstream.
 */
export async function toDataUri(url?: string): Promise<string> {
  if (!url) return "";
  if (url.startsWith("data:") || /^https?:\/\//i.test(url)) return url;
  try {
    const res = await fetch(withBasePath(url));
    if (!res.ok) return url;
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

export interface RunResult {
  asset: Asset;
  text?: string;
}

/**
 * Extra continuity text stored on a generate node (set by the inspector or by a
 * look preset). It is appended to every prompt that node sends.
 */
function continuitySuffix(data: StudioNodeData): string {
  const block = (data.continuity as string | undefined)?.trim();
  return block ? ` ${block}` : "";
}

export async function runStudioNode(
  node: StudioNode,
  nodes: StudioNode[],
  edges: Edge[],
  projectId: string,
): Promise<RunResult> {
  const data = node.data ?? {};
  const inputs = resolveInputs(node.id, nodes, edges);

  if (node.type === "prompt" || node.type === "image") {
    throw new Error("Khối này chỉ cung cấp dữ liệu, không cần chạy.");
  }

  // Master Prompt Node
  if (node.type === "prompt_master") {
    const rawToEnhance =
      (data.text as string)?.trim() || (data.prompt as string)?.trim() || inputs.prompt?.trim();
    if (!rawToEnhance) throw new Error("Chưa nhập câu lệnh hoặc ý tưởng để trợ lý hoàn thiện.");
    const res = await api.promptMaster.enhance({
      prompt: rawToEnhance,
      kind: (data.modelKind as "image" | "video") ?? "video",
    });
    data.text = res.enhancedPrompt;
    data.prompt = res.enhancedPrompt;
    data.masterPromptUndo = rawToEnhance;
    data.masterPromptEnhanced = true;
    data.masterPromptEn = res.enhancedPrompt;
    data.masterPromptVi = res.enhancedPromptVi;
    data.masterPromptHighlights = res.highlights;
    return {
      asset: {
        id: `prompt-${Date.now()}`,
        projectId,
        name: "Prompt Bậc Thầy",
        kind: "file",
        mime: "text/plain",
        url: "",
        meta: {
          text: res.enhancedPrompt,
          enhancedPromptVi: res.enhancedPromptVi,
          highlights: res.highlights,
        },
        createdAt: Date.now(),
      },
      text: res.enhancedPrompt,
    };
  }

  // Special Fashion Lookbook Split-Screen Composition Node
  if (node.type === "fashion_compose" || node.type === "split_video") {
    const video = inputs.videoUrl || inputs.image || (data.videoUrl as string);
    const model = inputs.modelImage || inputs.images[0] || (data.imageUrl as string);
    const garment = inputs.garmentImage || inputs.images[1] || (data.garmentUrl as string);

    if (!video) throw new Error("Chưa nối video người mẫu vào khối ghép video.");
    if (!model) throw new Error("Chưa nối ảnh chân dung người mẫu vào khối ghép video.");
    if (!garment) throw new Error("Chưa nối ảnh sản phẩm trang phục vào khối ghép video.");

    const res = await fetch(withBasePath("/api/fashion/compose"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoUrl: video,
        modelImageUrl: model,
        garmentImageUrl: garment,
        headline: (data.headline as string) || "HÃY NHỚ",
        subheadline: (data.subheadline as string) || "Bí quyết phối đồ",
        projectId,
      }),
    });
    const resData = await res.json();
    if (!res.ok || resData.error) {
      throw new Error(resData.error || "Lỗi khi ghép video thời trang.");
    }
    return { asset: resData.asset as Asset };
  }

  // Fashion Try-On: verified working via req/gemini-3.0-pro-image over
  // /chat/completions — send the model photo AND the garment photo as two
  // image_url entries in ONE message. Gemini genuinely composites the two
  // (unlike /images/edits, which only ever accepts a single reference image,
  // and unlike veo-3.1/google-omni-flash's /videos endpoint, which rejects a
  // 2-item input_reference array outright). No vision pre-step needed.
  if (node.type === "fashion_tryon") {
    const modelImg = inputs.modelImage || inputs.images[0] || (data.imageUrl as string);
    const garment = inputs.garmentImage || inputs.images[1] || (data.garmentUrl as string);
    if (!modelImg) throw new Error("Chưa nối ảnh người mẫu vào khối Thử Đồ AI.");
    if (!garment) throw new Error("Chưa nối ảnh trang phục vào khối Thử Đồ AI.");

    const inlineModel = await toDataUri(modelImg);
    const inlineGarment = await toDataUri(garment);

    const stylePrompt = (data.prompt as string)?.trim();
    const prompt =
      "Image 1 is a photo of a person, full body, studio background. Image 2 is a clothing " +
      "garment on a plain background. Generate a new photorealistic image: the exact same " +
      "person from Image 1 (keep face, hair, body, pose identical) now wearing the exact " +
      "garment from Image 2 (keep its color, fabric, cut and any shoes/accessories identical)." +
      (stylePrompt ? ` ${stylePrompt}.` : "") +
      " Same studio background. Output the image directly.";

    const modelId = String(data.modelId || "seed:image:gemini-compose");
    const response = await api.run({
      modelId,
      kind: "image",
      projectId,
      nodeId: node.id,
      vars: {
        prompt,
        modelImage: inlineModel,
        garmentImage: inlineGarment,
        image: inlineModel,
        images: [inlineModel, inlineGarment],
        size: sizeFor(data.aspect as string | undefined, "image"),
        seed: data.seed ?? Math.floor(Math.random() * 1_000_000),
      },
      name: `fashion-tryon-${new Date().toISOString().slice(11, 19)}`,
    });
    if (response.error) throw new Error(response.error);
    return { asset: response.output as Asset };
  }

  if (node.type === "train") {
    if (!data.modelId) throw new Error("Chưa chọn model train.");
    if (inputs.images.length === 0) throw new Error("Hãy nối ít nhất một ảnh vào khối train.");
    const response = await api.run({
      modelId: String(data.modelId),
      kind: "train",
      projectId,
      nodeId: node.id,
      vars: {
        name: data.name ?? "atelier-lora",
        steps: data.steps ?? 1000,
        dataset: inputs.images,
        images: inputs.images,
        prompt: inputs.prompt,
      },
      name: String(data.name ?? "model"),
    });
    if (response.error) throw new Error(response.error);
    return { asset: response.output as Asset };
  }

  const kind = node.type === "upscale" ? "upscale" : (data.modelKind ?? "image");
  if (!data.modelId) throw new Error("Chưa chọn model.");

  let prompt = (data.prompt as string)?.trim() || inputs.prompt;
  if (kind !== "upscale" && !prompt) throw new Error("Hãy nhập câu lệnh trước.");
  if (kind === "upscale" && !inputs.image && !data.imageUrl) {
    throw new Error("Hãy nối hoặc tải lên một ảnh để upscale.");
  }

  // If Master Prompt Assistant is enabled on this node, auto-enhance if not already enhanced
  if (data.masterPromptEnabled && prompt && !data.masterPromptEnhanced) {
    try {
      const enhanced = await api.promptMaster.enhance({
        prompt,
        kind: kind === "video" ? "video" : "image",
      });
      if (enhanced.ok && enhanced.enhancedPrompt) {
        prompt = enhanced.enhancedPrompt;
        data.prompt = enhanced.enhancedPrompt;
        data.masterPromptEnhanced = true;
        data.masterPromptEn = enhanced.enhancedPrompt;
        data.masterPromptVi = enhanced.enhancedPromptVi;
        data.masterPromptHighlights = enhanced.highlights;
      }
    } catch (err) {
      console.warn("Trợ lý Bậc Thầy auto-enhance thất bại, dùng prompt gốc:", err);
    }
  }

  const sourceImage = inputs.image ?? (data.imageUrl as string | undefined) ?? "";
  const isIooai = String(data.modelId).startsWith("iooai:");
  const inlineImage = isIooai ? sourceImage : await toDataUri(sourceImage);

  // PiAPI's servers fetch reference images themselves — a data: URI or our own
  // /api/files/... local path is unreachable from their side, only a real
  // http(s) URL works. Filter to those and let the model fall back to
  // text-to-video when none qualify. @Ảnh{n} in the prompt (inserted by the
  // "@" mention picker) refers to the n-th image as connected — remap it to
  // the n-th entry that actually survives the public-URL filter, so the tag
  // still points at the right image once the list shrinks.
  const taggedImages = inputs.images.map((url, i) => ({ url, tag: i + 1 }));
  const publicEntries = taggedImages.filter((entry) => /^https?:\/\//i.test(entry.url)).slice(0, 9);
  const publicImageUrls = publicEntries.map((entry) => entry.url);
  const tagRemap = new Map(publicEntries.map((entry, newIndex) => [entry.tag, newIndex + 1]));
  
  // For multimodal vision models (Gemini), map @Ảnh1 -> Ảnh 1 (Image 1) so the LLM clearly understands the reference
  const taggedPrompt = prompt.replace(/@Ảnh(\d+)/g, (match, numStr) => {
    if (kind === "video" && publicEntries.length > 0) {
      const mapped = tagRemap.get(Number(numStr));
      return mapped ? `@image${mapped}` : match;
    }
    return `Ảnh ${numStr} (Image ${numStr})`;
  });
  const aspect = (data.aspect as string | undefined) ?? "16:9";

  const allImages = inputs.images.length > 0 ? inputs.images : (sourceImage ? [sourceImage] : []);
  const inlineImages = isIooai ? allImages : await Promise.all(allImages.map(toDataUri));

  let chosenModelId = String(data.modelId);
  // Auto-route to multimodal vision model if user connected reference images to a text-only image model
  if (kind === "image" && allImages.length > 0) {
    if (chosenModelId === "req/gpt-image-2" || chosenModelId === "seed:image:gpt-image" || chosenModelId === "iooai:gpt-image-2-4k") {
      chosenModelId = "req/gemini-3.0-pro-image";
    }
  }

  const response = await api.run({
    modelId: chosenModelId,
    kind,
    projectId,
    nodeId: node.id,
    vars: {
      prompt: `${taggedPrompt}${continuitySuffix(data)}`,
      image: inlineImage,
      images: isIooai ? allImages : inlineImages,
      modelImage: inputs.modelImage ? await toDataUri(inputs.modelImage) : inlineImages[0],
      garmentImage: inputs.garmentImage ? await toDataUri(inputs.garmentImage) : inlineImages[1],
      video: inputs.videoUrl ?? (data.videoUrl as string | undefined),
      videoUrl: inputs.videoUrl ?? (data.videoUrl as string | undefined),
      workflowId: (data.workflowId as string | undefined) ?? "",
      duration: data.duration ?? 5,
      aspect,
      size: sizeFor(aspect, kind === "video" ? "video" : "image"),
      seed: data.seed ?? Math.floor(Math.random() * 1_000_000),
      scale: data.scale ?? 2,
      imageUrls: publicImageUrls,
      piapiMode:
        publicImageUrls.length > 2
          ? "omni_reference"
          : publicImageUrls.length > 0
            ? "first_last_frames"
            : "text_to_video",
      piapiDuration: Math.min(15, Math.max(4, Number(data.duration ?? 10))),
      piapiAspect: PIAPI_ASPECT[aspect] ?? "16:9",
      resolution: (data.resolution as string | undefined) ?? (isIooai ? "720p" : "480p"),
    },
    name: `${node.type}-${new Date().toISOString().slice(11, 19)}`,
  });

  if (response.error) throw new Error(response.error);
  return { asset: response.output as Asset };
}
