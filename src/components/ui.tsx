"use client";

import Link from "next/link";
import React from "react";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { EmptyLine, ProgressMark, SuccessTick } from "./illustrations";

export function PageTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="pt-8 pb-8">
      <h1 className="display fade-up text-h1 sm:text-display">{children}</h1>
      {sub && (
        <p className="fade-in mt-3 text-body leading-relaxed text-muted max-w-xl" style={{ animationDelay: "80ms" }}>
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
      <p className="text-sm text-muted mt-1">{label}</p>
      {hint && <p className="text-micro text-faint mt-0.5">{hint}</p>}
    </div>
  );
}

/** Thin accuracy rule; colour only when the number is genuinely low. */
export function AccuracyBar({ accuracy }: { accuracy: number }) {
  return (
    <div className="h-[3px] rounded-[var(--radius-pill)] overflow-hidden" style={{ background: "var(--line)" }}>
      <div
        className="h-full rounded-[var(--radius-pill)] transition-[width] duration-500 ease-out"
        style={{
          width: `${Math.max(1, Math.round(accuracy * 100))}%`,
          background: accuracy < 0.5 ? "var(--danger)" : "var(--foreground)",
        }}
      />
    </div>
  );
}

/**
 * Empty states carry the product while there is nothing to show, so they are
 * not all the same shape. `tone` picks the mark: a tick when the empty state is
 * an achievement (an empty review queue is good news), a progress mark when the
 * screen is waiting on activity, a neutral rule otherwise. `compact` drops the
 * mark entirely, for empty states that sit inside a section rather than filling
 * a page — one page should never show the same mark twice.
 */
export function EmptyState({
  title,
  children,
  action,
  tone = "neutral",
  compact,
}: {
  title?: string;
  children: React.ReactNode;
  action?: { href: string; label: string };
  tone?: "neutral" | "positive" | "progress";
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="py-6 fade-in">
        {title && <p className="text-body font-medium">{title}</p>}
        <p className="text-sm text-muted mt-1 max-w-md">{children}</p>
        {action && (
          <Link href={action.href} className="btn btn-sm mt-4">
            {action.label}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="py-14 text-center fade-in">
      {tone === "positive" ? (
        <SuccessTick className="mx-auto" size={48} />
      ) : tone === "progress" ? (
        <span className="inline-block text-faint">
          <ProgressMark size={48} />
        </span>
      ) : (
        <EmptyLine className="w-28 h-auto mx-auto" />
      )}
      {title && <p className="t-h3 mt-6">{title}</p>}
      <p className="text-sm text-muted mt-2 max-w-sm mx-auto leading-relaxed">{children}</p>
      {action && (
        <Link href={action.href} className="btn btn-primary btn-sm mt-6">
          {action.label}
        </Link>
      )}
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
        <h2 className="text-h3 font-semibold">{title}</h2>
        {body && <div className="mt-2 text-sm leading-relaxed text-muted">{body}</div>}
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
      <div className="container-app space-y-3">
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
        <p className="text-body mt-6">{t("auth.required")}</p>
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
