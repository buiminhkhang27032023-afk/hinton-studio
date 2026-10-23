"use client";

import { useEffect } from "react";
import { api } from "@/lib/api-client";
import { useStudio } from "@/lib/studio-store";
import type { ModelRecord } from "@/lib/types";

/** Loads models + key state into the studio store; rendered once per app shell. */
export function StudioBootstrap() {
  const setModels = useStudio((s) => s.setModels);
  const setHasKey = useStudio((s) => s.setHasKey);

  useEffect(() => {
    api.models
      .list()
      .then((models: ModelRecord[]) => setModels(models))
      .catch(() => {});
    api.settings
      .get()
      .then((settings) => setHasKey(settings.hasKey))
      .catch(() => {});
  }, [setHasKey, setModels]);

  return null;
}
