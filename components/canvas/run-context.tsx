"use client";

import { createContext, useContext } from "react";

export type RunNodeFn = (id: string, options?: { clearPrior?: boolean }) => void;

export const RunNodeContext = createContext<RunNodeFn | null>(null);

export function useRunNode(): RunNodeFn {
  return useContext(RunNodeContext) ?? (() => {});
}

export type NodeMenuActions = {
  duplicate: (id: string) => void;
  remove: (id: string) => void;
  reuse?: (nodeId: string, customUrl?: string, customKind?: "image" | "video", customName?: string) => void;
};

export const NodeMenuContext = createContext<NodeMenuActions | null>(null);

export function useNodeMenu(): NodeMenuActions {
  return useContext(NodeMenuContext) ?? { duplicate: () => {}, remove: () => {}, reuse: () => {} };
}
