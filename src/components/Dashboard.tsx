"use client";

import Link from "next/link";
import { SAT, subjectGradient, subjectsFor } from "@/data/exams";
import type { Account } from "@/lib/storage";
import { useApp } from "@/lib/app-state";
import { bankStats, statsFor } from "@/lib/bank-stats";
import { useI18n } from "@/lib/i18n";
import { NOUNS, pluralize } from "@/lib/plural";
import {
  maxScore,
  overall,
  pct,
  recentActivity,
  reviewQueue,
  streak,
  weakTopics,
} from "@/lib/stats";
import { SubjectScene } from "./three/SubjectScene";
import { CountUp, ProgressBar, Reveal } from "./motion";
import { ExamCountdown } from "./dashboard/ExamCountdown";
import { IconRule, IconTrend } from "./illustrations";
import { CommunityPreview } from "./community/CommunityPreview";

/** Slightly darker second stop, so each card is a gradient of its own hue. */
export function Dashboard({ account }: { account: Account }) {
  const { t, tx } = useI18n();
  const { data, bank } = useApp();

  const exam = SAT.exam;
  const examAttempts = data.attempts.filter((a) => a.exam === exam);
  const stats = overall(examAttempts);
  const totals = bankStats(bank);
  const queue = reviewQueue(data, bank);
  const weak = weakTopics(examAttempts, 2, 3);
  const lastMock = [...data.mocks].reverse().find((m) => m.exam === exam);
  const activity = recentActivity(data.attempts);
  const peak = Math.max(1, ...activity.map((d) => d.count));
  const days = streak(data.attempts);
  const fresh = stats.total === 0;

  /** Distinct questions answered per subject — "solved of total", as on the card. */
  const solvedBySubject = new Map<string, number>();
  for (const subjectId of new Set(data.attempts.map((a) => a.subjectId))) {
    solvedBySubject.set(
      subjectId,
      new Set(data.attempts.filter((a) => a.subjectId === subjectId).map((a) => a.questionId)).size,
    );
  }

  /**
   * One shape for every metric. `rule` is a 0–1 progress value where the number
   * has a ceiling worth drawing; the rest carry a hint instead, because a bar
   * against an invented maximum is decoration pretending to be data.
   */
  const metrics = [
    {
      label: t("plan.answered"),
      value: stats.total,
      suffix: "",
      hint: `${t("plan.ofBank")} ${totals.total}`,
      rule: totals.total ? Math.min(1, stats.total / totals.total) : 0,
    },
    {
      label: t("plan.accuracy"),
      value: fresh ? 0 : Math.round(stats.accuracy * 100),
      suffix: fresh ? "" : "%",
      hint: fresh ? t("plan.noAttempts") : `${stats.correct} / ${stats.total}`,
      rule: fresh ? null : stats.accuracy,
    },
    {
      label: t("plan.queue"),
      value: queue.length,
      suffix: "",
      hint: queue.length === 0 ? t("plan.queueClear") : undefined,
      rule: null,
      action: queue.length > 0 ? { href: "/review", label: t("an.openQueue") } : undefined,
    },
    {
      label: t("plan.streak"),
      value: days,
      suffix: "",
      hint: days === 0 ? t("plan.streakStart") : pluralize(days, NOUNS.day),
      rule: null,
    },
  ];

  /**
   * The one thing to do next, chosen from what the student actually has in
   * front of them rather than invented. Order matters: a non-empty review queue
   * beats new practice, because the queue is made of questions already known to
   * be weak. Nothing here is personalised beyond what the data says.
   */
  const next =
    queue.length > 0
      ? {
          title: t("home.nextReview"),
          meta: t("home.nextReviewMeta"),
          cta: t("home.nextReviewCta"),
          href: "/review",
        }
      : totals.total > 0
        ? {
            title: t("home.nextPractice"),
            meta: t("home.nextPracticeMeta"),
            cta: t("home.nextPracticeCta"),
            href: "/practice",
          }
        : data.mocks.length === 0 && totals.total === 0
          ? {
              title: t("home.nextPending"),
              meta: t("home.nextPendingMeta"),
              cta: t("home.nextPendingCta"),
              href: "/community",
            }
          : {
              title: t("home.nextMock"),
              meta: t("home.nextMockMeta"),
              cta: t("home.startMock"),
              href: "/mock",
            };

  return (
    <div className="container-app space-y-12 sm:space-y-14">
      {/* ---------------- the one next action ---------------- */}
      <section className="pl-next">
        <div className="pl-next-copy">
          <p className="pl-next-label">{t("home.nextUp")}</p>
          <h1 className="pl-next-title">{next.title}</h1>
          <p className="pl-next-meta">{next.meta}</p>
        </div>
        <Link href={next.href} className="pl-next-cta">
          {next.cta} <span aria-hidden>›</span>
        </Link>
      </section>

      {/* ---------------- question bank ---------------- */}
      <section>
        <div className="flex items-center gap-2.5">
          <span style={{ color: "var(--brand)" }}>
            <IconRule size={20} />
          </span>
          <h2 className="t-h2">{t("bank.title")}</h2>
          <Link href="/practice" className="btn btn-sm ml-auto shrink-0">
            {t("bank.allSubjects")}
          </Link>
        </div>

        <div className="mt-5 grid sm:grid-cols-2 gap-4">
          {subjectsFor(exam).map((subject, i) => {
            const total = statsFor(totals, subject.id).total;
            const solved = solvedBySubject.get(subject.id) ?? 0;
            const share = total ? solved / total : 0;
            return (
              <Reveal key={subject.id} delay={i * 70}>
                <Link
                  href="/practice"
                  className="bank-card"
                  style={subjectGradient(subject.id) as React.CSSProperties}
                >
                  {/* Text zone. The card is a grid, so nothing here can be
                      reached by the artwork beside it. */}
                  <span className="block min-w-0">
                    <span className="block text-h3 font-semibold tracking-[-0.02em]">
                      {tx(subject.name)}
                    </span>

                    <span className="mt-2.5 flex items-baseline gap-2 text-sm opacity-90">
                      <span className="num">
                        {solved} {t("bank.of")} {total}
                      </span>
                      <span>{t("bank.solved")}</span>
                      <span className="num ml-auto font-semibold">{pct(share)}</span>
                    </span>

                    <span className="block bank-track mt-2">
                      <span className="block bank-fill" style={{ width: `${share * 100}%` }} />
                    </span>

                    <span
                      className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-[var(--radius-pill)] text-sm font-medium"
                      style={{ background: "rgba(255,255,255,0.22)" }}
                    >
                      {t("bank.open")} <span aria-hidden>›</span>
                    </span>
                  </span>

                  {/* Art zone. The subject's own lit scene, clipped by its own
                      column and dropped entirely when the card is too narrow to
                      carry it. */}
                  <span className="bank-art">
                    <SubjectScene kind={subject.id === "sat-math" ? "math" : "verbal"} />
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ---------------- community, promoted above the analytics ---------------- */}
      <CommunityPreview />

      {/* ---------------- progress ---------------- */}
      <section>
        <div className="flex items-center gap-2.5">
          <span style={{ color: "var(--brand)" }}>
            <IconTrend size={20} />
          </span>
          <h2 className="t-h2">{t("plan.overview")}</h2>
          <Link href="/progress" className="btn btn-sm ml-auto shrink-0">
            {t("an.viewAll")} <span aria-hidden>›</span>
          </Link>
        </div>

        {fresh && <p className="mt-3 text-sm text-muted max-w-lg">{t("plan.startHere")}</p>}

        <dl className="pl-metrics mt-5">
          {metrics.map((metric) => (
            <div key={metric.label} className="pl-metric">
              <dt className="pl-metric-label">{metric.label}</dt>
              <dd>
                <p className="pl-metric-value" data-zero={metric.value === 0}>
                  <CountUp value={metric.value} suffix={metric.suffix} />
                </p>
                {metric.rule !== null && metric.rule !== undefined && (
                  <ProgressBar value={metric.rule} tone="accent" className="pl-metric-rule" />
                )}
                {metric.hint && <p className="pl-metric-hint">{metric.hint}</p>}
                {metric.action && (
                  <Link href={metric.action.href} className="btn btn-sm mt-2.5">
                    {metric.action.label}
                  </Link>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ---------------- activity, goal ----------------
          Activity is a section ruled off by a heading; the goal is a panel,
          because it is the one thing here you can act on. */}
      <section className="grid lg:grid-cols-[1.35fr_1fr] gap-8 lg:gap-10 items-start">
        <div>
          <div className="pl-section-head">
            <h3 className="t-label">{t("home.activity")}</h3>
            <span className="text-micro text-faint ml-auto">{t("an.last14")}</span>
          </div>

          {fresh ? (
            <p className="text-sm text-muted mt-4">{t("an.noActivity")}</p>
          ) : (
            <div className="mt-5 flex items-end gap-1.5 h-28">
              {activity.map((day) => (
                <div key={day.day} className="flex-1 flex flex-col items-center gap-2 h-full">
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className="w-full rounded-t-[3px] transition-[height] duration-500"
                      style={{
                        height: `${Math.max(day.count ? 8 : 3, (day.count / peak) * 100)}%`,
                        background: day.count ? "var(--brand)" : "var(--line)",
                      }}
                      title={`${day.day}: ${day.count}`}
                    />
                  </div>
                  <span className="num text-2xs text-faint">{day.day.slice(-2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* The goal stays an object: it holds a target you set, a measurement
            against it and the action that moves it. The exam date is supporting
            information inside it rather than a card of its own. */}
        <div className="panel p-5 sm:p-6 flex flex-col">
          <h3 className="t-label">{t("home.goal")}</h3>
          <p className="mt-3 flex items-baseline gap-1.5">
            <span className="num text-h1 font-semibold">{lastMock?.score ?? 0}</span>
            <span className="num text-h3 text-faint">/ {account.targetScore}</span>
          </p>
          <ProgressBar
            value={lastMock ? Math.min(1, lastMock.score / account.targetScore) : 0}
            tone="accent"
            className="mt-4"
          />
          <p className="text-sm text-muted mt-3">
            {tx(SAT.name)} · {t("common.total")} <span className="num">{maxScore(exam)}</span>
          </p>

          <div className="mt-4 pt-4 border-t">
            <ExamCountdown inline />
          </div>

          <Link href="/mock" className="btn btn-primary btn-sm mt-5 self-start">
            {t("home.startMock")}
          </Link>
        </div>
      </section>

      {/* ---------------- weak topics ---------------- */}
      {weak.length > 0 && (
        <section>
          <h3 className="t-h3">{t("home.weakest")}</h3>
          <ul className="mt-4 grid sm:grid-cols-3 gap-3">
            {weak.map((bucket, i) => (
              <Reveal as="li" key={bucket.key} delay={i * 60}>
                <Link href="/practice" className="card-tone p-4 block h-full">
                  <p className="text-sm truncate">{bucket.key}</p>
                  <p className="num text-h3 font-semibold mt-1">{pct(bucket.accuracy)}</p>
                  <ProgressBar
                    value={bucket.accuracy}
                    tone={bucket.accuracy < 0.5 ? "danger" : "accent"}
                    className="mt-2.5"
                  />
                </Link>
              </Reveal>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
