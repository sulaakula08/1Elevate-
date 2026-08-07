"use client";

import Link from "next/link";
import React from "react";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { EmptyLine } from "./illustrations";

export function PageTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="pt-8 pb-8">
      <h1 className="display fade-up text-[2rem] sm:text-[2.5rem]">{children}</h1>
      {sub && (
        <p className="fade-in mt-3 text-[15px] leading-relaxed text-muted max-w-xl" style={{ animationDelay: "80ms" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="py-5">
      <p className="num text-2xl font-medium">{value}</p>
      <p className="text-[13px] text-muted mt-1">{label}</p>
      {hint && <p className="text-[12px] text-faint mt-0.5">{hint}</p>}
    </div>
  );
}

/** Thin accuracy rule; colour only when the number is genuinely low. */
export function AccuracyBar({ accuracy }: { accuracy: number }) {
  return (
    <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{
          width: `${Math.max(1, Math.round(accuracy * 100))}%`,
          background: accuracy < 0.5 ? "var(--danger)" : "var(--foreground)",
        }}
      />
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-10 text-center fade-in">
      <EmptyLine className="w-36 h-auto mx-auto" />
      <p className="text-[14px] text-muted mt-5 max-w-sm mx-auto leading-relaxed">{children}</p>
    </div>
  );
}

/**
 * Confirmation for an action that is awkward to undo — granting a role,
 * deleting a question. Rendered inline (not a portal) because the callers sit
 * inside the page's own layout and nothing here needs to escape a stacking
 * context. Escape and the backdrop both cancel, so the destructive button is
 * never the only way out.
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  danger,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  body?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    confirmRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in"
      style={{ background: "color-mix(in srgb, var(--foreground) 32%, transparent)" }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="panel scale-in w-full max-w-sm p-6"
      >
        <h2 className="text-[17px] font-semibold">{title}</h2>
        {body && <div className="mt-2 text-[14px] leading-relaxed text-muted">{body}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={danger ? "btn" : "btn btn-primary"}
            style={
              danger
                ? { borderColor: "var(--danger)", color: "var(--danger)" }
                : undefined
            }
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Gate for pages that need an account, so progress has somewhere to go. */
export function RequireAccount({ children }: { children: React.ReactNode }) {
  const { account, ready } = useApp();
  const { t } = useI18n();

  if (!ready) {
    return (
      <div className="max-w-4xl mx-auto pt-10 space-y-3">
        <div className="skeleton h-9 w-1/2 rounded-lg" />
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="skeleton h-20 rounded-xl mt-6" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="max-w-sm mx-auto py-20 text-center fade-in">
        <EmptyLine className="w-36 h-auto mx-auto" />
        <p className="text-[15px] mt-6">{t("auth.required")}</p>
        <div className="flex gap-2 justify-center mt-6">
          <Link href="/signup" className="btn btn-primary">
            {t("landing.start")}
          </Link>
          <Link href="/login" className="btn">
            {t("auth.signIn")}
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
