"use client";

import { create } from "zustand";
import type { Lang } from "./i18n";
import { t as translate } from "./i18n";

interface Toast {
  id: string;
  message: string;
  tone: "default" | "error" | "success";
}

export interface LightboxMedia {
  url: string;
  kind?: "image" | "video";
  title?: string;
  nodeId?: string;
}

interface UiState {
  lang: Lang;
  toasts: Toast[];
  lightbox: LightboxMedia | null;
  setLang: (lang: Lang) => void;
  tr: (key: string) => string;
  toast: (message: string, tone?: Toast["tone"]) => void;
  dismiss: (id: string) => void;
  openLightbox: (media: LightboxMedia) => void;
  closeLightbox: () => void;
}

export const useUi = create<UiState>((set, get) => ({
  lang: "vi",
  toasts: [],
  lightbox: null,
  setLang: (lang) => {
    set({ lang });
    if (typeof window !== "undefined") localStorage.setItem("atelier:lang", lang);
  },
  tr: (key) => translate(get().lang, key),
  toast: (message, tone = "default") => {
    const id = Math.random().toString(36).slice(2);
    set({ toasts: [...get().toasts, { id, message, tone }] });
    setTimeout(() => get().dismiss(id), 4200);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
  openLightbox: (lightbox) => set({ lightbox }),
  closeLightbox: () => set({ lightbox: null }),
}));

export function initLang() {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem("atelier:lang");
  if (stored === "vi" || stored === "en") useUi.getState().setLang(stored);
}
