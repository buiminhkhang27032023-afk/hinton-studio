"use client";

import { useEffect } from "react";

/**
 * Next.js injects a dev-tools badge (the "N" pill) at the bottom-left, right on
 * top of the sidebar footer. It lives inside a `nextjs-portal` shadow root, so
 * a normal CSS rule cannot reach it — we hide it from inside the shadow tree.
 */
export function HideDevBadge() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    const hide = () => {
      const portal = document.querySelector("nextjs-portal");
      const root = portal?.shadowRoot;
      if (!root) return;
      const indicator = root.getElementById?.("devtools-indicator") ?? root.querySelector("#devtools-indicator");
      if (indicator instanceof HTMLElement) {
        indicator.style.setProperty("display", "none", "important");
      }
    };

    hide();
    const observer = new MutationObserver(hide);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
