"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SAT } from "@/data/exams";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { overall, streak } from "@/lib/stats";
import { RequireAccount } from "@/components/ui";

export default function AccountPage() {
  return (
    <RequireAccount>
      <Profile />
    </RequireAccount>
  );
}

function Profile() {
  const { t, tx } = useI18n();
  const { account, data, signOut, updateAccount } = useApp();
  const router = useRouter();
  const [target, setTarget] = useState(account!.targetScore);

  const stats = overall(data.attempts);

  return (
    <div className="max-w-lg mx-auto pt-12 pb-20">
      <p className="label-xs fade-in">{account!.role === "admin" ? "admin" : "student"}</p>
      <h1 className="display fade-up mt-3 text-[2rem]">{account!.name}</h1>
      <p className="fade-in mt-2 text-[15px] text-muted">{account!.email || "—"}</p>

      <dl className="mt-10 border-t border-b grid grid-cols-3">
        {[
          { label: t("progress.totalAnswered"), value: stats.total },
          { label: t("progress.mocksTaken"), value: data.mocks.length },
          { label: t("progress.streak"), value: streak(data.attempts) },
        ].map((stat, i) => (
          <div key={stat.label} className={`py-5 px-4 ${i > 0 ? "border-l" : ""}`}>
            <dd className="num text-2xl font-medium">{stat.value}</dd>
            <dt className="text-[12px] text-muted mt-1">{stat.label}</dt>
          </div>
        ))}
      </dl>

      <dl className="mt-8 space-y-5 text-[15px]">
        <div className="flex items-baseline gap-4">
          <dt className="text-muted w-32 shrink-0 text-[13px]">{t("admin.exam")}</dt>
          <dd>{tx(SAT.name)}</dd>
        </div>
        {account!.grade && (
          <div className="flex items-baseline gap-4">
            <dt className="text-muted w-32 shrink-0 text-[13px]">{t("signup.grade")}</dt>
            <dd>{account!.grade === "grad" ? t("signup.graduate") : account!.grade}</dd>
          </div>
        )}
      </dl>

      <div className="mt-10 pt-8 border-t">
        <label className="label" htmlFor="target">
          {t("signup.targetScore")}
        </label>
        <p className="num text-3xl font-medium">
          {target}
          <span className="text-faint text-lg"> / {SAT.maxScore}</span>
        </p>
        <input
          id="target"
          type="range"
          min={800}
          max={SAT.maxScore}
          step={10}
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
          onPointerUp={() => updateAccount({ targetScore: target })}
          onKeyUp={() => updateAccount({ targetScore: target })}
          className="w-full mt-3"
          style={{ accentColor: "var(--foreground)" }}
        />
      </div>

      <p className="mt-10 text-[13px] leading-relaxed text-faint">{t("account.cloudNotice")}</p>

      <div className="mt-8 flex gap-2">
        <button className="btn" onClick={() => router.push("/")}>
          {t("common.back")}
        </button>
        <button
          className="btn"
          onClick={() => {
            signOut();
            router.push("/");
          }}
        >
          {t("auth.signOut")}
        </button>
      </div>
    </div>
  );
}
