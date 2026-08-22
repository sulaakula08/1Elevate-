"use client";

import Link from "next/link";
import { getSubject, subjectColor } from "@/data/exams";
import type { Analytics } from "@/lib/analytics";
import { asDate, asDuration, asPercent, fill } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";
import { satExamTime } from "@/lib/sat-date";
import { useSettings } from "@/lib/settings";
import { Delta, useCountUp, useInView } from "./primitives";

/**
 * The command centre's masthead.
 *
 * One question, answered before anything else on the page: where does this
 * student stand, and how far is that from where they said they wanted to be.
 *
 * The answer is composed spatially rather than written out. Three numbers on one
 * line — where you are, the distance, where you are going — and then a track
 * that states the same three facts as lengths: solid for what has been scored,
 * hatched for the distance still to close, a post for the destination.
 *
 * The practice estimate sits *below* the track rather than on it, because it is
 * inferred and everything on the track is measured. Putting both on one channel
 * invited the reader to trust them equally.
 *
 * No dial, no ring, no needle. The SAT is a linear scale from 400 to 1600, and a
 * line is the honest picture of it.
 */

const FLOOR = 400;
const CEILING = 1600;

export function ProgressHero({
  analytics,
  targetScore,
  now,
}: {
  analytics: Analytics;
  targetScore: number;
  now: number;
}) {
  const { t, tx } = useI18n();
  const { settings } = useSettings();
  const [ref, seen] = useInView<HTMLDivElement>();

  const { estimate, period, activity, pace, totals } = analytics;
  const measured = estimate.mock;
  const estimated = estimate.total;

  const headline = measured?.score ?? estimated;
  const kind: "mock" | "estimate" | "none" =
    measured !== null ? "mock" : estimated !== null ? "estimate" : "none";
  /** Shown under the track only when it is the *second* reading, not the only one. */
  const secondary = measured !== null ? estimated : null;

  const counted = useCountUp(headline ?? 0, seen, 1200);
  const at = (value: number) =>
    Math.min(100, Math.max(0, ((value - FLOOR) / (CEILING - FLOOR)) * 100));

  const toTarget = headline === null ? null : targetScore - headline;
  const reached = toTarget !== null && toTarget <= 0;

  const accuracy = period.metrics.find((m) => m.key === "accuracy");
  const questions = period.metrics.find((m) => m.key === "questions");

  const examAt = satExamTime(settings.satExamDate);
  const daysToExam =
    examAt === null ? null : Math.max(0, Math.ceil((examAt - now) / 86_400_000));

  const needed = estimate.subjects.reduce((sum, section) => sum + section.need, 0);

  return (
    <div className="pg-command" ref={ref}>
      <div className="min-w-0">
        <p className="pg-mast-kind">
          <span className="pg-mast-tag" data-kind={kind}>
            <span className="pg-mast-tag-dot" aria-hidden />
            {kind === "mock"
              ? t("pg.measured")
              : kind === "estimate"
                ? t("pg.estimated")
                : t("pg.targetTag")}
          </span>
          {measured !== null && <span className="num">{asDate(measured.at)}</span>}
          {kind === "estimate" && <span>{t("pg.estimateNote")}</span>}
        </p>

        {/* Where you are → how far → where you are going. */}
        <div className="pg-mast">
          <span className="pg-mast-now" data-empty={headline === null ? "true" : undefined}>
            {headline === null ? targetScore : counted}
          </span>

          {headline !== null && !reached && (
            <span className="pg-mast-gap">
              <span className="pg-mast-gap-value">
                {fill(t("pg.gapToGo"), { points: toTarget ?? 0 })}
              </span>
              <span className="pg-mast-gap-line" aria-hidden />
            </span>
          )}

          {headline !== null && !reached ? (
            <span className="pg-mast-target">
              <span className="pg-mast-target-value">{targetScore}</span>
              <span className="pg-mast-label">{t("pg.target")}</span>
            </span>
          ) : headline !== null ? (
            <span className="pg-mast-gap" data-reached="true">
              <span className="pg-mast-gap-value">{t("pg.onTarget")}</span>
            </span>
          ) : (
            <span className="pg-mast-target">
              <span className="pg-mast-label">{t("pg.target")}</span>
            </span>
          )}
        </div>

        {headline === null && (
          <p className="pg-deck">
            {totals.attempts === 0
              ? t("pg.mockNone")
              : fill(t("pg.estimateLockedTotal"), { need: needed })}
          </p>
        )}

        <div className="pg-track">
          <div
            className="pg-track-rail"
            role="img"
            aria-label={fill(t("pg.trackLabel"), {
              score: headline ?? "—",
              target: targetScore,
            })}
          >
            <span
              className="pg-track-have"
              style={{ width: `${seen && headline !== null ? at(headline) : 0}%` }}
            />
            {headline !== null && !reached && (
              <span
                className="pg-track-gap"
                style={{
                  left: `${seen ? at(headline) : 0}%`,
                  width: `${seen ? at(targetScore) - at(headline) : 0}%`,
                }}
              />
            )}
            <span className="pg-track-post" style={{ left: `${at(targetScore)}%` }} />
            {secondary !== null && (
              <span className="pg-track-est" style={{ left: `${seen ? at(secondary) : 0}%` }}>
                <span className="pg-track-est-caret" aria-hidden />
                <span className="pg-track-est-label">
                  {fill(t("pg.estimateBeside"), { score: secondary })}
                </span>
              </span>
            )}
          </div>
          <div className="pg-track-scale">
            <span>{FLOOR}</span>
            <span className="pg-track-scale-post">{CEILING}</span>
          </div>
        </div>
      </div>

      {/* The supporting band: how you have been practising on the left, what
          the two sections are worth on the right. */}
      <div className="pg-command-row">
        <div className="pg-vitals">
          <div className="pg-vital-pair">
            <div>
              <p className="pg-vital-label">{t("pg.vitalAccuracy")}</p>
              <p className="pg-vital-value">
                {asPercent(accuracy?.current ?? null)}
                <Delta value={accuracy?.delta ?? null} good="up" fallback="" />
              </p>
              <span className="pg-vital-foot">
                {fill(t("pg.vitalWindow"), { days: period.days })}
              </span>
            </div>
            <div>
              <p className="pg-vital-label">{t("pg.vitalQuestions")}</p>
              <p className="pg-vital-value">
                {questions?.current ?? 0}
                <Delta value={questions?.delta ?? null} good="up" format="count" fallback="" />
              </p>
              <span className="pg-vital-foot">
                {fill(t("pg.vitalWindow"), { days: period.days })}
              </span>
            </div>
          </div>

          {/* The one figure here that is an achievement rather than a
              measurement, so it is the one that gets a surface of its own. */}
          {activity.currentStreak > 0 && (
            <div className="pg-streak-card">
              <span className="pg-streak-num">{activity.currentStreak}</span>
              <span className="pg-streak-copy">
                <span className="pg-streak-head">
                  {activity.currentStreak === 1 ? t("pg.streakDay") : t("pg.streakDays")}
                </span>
                <span className="pg-streak-sub">
                  {activity.streakStart !== null
                    ? fill(t("pg.streakSince"), { date: asDate(activity.streakStart) })
                    : fill(t("pg.vitalActive"), { days: activity.last7 })}
                </span>
              </span>
            </div>
          )}

          {/* The method sits with the figures it explains, and fills the space
              under them rather than leaving the column short. */}
          {(estimated !== null || measured !== null) && (
            <details className="pg-method">
              <summary>
                <span className="pg-method-caret" aria-hidden>
                  ›
                </span>
                {t("pg.method")}
              </summary>
              <p className="pg-method-body">{t("pg.methodBody")}</p>
            </details>
          )}

          <p className="pg-vital-line">
            <span>
              <strong>{asDuration(pace.medianSeconds)}</strong> {t("pg.vitalPerQuestion")}
            </span>
            <span>
              <strong>{activity.last7}</strong> {t("pg.vitalOfSeven")}
            </span>
            {daysToExam !== null && (
              <span>
                <strong>{daysToExam}</strong> {t("pg.vitalDaysToExam")}
              </span>
            )}
          </p>
        </div>

        {/* Both sections on one axis, so the balance is a comparison rather than
            two unrelated bars. */}
        <div className="pg-sections min-w-0">
          {estimate.subjects.map((section) => {
            const subject = getSubject(section.subjectId);
            const report = analytics.subjects.find((s) => s.subjectId === section.subjectId);
            return (
              <div
                key={section.subjectId}
                className="pg-sec"
                style={{ ["--tone" as string]: subjectColor(section.subjectId) }}
              >
                <span className="pg-sec-name">
                  <span className="pg-sec-dot" aria-hidden />
                  {subject ? tx(subject.name) : section.subjectId}
                </span>
                <span
                  className="pg-sec-score"
                  data-empty={section.score === null ? "true" : undefined}
                >
                  {section.score ?? "—"}
                </span>
                <span className="pg-sec-bar">
                  <span
                    className="pg-sec-fill"
                    style={{
                      width:
                        seen && section.score !== null
                          ? `${((section.score - 200) / 600) * 100}%`
                          : "0%",
                    }}
                  />
                </span>
                <span className="pg-sec-foot">
                  {section.score === null
                    ? fill(t("pg.estimateLocked"), { need: section.need })
                    : fill(t("pg.secFoot"), {
                        accuracy: asPercent(report?.accuracy ?? null),
                        count: section.attempts,
                      })}
                </span>
              </div>
            );
          })}
          <div className="pg-sec-axis">
            <span>200</span>
            <span>800</span>
          </div>

          {measured === null && totals.attempts > 0 && (
            <Link href="/mock" className="btn btn-primary btn-sm mt-5">
              {t("pg.takeMock")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
