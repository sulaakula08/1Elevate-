"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SAT, getSubject, subjectColor, subjectColorSoft } from "@/data/exams";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import {
  bySubject,
  medianSeconds,
  overall,
  pct,
  recentActivity,
  scoreStanding,
  streak,
} from "@/lib/stats";
import { CountUp, ProgressBar } from "@/components/motion";
import { RequireAccount } from "@/components/ui";

export default function AccountPage() {
  return (
    <RequireAccount>
      <Profile />
    </RequireAccount>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function Profile() {
  const { t, tx } = useI18n();
  const { account, data, signOut, updateAccount } = useApp();
  const router = useRouter();
  const [target, setTarget] = useState(account!.targetScore);

  const stats = overall(data.attempts);
  const days = streak(data.attempts);
  const pace = medianSeconds(data.attempts);
  const standing = scoreStanding(data.mocks, account!.targetScore);
  const subjects = bySubject(data.attempts).filter((b) => b.total >= 3);
  const strongest = subjects.reduce<(typeof subjects)[number] | null>(
    (top, b) => (!top || b.accuracy > top.accuracy ? b : top),
    null,
  );
  const weakest = subjects.reduce<(typeof subjects)[number] | null>(
    (low, b) => (!low || b.accuracy < low.accuracy ? b : low),
    null,
  );
  // Fourteen days is enough to read a rhythm without turning the profile into
  // the progress page, which owns the long view.
  const fortnight = recentActivity(data.attempts, 14);
  const peak = Math.max(1, ...fortnight.map((d) => d.count));

  const gap = standing ? account!.targetScore - standing.latest : null;

  return (
    <div className="container-read pb-20">
      {/* ---------------- identity ---------------- */}
      <header className="flex items-start gap-4 fade-up">
        <span
          className="grid place-items-center shrink-0 w-16 h-16 rounded-[var(--radius-pill)] text-h3 font-semibold"
          style={{
            background: "var(--brand-soft)",
            color: "var(--brand)",
            border: "1px solid color-mix(in srgb, var(--brand) 30%, transparent)",
          }}
          aria-hidden
        >
          {initials(account!.name)}
        </span>
        <div className="min-w-0 pt-1">
          <h1 className="display text-h1 leading-tight truncate">{account!.name}</h1>
          <p className="mt-1 text-sm text-muted truncate">{account!.email || "—"}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span
              className="chip"
              style={{
                ["--tone" as string]:
                  account!.role === "owner"
                    ? "var(--s-rose)"
                    : account!.role === "admin"
                      ? "var(--s-violet)"
                      : "var(--line-strong)",
              }}
            >
              {account!.role}
            </span>
            {days > 0 && (
              <span className="badge" style={{ ["--tone" as string]: "var(--s-orange)" }}>
                🔥 <span className="num">{days}</span>
              </span>
            )}
            <span className="text-micro text-faint">
              {t("account.memberSince")}{" "}
              {new Date(account!.createdAt).toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </header>

      {/* ---------------- counters ---------------- */}
      <dl className="mt-9 border-t border-b grid grid-cols-3">
        {[
          { label: t("progress.totalAnswered"), value: stats.total, suffix: "" },
          {
            label: t("account.accuracy"),
            value: Math.round(stats.accuracy * 100),
            suffix: "%",
          },
          { label: t("progress.mocksTaken"), value: data.mocks.length, suffix: "" },
        ].map((stat, i) => (
          <div key={stat.label} className={`py-5 px-4 ${i > 0 ? "border-l" : ""}`}>
            <dd className="num text-2xl font-medium">
              <CountUp value={stat.value} suffix={stat.suffix} />
            </dd>
            <dt className="text-micro text-muted mt-1">{stat.label}</dt>
          </div>
        ))}
      </dl>

      {/* ---------------- fourteen-day rhythm ----------------
          A profile that only lists facts about a student says nothing about
          whether they are actually working. This does. */}
      <section className="mt-8">
        <p className="label-xs">{t("progress.last14")}</p>
        <div className="mt-4 flex items-end gap-1 h-14">
          {fortnight.map((day) => (
            <div
              key={day.day}
              className="flex-1 rounded-[2px] transition-[height] duration-500"
              title={`${day.day}: ${day.count}`}
              style={{
                height: `${Math.max(day.count ? 12 : 4, (day.count / peak) * 100)}%`,
                background: day.count ? "var(--brand)" : "var(--line)",
              }}
            />
          ))}
        </div>
      </section>

      {/* ---------------- snapshot ---------------- */}
      {(strongest || pace !== null) && (
        <section className="mt-10">
          <p className="label-xs">{t("account.snapshot")}</p>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {strongest && (
              <SubjectCard
                label={t("account.strongest")}
                subjectId={strongest.key}
                name={
                  getSubject(strongest.key)
                    ? tx(getSubject(strongest.key)!.name)
                    : strongest.key
                }
                accuracy={strongest.accuracy}
              />
            )}
            {weakest && weakest.key !== strongest?.key && (
              <SubjectCard
                label={t("account.weakest")}
                subjectId={weakest.key}
                name={
                  getSubject(weakest.key) ? tx(getSubject(weakest.key)!.name) : weakest.key
                }
                accuracy={weakest.accuracy}
              />
            )}
            {pace !== null && (
              <div className="rounded-[var(--radius-sm)] border p-4">
                <p className="label-xs">{t("progress.pace")}</p>
                <p className="num mt-2 text-h2 font-medium">
                  {pace}
                  <span className="text-faint text-sm">s</span>
                </p>
                <p className="text-micro text-faint mt-0.5">{t("progress.paceHint")}</p>
              </div>
            )}
            <Link
              href="/progress"
              className="rounded-[var(--radius-sm)] border p-4 card-hover flex flex-col justify-center"
            >
              <p className="text-sm">{t("nav.progress")}</p>
              <p className="text-micro text-muted mt-1">{t("account.keepGoing")} →</p>
            </Link>
          </div>
        </section>
      )}

      {/* ---------------- the goal ---------------- */}
      <section className="mt-10 pt-8 border-t">
        <div className="flex items-baseline gap-3">
          <label className="label mb-0" htmlFor="target">
            {t("account.goal")}
          </label>
          <span className="num ml-auto text-sm text-faint">
            {SAT.minScore}–{SAT.maxScore}
          </span>
        </div>

        <p className="num mt-3 text-4xl font-medium leading-none">
          {target}
          <span className="text-faint text-lg"> / {SAT.maxScore}</span>
        </p>

        <input
          id="target"
          type="range"
          min={SAT.minScore}
          max={SAT.maxScore}
          step={10}
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
          onPointerUp={() => updateAccount({ targetScore: target })}
          onKeyUp={() => updateAccount({ targetScore: target })}
          className="w-full mt-5"
          style={{ accentColor: "var(--brand)" }}
        />

        {standing ? (
          <>
            <div className="mt-5 flex items-baseline gap-3 text-sm">
              <span className="text-muted">{t("progress.latestMock")}</span>
              <span className="num ml-auto font-medium">{standing.latest}</span>
            </div>
            <ProgressBar
              value={standing.latest / Math.max(1, target)}
              tone={standing.latest >= target ? "accent" : "ink"}
              className="mt-2"
            />
            <p className="mt-3 text-sm text-muted">
              {gap !== null && gap > 0 ? (
                <>
                  <span className="num font-medium text-foreground">{gap}</span>{" "}
                  {t("account.goalGap")}
                </>
              ) : (
                t("account.goalReached")
              )}
            </p>
          </>
        ) : (
          <p className="mt-5 text-sm text-muted">{t("account.goalNoMock")}</p>
        )}

        <p className="mt-4 text-micro leading-relaxed text-faint">{t("account.goalHint")}</p>
      </section>

      {/* ---------------- study details ---------------- */}
      <dl className="mt-10 pt-8 border-t space-y-4 text-sm">
        <div className="flex items-baseline gap-4">
          <dt className="text-muted w-32 shrink-0 text-sm">{t("admin.exam")}</dt>
          <dd>{tx(SAT.name)}</dd>
        </div>
        {account!.grade && (
          <div className="flex items-baseline gap-4">
            <dt className="text-muted w-32 shrink-0 text-sm">{t("signup.grade")}</dt>
            <dd>{account!.grade === "grad" ? t("signup.graduate") : account!.grade}</dd>
          </div>
        )}
        <div className="flex items-baseline gap-4">
          <dt className="text-muted w-32 shrink-0 text-sm">{t("progress.streak")}</dt>
          <dd className="num">{days}</dd>
        </div>
      </dl>

      <p className="mt-10 text-sm leading-relaxed text-faint">{t("account.cloudNotice")}</p>

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

/** A subject with its own hue, its accuracy, and nothing else. */
function SubjectCard({
  label,
  subjectId,
  name,
  accuracy,
}: {
  label: string;
  subjectId: string;
  name: string;
  accuracy: number;
}) {
  return (
    <div
      className="card-tone p-4"
      style={{
        ["--tone" as string]: subjectColor(subjectId),
        ["--tone-soft" as string]: subjectColorSoft(subjectId),
      }}
    >
      <p className="label-xs">{label}</p>
      <p className="text-sm mt-2 truncate">{name}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="num text-h3 font-medium">{pct(accuracy)}</span>
      </div>
      <ProgressBar
        value={accuracy}
        tone={accuracy < 0.5 ? "danger" : "accent"}
        className="mt-2"
      />
    </div>
  );
}
