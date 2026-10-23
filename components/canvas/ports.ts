/** What a node emits. One input and one output handle per node — no per-type ports. */

export type PortKind = "text" | "image" | "video" | "any";

/** How a connected source should be read when several wires share the single input. */
export type MediaRole = "text" | "image" | "video" | "look";

export const HANDLE_IN = "in";
export const HANDLE_OUT = "out";

type NodeData = {
  modelKind?: string;
  result?: { kind?: string } | null;
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
} | null;

/** What a node sends out of its single right-hand handle. */
export function outputKind(type?: string | null, data?: NodeData): PortKind | null {
  switch (type) {
    case "prompt":
      return "text";
    case "image":
    case "upscale":
    case "fashion_tryon":
      return "image";
    case "fashion_compose":
      return "video";
    case "generate":
      return data?.modelKind === "video" ? "video" : "image";
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
  if (!type || type === "prompt" || type === "image" || type === "group") return [];
  if (type === "result") return ["text", "image", "video", "any"];
  if (type === "generate") {
    return data?.modelKind === "video" ? ["text", "image", "video"] : ["text", "image"];
  }
  if (type === "upscale" || type === "train") return ["image"];
  if (type === "fashion_tryon") return ["text", "image"];
  if (type === "fashion_compose") return ["image", "video"];
  return [];
}

export function kindsCompatible(out: PortKind | null, accepted: PortKind[]): boolean {
  if (!out || accepted.length === 0) return false;
  return out === "any" || accepted.includes("any") || accepted.includes(out);
}

/** The single input handle when the new node can take this output kind. */
export function targetHandleFor(type: string, data: { modelKind?: string } | undefined, incoming: PortKind): string | null {
  return kindsCompatible(incoming, accepts(type, data)) ? HANDLE_IN : null;
}

/**
 * Role of a wire, taken from the source node rather than which port it hit.
 * Plain image nodes are references (first = model, second = garment).
 * Generated stills are "look" so a try-on result can fill a video slot
 * without stealing the reference slots.
 */
export function sourceMediaRole(type?: string | null, data?: NodeData): MediaRole {
  if (type === "prompt" || type === "train") return "text";
  if (type === "image") return "image";
  if (type === "fashion_compose") return "video";
  if (type === "generate") return data?.modelKind === "video" ? "video" : "look";
  if (type === "fashion_tryon" || type === "upscale") return "look";
  if (type === "result") {
    if (data?.result?.kind === "video" || data?.videoUrl) return "video";
    if (data?.result?.kind === "image" || data?.imageUrl) return "look";
    return "text";
  }
  const kind = outputKind(type, data);
  if (kind === "video") return "video";
  if (kind === "image") return "image";
  return "text";
}
