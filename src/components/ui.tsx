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
