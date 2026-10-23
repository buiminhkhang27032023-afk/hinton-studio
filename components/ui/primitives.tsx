"use client";

import clsx from "clsx";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function Button({
  variant = "ghost",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "icon";
}) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" && "h-8 px-2.5 text-[12px]",
        size === "md" && "h-9 px-3.5 text-[13px]",
        size === "icon" && "h-8 w-8",
        variant === "primary" &&
          "bg-brass-500 text-ink-950 hover:bg-brass-400 shadow-[0_1px_0_rgba(255,255,255,.18)_inset]",
        variant === "ghost" && "text-ink-200 hover:bg-ink-750 hover:text-ink-100",
        variant === "outline" && "border border-ink-700 text-ink-200 hover:border-ink-500 hover:bg-ink-800",
        variant === "danger" && "bg-red-950/70 text-red-200 hover:bg-red-900/70",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...props}
      title={label}
      aria-label={label}
      className={clsx(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-300 transition hover:bg-ink-750 hover:text-ink-100 disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={clsx("block", className)}>
      {label && (
        <span className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400">
            {label}
          </span>
          {hint && <span className="text-[11px] text-ink-500">{hint}</span>}
        </span>
      )}
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx("field", props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx("field", props.className)} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={clsx("field", className)}>
      {children}
    </select>
  );
}

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "brass" | "green" | "red" | "violet";
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em]",
        tone === "default" && "bg-ink-750 text-ink-300",
        tone === "brass" && "bg-brass-700/25 text-brass-300",
        tone === "green" && "bg-emerald-900/35 text-emerald-300",
        tone === "red" && "bg-red-950/60 text-red-300",
        tone === "violet" && "bg-violet-900/35 text-violet-soft",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <span
      className="spin-slow inline-block rounded-full border-2 border-current border-t-transparent opacity-70"
      style={{ width: size, height: size }}
    />
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 560,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="panel max-h-[88vh] w-full overflow-hidden rounded-2xl shadow-2xl animate-fade-up"
        style={{ maxWidth: width }}
      >
        <header className="flex items-center justify-between border-b border-ink-700/70 px-5 py-3.5">
          <h2 className="font-display text-[19px] tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-ink-400 transition hover:bg-ink-750 hover:text-ink-100"
          >
            <XIcon />
          </button>
        </header>
        <div className="max-h-[calc(88vh-58px)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
