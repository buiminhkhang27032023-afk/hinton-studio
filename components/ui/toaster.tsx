"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useUi } from "@/lib/ui-store";
import clsx from "clsx";

export function Toaster() {
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-4">
      {toasts.map((toast) => {
        const Icon = toast.tone === "error" ? XCircle : toast.tone === "success" ? CheckCircle2 : Info;
        return (
          <div
            key={toast.id}
            className={clsx(
              "pointer-events-auto flex w-full items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px] shadow-2xl backdrop-blur-xl animate-fade-up",
              toast.tone === "error"
                ? "border-red-900/60 bg-red-950/85 text-red-100"
                : toast.tone === "success"
                  ? "border-emerald-900/60 bg-emerald-950/85 text-emerald-100"
                  : "border-ink-700 bg-ink-850/95 text-ink-100",
            )}
          >
            <Icon size={15} className="mt-0.5 shrink-0 opacity-80" />
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              className="shrink-0 opacity-50 transition hover:opacity-100"
              aria-label="Đóng"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
