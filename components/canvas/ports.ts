/** What a node emits. One input and one output handle per node — no per-type ports. */

export type PortKind = "text" | "image" | "video" | "audio" | "model3d" | "any";

/** How a connected source should be read when several wires share the single input. */
export type MediaRole = "text" | "image" | "video" | "audio" | "model3d" | "look";

export const HANDLE_IN = "in";
export const HANDLE_OUT = "out";

type NodeData = {
  modelKind?: string;
  result?: { kind?: string } | null;
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  model3dUrl?: string;
} | null;

/** What a node sends out of its single right-hand handle. */
export function outputKind(type?: string | null, data?: NodeData): PortKind | null {
  switch (type) {
    case "prompt":
    case "prompt_master":
      return "text";
    case "image":
      return data?.videoUrl || data?.result?.kind === "video" ? "video" : "image";
    case "upscale":
    case "fashion_tryon":
      return "image";
    case "fashion_compose":
      return "video";
    case "generate":
      return data?.modelKind === "video"
        ? "video"
        : data?.modelKind === "audio"
        ? "audio"
        : "image";
    case "voice":
    case "audio":
      return "audio";
    case "model3d":
      return "model3d";
    case "train":
    case "result":
      return "any";
    default:
      return null;
  }
}

/** Every node except a group box has the same output handle id. */
export function sourceHandleFor(type?: string | null): string | null {
  if (!type || type === "group") return null;
  return HANDLE_OUT;
}

/** Kinds the node's single input will take. Empty means nothing may connect in. */
export function accepts(type?: string | null, data?: NodeData): PortKind[] {
  if (!type || type === "group") return [];
  if (type === "prompt") return ["text"];
  if (type === "image") return ["image", "video", "model3d", "any"];
  if (type === "prompt_master") return ["text"];
  if (type === "result") return ["text", "image", "video", "audio", "model3d", "any"];
  if (type === "generate") {
    // Generate nodes accept text prompts, image references, video references (motion/pose), audio (voice/lipsync), and 3D models
    return ["text", "image", "video", "audio", "model3d", "any"];
  }
  if (type === "voice" || type === "audio") {
    return ["text", "audio", "any"];
  }
  if (type === "model3d") {
    return ["image", "model3d", "any"];
  }
  if (type === "upscale" || type === "train") return ["image"];
  if (type === "fashion_tryon") return ["text", "image", "model3d"];
  if (type === "fashion_compose") return ["image", "video", "model3d"];
  return [];
}

export function kindsCompatible(out: PortKind | null, accepted: PortKind[]): boolean {
  if (!out || accepted.length === 0) return false;
  if (out === "any" || accepted.includes("any") || accepted.includes(out)) return true;
  // A 3D model node can supply snapshot rendering to an image-accepting node
  if (out === "model3d" && accepted.includes("image")) return true;
  // A video node can supply keyframes/stills to an image-accepting node
  if (out === "video" && accepted.includes("image")) return true;
  return false;
}

/** The single input handle when the new node can take this output kind. */
export function targetHandleFor(type: string, data: { modelKind?: string } | undefined, incoming: PortKind): string | null {
  return kindsCompatible(incoming, accepts(type, data)) ? HANDLE_IN : null;
}

/**
 * Role of a wire, taken from the source node rather than which port it hit.
 */
export function sourceMediaRole(type?: string | null, data?: NodeData): MediaRole {
  if (type === "prompt" || type === "train" || type === "prompt_master") return "text";
  if (type === "image") return data?.videoUrl || data?.result?.kind === "video" ? "video" : "image";
  if (type === "fashion_compose") return "video";
  if (type === "voice" || type === "audio") return "audio";
  if (type === "model3d") return "model3d";
  if (type === "generate") {
    if (data?.modelKind === "video") return "video";
    if (data?.modelKind === "audio") return "audio";
    return "look";
  }
  if (type === "fashion_tryon" || type === "upscale") return "look";
  if (type === "result") {
    if (data?.result?.kind === "video" || data?.videoUrl) return "video";
    if (data?.result?.kind === "audio" || data?.audioUrl) return "audio";
    if (data?.result?.kind === "image" || data?.imageUrl) return "look";
    return "text";
  }
  const kind = outputKind(type, data);
  if (kind === "video") return "video";
  if (kind === "audio") return "audio";
  if (kind === "model3d") return "model3d";
  if (kind === "image") return "image";
  return "text";
}
