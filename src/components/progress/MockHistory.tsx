"use client";

import Link from "next/link";
import { useMemo } from "react";
import { getSubject, subjectColor } from "@/data/exams";
import type { MockReport } from "@/lib/analytics";
import { RULES, asDate, asPercent, asShortDate, fill } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";
import { useInView, useWidth } from "./primitives";

/**
 * The mock journey.
 *
 * There is one genuinely emotional number on this page and it was buried in a
 * four-cell instrument row: the distance travelled since the first full sitting.
 * It now leads at display size, and the chart under it is drawn as a journey —
 * a ribbon across the tops of the columns, the target ruled across, the latest
 * sitting solid and the earlier ones quiet.
 *
 * Scores are still columns rather than a line, because two mocks a month apart
 * are two events and not a continuous quantity; the ribbon connects them without
 * claiming a value for every day in between.
 *
 * Shortened sittings are real and stay in the record, but they are not part of
 * the progression: a two-question test scored on the 400–1600 scale is not
 * comparable with a whole exam, so it sits behind a disclosure instead of
 * appearing as a broken-looking row in the main chart.
 */

const HEIGHT = 236;
const PAD = { top: 34, right: 12, bottom: 34, left: 40 };
const FLOOR = 400;
const CEILING = 1600;

export function MockHistory({
  mocks,
  targetScore,
}: {
  mocks: MockReport;
  targetScore: number;
}) {
  const { t, tx } = useI18n();
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [inRef, seen] = useInView<HTMLDivElement>();

  const runs = mocks.scored;
  const shortened = mocks.runs.filter((run) => !run.full);

  const chart = useMemo(() => {
    const inner = {
      w: Math.max(0, width - PAD.left - PAD.right),
      h: HEIGHT - PAD.top - PAD.bottom,
    };
    const scores = runs.map((run) => run.score);
    const lo = Math.max(
      FLOOR,
      Math.floor((Math.min(...scores, targetScore) - 100) / 50) * 50,
    );
    const hi = Math.min(CEILING, Math.ceil((Math.max(...scores, targetScore) + 30) / 50) * 50);
    const span = Math.max(100, hi - lo);
    const slot = runs.length > 0 ? inner.w / runs.length : inner.w;

    return {
      base: PAD.top + inner.h,
      right: PAD.left + inner.w,
      y: (score: number) => PAD.top + (1 - (score - lo) / span) * inner.h,
      x: (index: number) => PAD.left + slot * index + slot / 2,
      barWidth: Math.max(12, Math.min(52, slot * 0.42)),
      ticks: [lo, hi],
    };
  }, [runs, targetScore, width]);

  const first = runs[0] ?? null;
  const latest = mocks.latest;

  return (
    <div ref={inRef}>
      {/* The journey, as one number. */}
      <div className="pg-journey">
        {mocks.gain !== null && first ? (
          <>
            <p className="pg-journey-figure" data-good={mocks.gain >= 0 ? "true" : undefined}>
              {mocks.gain > 0 ? "+" : ""}
              {mocks.gain}
            </p>
            <div className="min-w-0">
              <p className="pg-journey-head">{t("pg.journeyHead")}</p>
              <p className="pg-journey-sub">
                {fill(t("pg.journeySub"), {
                  date: asDate(first.at),
                  count: runs.length,
                })}
              </p>
            </div>
          </>
        ) : (
          <div className="min-w-0">
            <p className="pg-journey-head">
              {latest ? fill(t("pg.journeyFirst"), { score: latest.score }) : t("pg.mockNone")}
            </p>
            <p className="pg-journey-sub">{t("pg.mockOne")}</p>
          </div>
        )}
      </div>

      {runs.length > 1 && (
        <div ref={wrapRef} className="pg-chart" style={{ height: HEIGHT }}>
          {width > 0 && (
            <svg width={width} height={HEIGHT} role="img" aria-label={t("pg.mocks")}>
              {chart.ticks.map((value) => (
                <g key={value}>
                  <line
                    className="pg-gridline"
                    x1={PAD.left}
                    x2={chart.right}
                    y1={chart.y(value)}
                    y2={chart.y(value)}
                  />
                  <text
                    className="pg-tick"
                    x={PAD.left - 8}
                    y={chart.y(value) + 3}
                    textAnchor="end"
                  >
                    {value}
                  </text>
                </g>
              ))}

              {/* The destination, ruled across the whole history. */}
              <line
                x1={PAD.left}
                x2={chart.right}
                y1={chart.y(targetScore)}
                y2={chart.y(targetScore)}
                stroke="var(--foreground)"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.45"
              />
              <text
                className="pg-tick"
                x={PAD.left + 2}
                y={chart.y(targetScore) - 6}
                fill="var(--foreground)"
                fontWeight="600"
              >
                {fill(t("pg.mockTargetRule"), { target: targetScore })}
              </text>

              {/* The ribbon across the tops: a journey, not five bars. */}
              <path
                d={runs
                  .map(
                    (run, index) =>
                      `${index === 0 ? "M" : "L"}${chart.x(index)},${chart.y(run.score)}`,
                  )
                  .join(" ")}
                fill="none"
                stroke="var(--brand)"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity={seen ? 0.35 : 0}
                style={{ transition: "opacity 700ms ease 500ms" }}
              />

              {runs.map((run, index) => {
                const top = chart.y(run.score);
                const full = chart.base - top;
                const last = index === runs.length - 1;
                return (
                  <g key={run.id}>
                    <rect
                      className="pg-bar"
                      x={chart.x(index) - chart.barWidth / 2}
                      y={seen ? top : chart.base}
                      width={chart.barWidth}
                      height={seen ? Math.max(0, full) : 0}
                      rx={4}
                      fill={
                        last
                          ? "var(--brand)"
                          : "color-mix(in srgb, var(--brand) 20%, var(--surface))"
                      }
                      style={{
                        transition: `y 700ms cubic-bezier(0.22,0.61,0.36,1) ${index * 70}ms, height 700ms cubic-bezier(0.22,0.61,0.36,1) ${index * 70}ms`,
                      }}
                    />
                    <text
                      className="pg-tick"
                      x={chart.x(index)}
                      y={top - 9}
                      textAnchor="middle"
                      fill={last ? "var(--foreground)" : "var(--muted)"}
                      fontWeight="600"
                    >
                      {run.score}
                    </text>
                    <text
                      className="pg-tick"
                      x={chart.x(index)}
                      y={chart.base + 16}
                      textAnchor="middle"
                    >
                      {asShortDate(run.at)}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      )}

      {/* One quiet line where the four-cell row used to be. */}
      <p className="pg-mock-line">
        {[
          latest && fill(t("pg.mockLatestLine"), { score: latest.score }),
          mocks.best && fill(t("pg.mockBestLine"), { score: mocks.best.score }),
          mocks.perMock !== null &&
            fill(t("pg.mockPerLine"), {
              points: `${mocks.perMock > 0 ? "+" : ""}${mocks.perMock}`,
            }),
          latest &&
            targetScore - latest.score > 0 &&
            fill(t("pg.mockToTarget"), { points: targetScore - latest.score }),
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

      <div className="pg-mock-more">
        <details className="pg-method">
          <summary>
            <span className="pg-method-caret" aria-hidden>
              ›
            </span>
            {t("pg.mockRaw")}
          </summary>
          <div className="pg-mock-rows">
            {[...runs].reverse().map((run) => (
              <div key={run.id} className="pg-mock-row">
                <span className="pg-mock-row-date">
                  {asDate(run.at)}
                  {run.setIndex ? ` · ${fill(t("pg.mockSet"), { index: run.setIndex })}` : ""}
                </span>
                <span className="pg-mock-split" aria-hidden>
                  {run.bySubject.map((section) => (
                    <span
                      key={section.subjectId}
                      style={{
                        width: `${(section.total / 98) * 100}%`,
                        ["--tone" as string]: subjectColor(section.subjectId),
                        opacity: 0.35 + section.accuracy * 0.65,
                      }}
                    />
                  ))}
                </span>
                <span className="pg-mock-score">
                  {run.bySubject
                    .map(
                      (section) =>
                        `${tx(getSubject(section.subjectId)?.name).split(" ")[0]} ${asPercent(
                          section.accuracy,
                        )}`,
                    )
                    .join(" · ")}
                </span>
              </div>
            ))}
            {mocks.practiceAccuracy !== null && (
              <p className="pg-mock-note">
                {fill(t("pg.mockGapLine"), {
                  mock: asPercent(mocks.mockAccuracy),
                  practice: asPercent(mocks.practiceAccuracy),
                })}
              </p>
            )}
          </div>
        </details>

        {shortened.length > 0 && (
          <details className="pg-method">
            <summary>
              <span className="pg-method-caret" aria-hidden>
                ›
              </span>
              {fill(t("pg.mockShortCount"), { count: shortened.length })}
            </summary>
            <div className="pg-mock-rows">
              <p className="pg-mock-note">
                {fill(t("pg.mockShortened"), { min: RULES.mockMinQuestions })}
              </p>
              {shortened.map((run) => (
                <div key={run.id} className="pg-mock-row">
                  <span className="pg-mock-row-date">{asDate(run.at)}</span>
                  <span className="pg-mock-score">
                    {fill(t("pg.mockShortRow"), {
                      answered: run.total,
                      correct: run.correct,
                    })}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      <Link href="/mock" className="btn btn-sm mt-5">
        {t("pg.takeMock")}
      </Link>
    </div>
  );
}
