"use client";

import { useId, useState } from "react";
import { useI18n } from "@/lib/i18n";

/**
 * Hero: a score-report card. Four mock results climb toward 1600; pointing at,
 * tapping or tabbing to a result reads out that test's total and its section
 * split, so the card demonstrates the product rather than decorating the page.
 *
 * Nothing here runs an animation loop. Every moving part is either a CSS
 * transition driven by React state or a one-shot CSS animation on mount, so an
 * idle chart costs the browser zero frames — no requestAnimationFrame, no
 * timers, no listeners of our own. Reduced motion is handled in hero.css: the
 * draw-in only exists inside a (prefers-reduced-motion: no-preference) query.
 */

type Mock = { test: number; total: number; verbal: number; math: number };

/**
 * Illustrative marketing data on a signed-out page — the card is labelled as an
 * example. The section scores add up to the total, so the numbers stay honest.
 */
const MOCKS: Mock[] = [
  { test: 1, total: 1180, verbal: 580, math: 600 },
  { test: 2, total: 1270, verbal: 630, math: 640 },
  { test: 3, total: 1360, verbal: 670, math: 690 },
  { test: 4, total: 1480, verbal: 730, math: 750 },
];

/* Plot geometry in viewBox units. The card's chrome is HTML, so the SVG holds
   nothing but the plot and its axes. */
const VB = { w: 400, h: 200 };
const PLOT = { x0: 70, x1: 364, y0: 16, y1: 150 };
const SCALE = { min: 1000, max: 1600 };
const GRID = [1600, 1400, 1200, 1000];

const yFor = (score: number) =>
  PLOT.y1 - ((score - SCALE.min) / (SCALE.max - SCALE.min)) * (PLOT.y1 - PLOT.y0);
const xFor = (index: number) =>
  PLOT.x0 + (index * (PLOT.x1 - PLOT.x0)) / (MOCKS.length - 1);
const pct = (value: number, of: number) => `${(value / of) * 100}%`;

export function HeroScoreChart({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  // null means "nothing pointed at": the newest result stays highlighted so the
  // card has a resting state instead of an empty callout slot.
  const [pointed, setPointed] = useState<number | null>(null);
  const active = pointed ?? MOCKS.length - 1;

  // useId() returns a value containing ':', which is not valid inside url(#…).
  const uid = useId().replace(/:/g, "");
  const strokeId = `${uid}-stroke`;
  const areaId = `${uid}-area`;

  const points = MOCKS.map((mock, i) => ({ ...mock, x: xFor(i), y: yFor(mock.total) }));
  const line = `M${points.map((p) => `${p.x},${p.y}`).join(" L")}`;
  const area = `${line} L${PLOT.x1},${PLOT.y1} L${PLOT.x0},${PLOT.y1} Z`;
  const shown = points[active];

  return (
    <figure className={`hero-chart ${className}`}>
      <div className="hero-chart-card">
        <div className="hero-chart-head">
          <div className="min-w-0">
            <p className="hero-chart-title">{t("hero.chartTitle")}</p>
            <p className="hero-chart-sub">{t("hero.chartSub")}</p>
          </div>
          <span
            className="badge shrink-0"
            style={{
              ["--tone" as string]: "var(--brand)",
              ["--tone-soft" as string]: "var(--brand-soft)",
            }}
          >
            {t("hero.chartSample")}
          </span>
        </div>

        <div className="hero-chart-plot">
          {/* The plot is presentation only; the data lives in the button list
              below it, which is what a screen reader reads. */}
          <svg
            viewBox={`0 0 ${VB.w} ${VB.h}`}
            className="hero-chart-svg"
            aria-hidden
            focusable="false"
          >
            <defs>
              {/* The one brand ramp, blue → violet, reused from the token set. */}
              <linearGradient id={strokeId} x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--s-blue)" />
                <stop offset="55%" stopColor="var(--s-indigo)" />
                <stop offset="100%" stopColor="var(--s-violet)" />
              </linearGradient>
              <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {GRID.map((score) => (
              <g key={score}>
                <line
                  className="hero-chart-grid"
                  x1={PLOT.x0 - 12}
                  y1={yFor(score)}
                  x2={VB.w - 10}
                  y2={yFor(score)}
                  strokeDasharray={score === SCALE.max ? "3 4" : undefined}
                />
                <text
                  className="hero-chart-axis"
                  x={PLOT.x0 - 20}
                  y={yFor(score) + 3.5}
                  textAnchor="end"
                >
                  {score}
                </text>
              </g>
            ))}
            <text
              className="hero-chart-goal"
              x={VB.w - 10}
              y={yFor(SCALE.max) - 7}
              textAnchor="end"
            >
              {t("hero.chartGoal")}
            </text>

            <path className="hero-chart-area" d={area} fill={`url(#${areaId})`} />
            <rect
              className="hero-chart-guide"
              x={shown.x - 0.5}
              y={shown.y}
              width="1"
              height={PLOT.y1 - shown.y}
            />
            <path className="hero-chart-glow" d={line} stroke={`url(#${strokeId})`} />
            <path
              className="hero-chart-line"
              d={line}
              stroke={`url(#${strokeId})`}
              pathLength={1}
            />

            {points.map((p, i) => (
              <g
                key={p.test}
                className={`hero-chart-point${i === active ? " is-active" : ""}`}
                style={{ ["--i" as string]: `${i}` }}
              >
                <circle className="hero-chart-halo" cx={p.x} cy={p.y} r="11" />
                <circle
                  className="hero-chart-dot"
                  cx={p.x}
                  cy={p.y}
                  r="4.5"
                  stroke={`url(#${strokeId})`}
                />
              </g>
            ))}

            {points.map((p) => (
              <text
                key={p.test}
                className="hero-chart-xlabel"
                x={p.x}
                y={VB.h - 5}
                textAnchor="middle"
              >
                {`${t("hero.chartTest")} ${p.test}`}
              </text>
            ))}
          </svg>

          {/* Real buttons rather than SVG hit areas: they are reachable by
              keyboard, sized for a finger, and carry the readable data. */}
          <ul className="hero-chart-hits" aria-label={t("hero.chartPoints")}>
            {points.map((p, i) => (
              <li key={p.test} style={{ left: pct(p.x, VB.w), top: pct(p.y, VB.h) }}>
                <button
                  type="button"
                  className="hero-chart-hit"
                  onPointerEnter={(event) => {
                    if (event.pointerType !== "touch") setPointed(i);
                  }}
                  onPointerLeave={(event) => {
                    if (event.pointerType !== "touch") setPointed(null);
                  }}
                  onPointerDown={() => setPointed(i)}
                  onFocus={() => setPointed(i)}
                  onBlur={() => setPointed(null)}
                >
                  <span className="sr-only">
                    {`${t("hero.chartTest")} ${p.test}: ${p.total} ${t("hero.chartScoreUnit")}. ` +
                      `${t("hero.chartVerbal")} ${p.verbal}, ${t("hero.chartMath")} ${p.math}.`}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div
            className="hero-chart-tip"
            style={{
              left: `clamp(3.25rem, ${pct(shown.x, VB.w)}, calc(100% - 3.25rem))`,
              top: pct(shown.y, VB.h),
            }}
            aria-hidden
          >
            <span className="hero-chart-tip-label">
              {`${t("hero.chartTest")} ${shown.test}`}
            </span>
            <span className="hero-chart-tip-score num">{shown.total}</span>
          </div>
        </div>

        <div className="hero-chart-foot">
          <div className="hero-chart-split">
            <span className="hero-chart-split-name">{t("hero.chartVerbal")}</span>
            <span className="hero-chart-split-value num">{shown.verbal}</span>
          </div>
          <div className="hero-chart-split">
            <span className="hero-chart-split-name">{t("hero.chartMath")}</span>
            <span className="hero-chart-split-value num">{shown.math}</span>
          </div>
        </div>
      </div>

      <figcaption className="hero-chart-note">{t("hero.chartNote")}</figcaption>
    </figure>
  );
}
