"use client";

import { useMemo, useState } from "react";
import { getSubject, subjectColor } from "@/data/exams";
import type { LevelReport, SpeedReport } from "@/lib/analytics";
import { RULES, asDuration, asPercent, fill } from "@/lib/analytics";
import { difficultyColor } from "@/lib/stats";
import { useI18n } from "@/lib/i18n";
import { Delta, Void, useInView, useWidth } from "./primitives";

/**
 * Two readings of the same practice: how hard the questions were, and how long
 * they took.
 *
 * They sit side by side because they answer the same question from opposite
 * ends — a student losing points on hard questions and a student losing them by
 * running out of time need different weeks — and difficulty is the narrower of
 * the two, so it takes the narrow column.
 */

/**
 * Difficulty, compacted.
 *
 * The first pass gave the three tiers a full-width row each with equal weight,
 * which buried the only interesting thing in it: the drop. The gap now leads as
 * a sentence, and the three tiers are three short bars under it.
 */
export function DifficultyBreakdown({ levels }: { levels: LevelReport[] }) {
  const { t } = useI18n();
  const [ref, seen] = useInView<HTMLDivElement>();

  const easy = levels[0];
  const hard = levels[2];
  /* Both ends need enough answers before the drop is called a finding. */
  const gap =
    easy.accuracy !== null &&
    hard.accuracy !== null &&
    easy.attempts >= RULES.reliable &&
    hard.attempts >= RULES.reliable
      ? Math.round((easy.accuracy - hard.accuracy) * 100)
      : null;

  return (
    <div ref={ref}>
      <h3 className="pg-zone">{t("pg.difficulty")}</h3>

      {gap !== null && (
        <div className="pg-diff-lede">
          <p className="pg-diff-head">
            {gap >= 12 ? t("pg.diffGapHead") : t("pg.diffHoldHead")}
          </p>
          <p className="pg-diff-body">
            {fill(gap >= 12 ? t("pg.diffGapBody") : t("pg.diffHoldBody"), {
              points: Math.abs(gap),
            })}
          </p>
        </div>
      )}

      <div className="pg-levels">
        {levels.map((level) => (
          <div
            key={level.level}
            className="pg-level"
            style={{ ["--tone" as string]: difficultyColor(level.level) }}
          >
            <span className="pg-level-name">{t(`diff.${level.level}`)}</span>
            <span className="pg-level-value">
              {asPercent(level.accuracy)}
              <Delta value={level.change.delta} good="up" />
            </span>
            <span className="pg-level-track">
              <span
                className="pg-level-fill"
                style={{ width: seen ? `${(level.accuracy ?? 0) * 100}%` : "0%" }}
              />
            </span>
            <span className="pg-level-meta">
              {level.attempts === 0
                ? t("pg.difficultyNone")
                : fill(t("pg.diffMeta"), {
                    attempts: level.attempts,
                    pace: asDuration(level.seconds),
                  })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const HEIGHT = 300;
const PAD = { top: 26, right: 20, bottom: 38, left: 42 };

/**
 * Speed against accuracy, one point per domain.
 *
 * The axes cross at the student's own median pace and their own accuracy, so the
 * four quadrants read "slower than you usually are" rather than "slower than
 * some benchmark nobody published". The quadrants are now tinted — a few percent
 * of green in the corner where fast and right meet, a few percent of red where
 * slow and wrong do — so the chart says which corner is which before the legend
 * is read. The worst offender is labelled on the plot itself, because it is the
 * one point the section exists to surface.
 *
 * Points are sized by how many answers are behind them: a confident-looking
 * outlier resting on four questions is visibly smaller than one resting on
 * forty.
 */
export function SpeedAccuracy({ speed }: { speed: SpeedReport }) {
  const { t } = useI18n();
  const [active, setActive] = useState<number | null>(null);
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [inRef, seen] = useInView<HTMLDivElement>();

  const height = width > 0 && width < 420 ? 250 : HEIGHT;

  const chart = useMemo(() => {
    const points = speed.points;
    const inner = {
      w: Math.max(0, width - PAD.left - PAD.right),
      h: height - PAD.top - PAD.bottom,
    };
    const seconds = points.map((point) => point.seconds);
    const accuracies = points.map((point) => point.accuracy);
    const xMax = Math.max(speed.midSeconds * 1.35, ...seconds.map((s) => s * 1.12), 30);
    const yLo = Math.max(0, Math.min(speed.midAccuracy, ...accuracies) - 0.08);
    const yHi = Math.min(1, Math.max(speed.midAccuracy, ...accuracies) + 0.08);
    const ySpan = Math.max(0.12, yHi - yLo);

    const x = (value: number) => PAD.left + (value / xMax) * inner.w;
    const y = (value: number) => PAD.top + (1 - (value - yLo) / ySpan) * inner.h;
    const maxAttempts = Math.max(1, ...points.map((point) => point.attempts));

    /* The one point worth naming on the plot: slowest of the slow-and-wrong. */
    const worst = points.reduce<{ index: number; seconds: number } | null>(
      (found, point, index) =>
        point.quadrant === "slowInaccurate" && (!found || point.seconds > found.seconds)
          ? { index, seconds: point.seconds }
          : found,
      null,
    );

    return {
      points,
      x,
      y,
      xMax,
      base: PAD.top + inner.h,
      right: PAD.left + inner.w,
      mid: { x: x(speed.midSeconds), y: y(speed.midAccuracy) },
      radius: (attempts: number) =>
        7 + Math.sqrt(attempts / maxAttempts) * (width < 520 ? 4 : 6),
      xTicks: [0.33, 0.66, 1].map((share) => Math.round(xMax * share)),
      yTicks: (() => {
        const out: number[] = [];
        for (let value = Math.ceil(yLo * 10) / 10; value <= yHi + 1e-9; value += 0.1) {
          out.push(Math.round(value * 100) / 100);
        }
        return out.length > 0 ? out : [Math.round(((yLo + yHi) / 2) * 100) / 100];
      })(),
      worst: worst?.index ?? null,
    };
  }, [height, speed, width]);

  if (speed.points.length < 3) {
    return (
      <div>
        <h3 className="pg-zone">{t("pg.speed")}</h3>
        <Void title={t("pg.empty")} body={t("pg.speedEmpty")} />
      </div>
    );
  }

  const hovered = active === null ? null : chart.points[active];

  return (
    <div ref={inRef}>
      <div className="pg-zone-row">
        <h3 className="pg-zone">
          {t("pg.speed")}
          <span className="pg-zone-note">{t("pg.speedDeck")}</span>
        </h3>
      </div>

      <div className="pg-quad">
        <div ref={wrapRef} className="pg-chart" style={{ height }}>
          {width > 0 && (
            <svg width={width} height={height} role="img" aria-label={t("pg.speedDeck")}>
              {/* The four zones, as surfaces rather than as words. Three or four
                  percent of a semantic hue is enough to say which corner you are
                  looking at; any more and the data sits on a traffic light. */}
              <rect
                x={PAD.left}
                y={PAD.top}
                width={Math.max(0, chart.mid.x - PAD.left)}
                height={Math.max(0, chart.mid.y - PAD.top)}
                fill="color-mix(in srgb, var(--success) 7%, transparent)"
              />
              <rect
                x={chart.mid.x}
                y={chart.mid.y}
                width={Math.max(0, chart.right - chart.mid.x)}
                height={Math.max(0, chart.base - chart.mid.y)}
                fill="color-mix(in srgb, var(--danger) 7%, transparent)"
              />

              {chart.yTicks.map((value) => (
                <g key={`y${value}`}>
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
                    {Math.round(value * 100)}%
                  </text>
                </g>
              ))}
              {chart.xTicks.map((value) => (
                <text
                  key={`x${value}`}
                  className="pg-tick"
                  x={chart.x(value)}
                  y={chart.base + 16}
                  textAnchor="middle"
                >
                  {asDuration(value)}
                </text>
              ))}

              {/* The student's own medians: the cross that makes this a quadrant
                  chart rather than a scatter. */}
              <line
                x1={chart.mid.x}
                x2={chart.mid.x}
                y1={PAD.top}
                y2={chart.base}
                stroke="color-mix(in srgb, var(--foreground) 22%, transparent)"
                strokeDasharray="4 4"
              />
              <line
                x1={PAD.left}
                x2={chart.right}
                y1={chart.mid.y}
                y2={chart.mid.y}
                stroke="color-mix(in srgb, var(--foreground) 22%, transparent)"
                strokeDasharray="4 4"
              />

              <text className="pg-quad-label" x={PAD.left + 4} y={PAD.top - 8}>
                {t("pg.quad.fastAccurate")}
              </text>
              <text
                className="pg-quad-label"
                x={chart.right}
                y={chart.base - 6}
                textAnchor="end"
                data-warn="true"
              >
                {t("pg.quad.slowInaccurate")}
              </text>

              {chart.points.map((point, index) => {
                const tone = subjectColor(point.subjectId);
                const on = active === index;
                return (
                  <g
                    key={point.key}
                    onMouseEnter={() => setActive(index)}
                    onMouseLeave={() =>
                      setActive((current) => (current === index ? null : current))
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <circle
                      cx={chart.x(point.seconds)}
                      cy={chart.y(point.accuracy)}
                      r={seen ? chart.radius(point.attempts) : 0}
                      fill={tone}
                      fillOpacity={on ? 0.95 : 0.8}
                      stroke="var(--surface)"
                      strokeWidth="1.5"
                      style={{
                        transition: `r 620ms cubic-bezier(0.22,0.61,0.36,1) ${index * 45}ms, fill-opacity 160ms ease`,
                      }}
                    />
                    <text
                      x={chart.x(point.seconds)}
                      y={chart.y(point.accuracy) + 3.5}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fill="var(--surface)"
                      style={{ pointerEvents: "none" }}
                    >
                      {index + 1}
                    </text>
                    <title>
                      {fill(t("pg.speedPoint"), {
                        name: point.key,
                        seconds: asDuration(point.seconds),
                        accuracy: asPercent(point.accuracy),
                        attempts: point.attempts,
                      })}
                    </title>
                  </g>
                );
              })}

              {/*
                The worst offender gets a ring rather than a label.

                Writing the name on the plot put fifteen characters across the
                cluster it was pointing into. A ring draws the eye to the same
                point without covering its neighbours, and the name is one row
                away in the legend — flagged there for the same reason.
              */}
              {chart.worst !== null && chart.points[chart.worst] && seen && (
                <circle
                  cx={chart.x(chart.points[chart.worst].seconds)}
                  cy={chart.y(chart.points[chart.worst].accuracy)}
                  r={chart.radius(chart.points[chart.worst].attempts) + 5}
                  fill="none"
                  stroke="var(--danger)"
                  strokeWidth="1.5"
                  strokeOpacity="0.55"
                  style={{ pointerEvents: "none" }}
                />
              )}

              <text className="pg-tick" x={chart.right} y={height - 4} textAnchor="end">
                {t("pg.speedX")} →
              </text>
            </svg>
          )}

          {hovered && (
            <div
              className="pg-tip"
              data-show="true"
              style={{
                left: Math.min(Math.max(chart.x(hovered.seconds), 8), Math.max(8, width - 8)),
                top: Math.max(4, chart.y(hovered.accuracy) - 88),
                transform: `translateX(${
                  chart.x(hovered.seconds) > width / 2 ? "calc(-100% - 14px)" : "14px"
                })`,
              }}
            >
              <p className="pg-tip-date">{hovered.key}</p>
              <p className="pg-tip-row">
                <span>{t("pg.speedY")}</span>
                <span>{asPercent(hovered.accuracy)}</span>
              </p>
              <p className="pg-tip-row">
                <span>{t("pg.colPace")}</span>
                <span>{asDuration(hovered.seconds)}</span>
              </p>
              <p className="pg-tip-note">
                {t(`pg.quad.${hovered.quadrant}`)} · {hovered.attempts}
              </p>
            </div>
          )}
        </div>

        {/* The legend is the readable half: eight names on the plot would
            collide, so the plot carries numbers and this carries the names. */}
        <div className="pg-quad-list">
          <p className="pg-quad-you">
            {fill(t("pg.speedYou"), {
              seconds: asDuration(speed.midSeconds),
              accuracy: asPercent(speed.midAccuracy),
            })}
          </p>
          {chart.points.map((point, index) => (
            <button
              key={point.key}
              type="button"
              className="pg-quad-row"
              data-active={active === index ? "true" : undefined}
              data-worst={index === chart.worst ? "true" : undefined}
              style={{ ["--tone" as string]: subjectColor(point.subjectId) }}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive((current) => (current === index ? null : current))}
              onFocus={() => setActive(index)}
              onBlur={() => setActive((current) => (current === index ? null : current))}
            >
              <span className="pg-quad-index" aria-hidden>
                {index + 1}
              </span>
              <span className="pg-quad-name">
                {point.key}
                <span className="sr-only">
                  {` — ${getSubject(point.subjectId)?.name.en ?? ""}, ${t(
                    `pg.quad.${point.quadrant}`,
                  )}`}
                </span>
              </span>
              <span className="pg-quad-num">{asDuration(point.seconds)}</span>
              <span className="pg-quad-num">{asPercent(point.accuracy)}</span>
            </button>
          ))}
          <details className="pg-method">
            <summary>
              <span className="pg-method-caret" aria-hidden>
                ›
              </span>
              {t("pg.speedMethod")}
            </summary>
            <p className="pg-method-body">{t("pg.speedHint")}</p>
          </details>
        </div>
      </div>
    </div>
  );
}
