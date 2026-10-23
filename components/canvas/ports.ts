/** Port kinds for the canvas. Same-kind dots connect; mismatches are blocked. */

export type PortKind = "text" | "image" | "video" | "any";

export const PORT_STROKE: Record<PortKind, string> = {
  text: "#c4b5fd",
  image: "#7dd3fc",
  video: "#fbbf24",
  any: "#6ee7b7",
};

type NodeLike = { type?: string | null; data?: { modelKind?: string } | null };

/** What a node sends out of its right-hand port. Nodes with no output return null. */
export function outputKind(type?: string | null, data?: { modelKind?: string } | null): PortKind | null {
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
      return "any";
    default:
      return null;
  }
}

export function sourceHandleFor(type?: string | null): string | null {
  if (type === "prompt") return "prompt";
  if (type === "image") return "image";
  if (!type || type === "result" || type === "group") return null;
  return "result";
}

/** Kinds a target handle will take. Empty means the handle does not accept links. */
export function accepts(type?: string | null, handle?: string | null): PortKind[] {
  if (!type || type === "prompt" || type === "image" || type === "group") return [];
  if (type === "result" || handle === "in") return ["text", "image", "video", "any"];
  if (handle === "prompt") return ["text"];
  if (handle === "image" || handle === "images" || handle === "model" || handle === "garment") return ["image"];
  // Lookbook's "video" port also takes a still (the try-on result is often an image).
  if (handle === "video") return ["video", "image"];
  return [];
}

export function kindsCompatible(out: PortKind | null, accepted: PortKind[]): boolean {
  if (!out || accepted.length === 0) return false;
  return out === "any" || accepted.includes("any") || accepted.includes(out);
}

/** Best input port when dropping a connection onto a brand-new node. */
export function targetHandleFor(
  type: string,
  data: { modelKind?: string } | undefined,
  incoming: PortKind,
): string | null {
  if (type === "generate") {
    if (incoming === "text" || incoming === "any") return "prompt";
    if (incoming === "image") return "image";
    return null;
  }
  if (type === "upscale") return incoming === "image" || incoming === "any" ? "image" : null;
  if (type === "train") return incoming === "image" || incoming === "any" ? "images" : null;
  if (type === "result") return "in";
  if (type === "fashion_tryon") {
    if (incoming === "text") return "prompt";
    if (incoming === "image" || incoming === "any") return "model";
    return null;
  }
  if (type === "fashion_compose") {
    if (incoming === "video") return "video";
    if (incoming === "image" || incoming === "any") return "model";
    return null;
  }
  void data;
  return null;
}

export function nodeOutputKind(node?: NodeLike | null): PortKind | null {
  return outputKind(node?.type, node?.data);
}
