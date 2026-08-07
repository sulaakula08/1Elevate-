"use client";

import { useCallback, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

/**
 * The hero's score-report card: four full-length mocks climbing toward 1600.
 *
 * It is a real chart rather than a drawing — hovering (or arrowing) across the
 * plot moves a crosshair to the nearest mock, and the callout and the section
 * breakdown underneath both read from whichever point is active. The intro is
 * pure CSS so it costs nothing and still respects prefers-reduced-motion.
 */

type Point = { label: string; total: number; rw: number; math: number };

const MOCKS: Point[] = [
  { label: "1", total: 1180, rw: 590, math: 590 },
  { label: "2", total: 1260, rw: 630, math: 630 },
  { label: "3", total: 1360, rw: 680, math: 680 },
  { label: "4", total: 1480, rw: 730, math: 750 },
];

/* Plot geometry, in viewBox units. */
const X0 = 70;
const X1 = 372;
const Y_TOP = 64;
const Y_BOTTOM = 236;
const MIN = 1000;
const MAX = 1600;

const xAt = (i: number) => X0 + (i * (X1 - X0)) / (MOCKS.length - 1);
const yAt = (score: number) =>
  Y_BOTTOM - ((score - MIN) / (MAX - MIN)) * (Y_BOTTOM - Y_TOP);

/**
 * A cubic through every point, with tangents taken from the neighbours — the
 * same idea as a Catmull–Rom spline. A polyline would kink at each mock; this
 * reads as a trend, which is what the card is claiming.
 */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

const GRID = [1600, 1400, 1200, 1000];

export function HeroScoreCard({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const svgRef = useRef<SVGSVGElement>(null);
  // null = "no pointer" — the card rests on the latest mock, which is the story
  // it is telling. Hovering borrows the focus; leaving gives it back.
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? MOCKS.length - 1;

  const coords = MOCKS.map((m, i) => ({ x: xAt(i), y: yAt(m.total) }));
  const line = smoothPath(coords);
  const area = `${line} L${X1},${Y_BOTTOM} L${X0},${Y_BOTTOM} Z`;
  const point = MOCKS[active];
  const cx = coords[active].x;
  const cy = coords[active].y;
  // The callout is pinned to the point but clamped inside the card.
  const calloutX = Math.min(Math.max(cx, X0 + 6), X1 - 30);

  /** Nearest point to the pointer, in viewBox space. */
  const track = useCallback((clientX: number) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return;
    const vx = ((clientX - box.left) / box.width) * 420;
    let best = 0;
    for (let i = 1; i < MOCKS.length; i++) {
      if (Math.abs(xAt(i) - vx) < Math.abs(xAt(best) - vx)) best = i;
    }
    setHover(best);
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 420 320"
      className={`hero-chart ${className}`}
      role="img"
      tabIndex={0}
      aria-label={`${t("hero.cardTitle")}: ${MOCKS.map(
        (m) => `${t("hero.mock")} ${m.label} ${m.total}`,
      ).join(", ")}`}
      onPointerMove={(e) => track(e.clientX)}
      onPointerLeave={() => setHover(null)}
      onBlur={() => setHover(null)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") setHover(Math.min(active + 1, MOCKS.length - 1));
        else if (e.key === "ArrowLeft") setHover(Math.max(active - 1, 0));
        else return;
        e.preventDefault();
      }}
    >
      <defs>
        <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.24" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hero-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--s-blue)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
        {/* The wipe: a rect that grows from the left, used to unmask the fill so
            the area appears to follow the line as it draws. */}
        <clipPath id="hero-wipe">
          <rect x={X0} y="0" width={X1 - X0} height="320" className="hero-wipe-rect" />
        </clipPath>
      </defs>

      <rect
        x="0.5"
        y="0.5"
        width="419"
        height="319"
        rx="16"
        fill="var(--surface)"
        stroke="var(--line)"
      />

      {/* ---------------- header ---------------- */}
      <text x="24" y="34" fontSize="13.5" fontWeight="600" fill="var(--foreground)">
        {t("hero.cardTitle")}
      </text>
      <g>
        <rect x="128" y="21" width="60" height="19" rx="9.5" fill="var(--accent-soft)" />
        <text x="158" y="34.5" fontSize="10.5" fontWeight="600" textAnchor="middle" fill="var(--accent)">
          {t("hero.cardTag")}
        </text>
      </g>
      <text x="24" y="50" fontSize="11" fill="var(--faint)">
        {t("hero.cardSub")}
      </text>
      <text x="396" y="34" fontSize="10.5" fontWeight="600" textAnchor="end" fill="var(--faint)">
        {t("hero.goal")}
      </text>

      {/* ---------------- grid ---------------- */}
      {GRID.map((score) => {
        const y = yAt(score);
        return (
          <g key={score}>
            <line
              x1={X0}
              y1={y}
              x2="396"
              y2={y}
              stroke="var(--line)"
              strokeDasharray={score === MAX ? "4 4" : undefined}
            />
            <text x={X0 - 10} y={y + 3.5} fontSize="10" textAnchor="end" fill="var(--faint)">
              {score}
            </text>
          </g>
        );
      })}

      {/* ---------------- crosshair ---------------- */}
      <line
        className="hero-guide"
        x1={cx}
        y1={Y_TOP - 4}
        x2={cx}
        y2={Y_BOTTOM}
        stroke="var(--line-strong)"
        strokeDasharray="3 3"
        opacity={hover === null ? 0 : 1}
      />

      {/* ---------------- the curve ---------------- */}
      <g clipPath="url(#hero-wipe)">
        <path d={area} fill="url(#hero-area)" />
      </g>
      <path
        d={line}
        fill="none"
        stroke="url(#hero-line)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="draw"
      />

      {/* ---------------- points ---------------- */}
      {MOCKS.map((m, i) => {
        const on = i === active;
        return (
          <g key={m.label} className="hero-dot" style={{ animationDelay: `${700 + i * 90}ms` }}>
            {on && (
              <circle cx={coords[i].x} cy={coords[i].y} r="11" fill="var(--accent)" opacity="0.14" />
            )}
            <circle
              className="hero-dot-core"
              cx={coords[i].x}
              cy={coords[i].y}
              r={on ? 5.5 : 4}
              fill={on ? "var(--accent)" : "var(--surface)"}
              stroke="var(--accent)"
              strokeWidth="2.2"
            />
            <text
              x={coords[i].x}
              y="258"
              fontSize="10"
              textAnchor="middle"
              fill={on ? "var(--foreground)" : "var(--faint)"}
              style={{ transition: "fill 180ms ease" }}
            >
              {t("hero.mock")} {m.label}
            </text>
          </g>
        );
      })}

      {/* ---------------- callout ---------------- */}
      {/* Drawn at the origin and moved by transform, so one CSS transition
          glides it diagonally between points instead of two attribute jumps. */}
      <g
        className="hero-callout"
        style={{ transform: `translate(${calloutX - 30}px, ${cy - 36}px)` }}
      >
        <rect x="0" y="0" width="60" height="24" rx="7" fill="var(--foreground)" />
        <text
          x="30"
          y="16.5"
          fontSize="12"
          fontWeight="700"
          textAnchor="middle"
          fill="var(--background)"
        >
          {point.total}
        </text>
      </g>

      {/* ---------------- section breakdown ---------------- */}
      <line x1="24" y1="274" x2="396" y2="274" stroke="var(--line)" />
      <text x="24" y="292" fontSize="10.5" fill="var(--muted)">
        {t("hero.rw")}
      </text>
      <text x="188" y="292" fontSize="11.5" fontWeight="700" textAnchor="end" fill="var(--foreground)">
        {point.rw}
      </text>
      <text x="228" y="292" fontSize="10.5" fill="var(--muted)">
        {t("hero.math")}
      </text>
      <text x="396" y="292" fontSize="11.5" fontWeight="700" textAnchor="end" fill="var(--foreground)">
        {point.math}
      </text>
      <text x="396" y="310" fontSize="9.5" textAnchor="end" fill="var(--faint)">
        {t("hero.caption")}
      </text>
    </svg>
  );
}
