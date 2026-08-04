"use client";

import Link from "next/link";
import { SAT, subjectColor, subjectColorSoft, subjectsFor } from "@/data/exams";
import type { Subject } from "@/data/types";
import type { Account } from "@/lib/storage";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import {
  maxScore,
  overall,
  pct,
  recentActivity,
  reviewQueue,
  streak,
  weakTopics,
} from "@/lib/stats";
import { CountUp, ProgressBar, Reveal } from "./motion";
import { IconChat, IconClock, IconRule, IconTrend } from "./illustrations";

/** Corner artwork, cycled across the bank cards. */
const CARD_ART = [IconRule, IconClock, IconChat, IconTrend];

/** Slightly darker second stop, so each card is a gradient of its own hue. */
function bankTone(subject: Subject): React.CSSProperties {
  return {
    ["--tone" as string]: subjectColor(subject.id),
    ["--tone-2" as string]: `color-mix(in srgb, ${subjectColor(subject.id)} 62%, #1b1033)`,
  };
}

export function Dashboard({ account }: { account: Account }) {
  const { t, tx } = useI18n();
  const { data, bank } = useApp();

  const exam = SAT.exam;
  const blueprint = SAT;
  const examAttempts = data.attempts.filter((a) => a.exam === exam);
  const stats = overall(examAttempts);
  const queue = reviewQueue(data, bank);
  const weak = weakTopics(examAttempts, 2, 3);
  const lastMock = [...data.mocks].reverse().find((m) => m.exam === exam);
  const activity = recentActivity(data.attempts);
  const peak = Math.max(1, ...activity.map((d) => d.count));

  /** Distinct questions answered per subject — "solved of total", as in the card. */
  const solvedBySubject = new Map<string, number>();
  for (const subjectId of new Set(data.attempts.map((a) => a.subjectId))) {
    solvedBySubject.set(
      subjectId,
      new Set(data.attempts.filter((a) => a.subjectId === subjectId).map((a) => a.questionId)).size,
    );
  }

  const headline = subjectsFor(exam);


  return (
    <div className="space-y-10">
      {/* ---------------- question bank ---------------- */}
      <section>
        <div className="flex items-center gap-2.5">
          <span className="text-muted">
            <IconRule size={22} />
          </span>
          <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-[-0.03em]">
            {t("bank.title")}
          </h1>
          <Link href="/practice" className="btn btn-sm ml-auto shrink-0">
            {t("bank.allSubjects")}
          </Link>
        </div>

        <div className="mt-5 grid sm:grid-cols-2 gap-4">
          {headline.map((subject, i) => {
            const total = bank.filter((q) => q.subjectId === subject.id).length;
            const solved = solvedBySubject.get(subject.id) ?? 0;
            const share = total ? solved / total : 0;
            const Art = CARD_ART[i % CARD_ART.length];
            return (
              <Reveal key={subject.id} delay={i * 70}>
                <Link href="/practice" className="bank-card" style={bankTone(subject)}>
                  <span className="bank-card-art">
                    <Art size={136} className="text-white" />
                  </span>

                  <span className="relative block">
                    <span className="block text-[19px] font-semibold tracking-[-0.02em]">
                      {tx(subject.name)}
                    </span>

                    <span className="mt-2.5 flex items-baseline gap-2 text-[13px] opacity-90">
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
                      className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full text-[13px] font-medium"
                      style={{ background: "rgba(255,255,255,0.22)" }}
                    >
                      {t("bank.open")} <span aria-hidden>›</span>
                    </span>
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ---------------- analytics ---------------- */}
      <section>
        <div className="flex items-center gap-2.5">
          <span className="text-muted">
            <IconTrend size={22} />
          </span>
          <h2 className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.03em]">
            {t("an.title")}
          </h2>
          <Link href="/progress" className="btn btn-sm ml-auto shrink-0">
            {t("an.viewAll")} <span aria-hidden>›</span>
          </Link>
        </div>

        <div className="tile-grid mt-5 grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: t("an.attempted"),
              value: stats.total,
              suffix: "",
              color: "var(--s-indigo)",
            },
            {
              label: t("an.accuracy"),
              value: Math.round(stats.accuracy * 100),
              suffix: "%",
              color: "var(--s-green)",
            },
            {
              label: t("an.queue"),
              value: queue.length,
              suffix: "",
              color: "var(--s-rose)",
              action: queue.length > 0 ? { href: "/review", label: t("an.openQueue") } : undefined,
            },
            {
              label: t("an.streak"),
              value: streak(data.attempts),
              suffix: "",
              color: "var(--s-orange)",
            },
          ].map((tile, i) => (
            <div
              key={tile.label}
              className={`tile ${i % 2 === 1 ? "border-l" : ""} ${
                i > 0 ? "lg:border-l" : ""
              } ${i > 1 ? "border-t lg:border-t-0" : ""}`}
            >
              <p className="text-[13px] text-muted">{tile.label}</p>
              <p className="num text-[30px] font-semibold mt-1.5" style={{ color: tile.color }}>
                <CountUp value={tile.value} suffix={tile.suffix} />
              </p>
              {tile.action && (
                <Link href={tile.action.href} className="btn btn-sm mt-2.5">
                  {tile.action.label}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- activity + goal ---------------- */}
      <section className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="panel p-5">
          <div className="flex items-baseline gap-2">
            <h3 className="text-[17px] font-semibold tracking-[-0.02em]">{t("an.trend")}</h3>
            <span className="text-[12px] text-faint ml-auto">{t("an.last14")}</span>
          </div>

          {stats.total === 0 ? (
            <p className="text-[13.5px] text-muted mt-6 mb-2">{t("an.noActivity")}</p>
          ) : (
            <div className="mt-5 flex items-end gap-1.5 h-28">
              {activity.map((day) => (
                <div key={day.day} className="flex-1 flex flex-col items-center gap-2 h-full">
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className="w-full rounded-t-[3px] transition-[height] duration-500"
                      style={{
                        height: `${Math.max(day.count ? 8 : 3, (day.count / peak) * 100)}%`,
                        background: day.count ? "var(--accent)" : "var(--line)",
                      }}
                      title={`${day.day}: ${day.count}`}
                    />
                  </div>
                  <span className="num text-[10px] text-faint">{day.day.slice(-2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel p-5 flex flex-col">
          <h3 className="text-[17px] font-semibold tracking-[-0.02em]">{t("home.targetScore")}</h3>
          <p className="num text-[34px] font-semibold mt-2">
            {lastMock?.score ?? 0}
            <span className="text-faint text-[17px]"> / {account.targetScore}</span>
          </p>
          <ProgressBar
            value={lastMock ? Math.min(1, lastMock.score / account.targetScore) : 0}
            tone="accent"
            className="mt-3"
          />
          <p className="text-[12.5px] text-muted mt-3">
            {tx(blueprint.name)} · {t("common.total")} {maxScore(exam)}
          </p>
          <Link href="/mock" className="btn btn-primary btn-sm mt-auto self-start">
            {t("home.startMock")}
          </Link>
        </div>
      </section>

      {/* ---------------- weak topics ---------------- */}
      {weak.length > 0 && (
        <section>
          <h3 className="text-[17px] font-semibold tracking-[-0.02em]">{t("home.weakest")}</h3>
          <ul className="mt-4 grid sm:grid-cols-3 gap-3">
            {weak.map((bucket, i) => {
              const subjectId = examAttempts.find((a) => a.topic === bucket.key)?.subjectId;
              return (
                <Reveal as="li" key={bucket.key} delay={i * 60}>
                  <Link
                    href="/practice"
                    className="card-tone p-4 block h-full"
                    style={
                      subjectId
                        ? {
                            ["--tone" as string]: subjectColor(subjectId),
                            ["--tone-soft" as string]: subjectColorSoft(subjectId),
                          }
                        : undefined
                    }
                  >
                    <p className="text-[14px] truncate">{bucket.key}</p>
                    <p className="num text-[20px] font-semibold mt-1">{pct(bucket.accuracy)}</p>
                    <ProgressBar
                      value={bucket.accuracy}
                      tone={bucket.accuracy < 0.5 ? "danger" : "accent"}
                      className="mt-2.5"
                    />
                  </Link>
                </Reveal>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

