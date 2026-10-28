"use client";

import { createContext, useContext } from "react";

/** Lets a node trigger its own run without prop-drilling through React Flow. */
export const RunNodeContext = createContext<((nodeId: string) => Promise<void>) | null>(null);

export function useRunNode() {
  const run = useContext(RunNodeContext);
  return run ?? (async () => {});
}

export type NodeMenuActions = {
  duplicate: (nodeId: string) => void;
  remove: (nodeId: string) => void;
  reuse?: (nodeId: string) => void;
};

export const NodeMenuContext = createContext<NodeMenuActions | null>(null);

export function useNodeMenu(): NodeMenuActions {
  return useContext(NodeMenuContext) ?? { duplicate: () => {}, remove: () => {}, reuse: () => {} };
}
