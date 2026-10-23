"use client";

import { create } from "zustand";
import { useMemo } from "react";
import type { ModelRecord, ProjectSummary } from "./types";

interface StudioState {
  project: ProjectSummary | null;
  models: ModelRecord[];
  hasKey: boolean;
  setProject: (project: ProjectSummary | null) => void;
  setModels: (models: ModelRecord[]) => void;
  setHasKey: (value: boolean) => void;
}

export const useStudio = create<StudioState>((set) => ({
  project: null,
  models: [],
  hasKey: false,
  setProject: (project) => set({ project }),
  setModels: (models) => set({ models }),
  setHasKey: (hasKey) => set({ hasKey }),
}));

/** Selectors must return stable references, so filter in a memo instead. */
export function useModelsOfKind(kind: string): ModelRecord[] {
  const models = useStudio((s) => s.models);
  return useMemo(() => models.filter((model) => model.kind === kind), [models, kind]);
}

export function useModelById(id?: string | null): ModelRecord | undefined {
  const models = useStudio((s) => s.models);
  return useMemo(
    () => (id ? models.find((model) => model.id === id) : undefined),
    [models, id],
  );
}
