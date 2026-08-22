"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { subjectColor, subjectsFor } from "@/data/exams";
import type { TrendPoint, TrendRange, TrendSeries } from "@/lib/analytics";
import { RULES, asDate, asPercent, asShortDate, fill } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";
import {
  Delta,
  Segmented,
  Void,
  useInView,
  useReducedMotion,
  useWidth,
} from "./primitives";

/**
 * The trajectory: rolling accuracy over time.
 *
 * The one chart on this page a student will come back for, so it is the one
 * that gets the interaction budget — a crosshair, a real tooltip, a keyboard
 * path through the same data, mock scores marked on the timeline, and the day's
 * own volume drawn underneath the line so a spike is never read as progress
 * when it was four questions on a Tuesday.
 *
 * Drawn in real pixels from a measured width rather than scaled from a fixed
 * viewBox: a scaled chart takes its type with it, and an 11px axis label is
 * either 8px on a phone or 15px on a desktop. Measuring keeps the chart's
 * typography identical to the page's.
 *
 * What the line is: a trailing average, over a window that grows with the range
 * (3 days at a week, 14 at a quarter). Daily accuracy on a study product is
 * mostly sample-size noise; a rolling window is the smallest honest way to make
 * the shape of a month readable. The window length is printed above the chart.
 */

type SeriesKey = "overall" | string;

const HEIGHT = 276;
const SHORT_HEIGHT = 208;
/* Top padding carries the one annotation the range is allowed; bottom carries
   the date row and the mock timeline under it. */
/* The bottom band holds two rows: the dates, and the mock timeline under them.
   Sharing one row put a sitting's score on top of a date. */
const PAD = { top: 30, right: 16, bottom: 56, left: 38 };
const DATE_ROW = 16;
const MARK_ROW = 34;
const MARK_LABEL_ROW = 48;

/** "Reading" / "Math" — the tooltip is 15rem wide and the full name wraps. */
function shortSubject(subjectId: string): string {
  return subjectId === "sat-math" ? "Math" : "Reading";
}

/** Module scope so the geometry memo does not depend on a fresh closure. */
function valueOf(point: TrendPoint, key: SeriesKey): number | null {
  return key === "overall" ? point.overall : (point.bySubject[key] ?? null);
}

export function Trajectory({ trend }: { trend: Record<TrendRange, TrendSeries> }) {
  const { t, tx } = useI18n();
  const [range, setRange] = useState<TrendRange>("30d");
  const [series, setSeries] = useState<SeriesKey>("overall");
  const [hover, setHover] = useState<number | null>(null);
  /** A hovered mock marker takes the tooltip over the day under the pointer. */
  const [mark, setMark] = useState<number | null>(null);
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [inRef, seen] = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const lineRef = useRef<SVGPathElement | null>(null);

  const data = trend[range];
  const subjects = subjectsFor("sat");
  const height = width > 0 && width < 420 ? SHORT_HEIGHT : HEIGHT;

  /* The plotted geometry. Recomputed only when the data, the width or the
     chosen series actually change — pointer movement must never recompute a
     scale. */
  const chart = useMemo(() => {
    const points = data.points;
    const inner = {
      w: Math.max(0, width - PAD.left - PAD.right),
      h: height - PAD.top - PAD.bottom,
    };
    const values: number[] = [];
    for (const point of points) {
      const own = valueOf(point, series);
      if (own !== null) values.push(own);
      if (series !== "overall" && point.overall !== null) values.push(point.overall);
    }

    /*
     * A dynamic y domain, snapped to ten-point steps.
     *
     * A fixed 0–100% axis is honest and useless: a month in which a student went
     * from 71% to 84% is a flat line across the middle of it. Snapping to whole
     * tens keeps the axis labels round, and the floor never rises above the
     * lowest plotted value.
     */
    const min = values.length > 0 ? Math.min(...values) : 0;
    const max = values.length > 0 ? Math.max(...values) : 1;
    const lo = Math.max(0, Math.floor((min - 0.06) * 10) / 10);
    const hi = Math.min(1, Math.ceil((max + 0.06) * 10) / 10);
    const span = Math.max(0.1, hi - lo);

    const step = points.length > 1 ? inner.w / (points.length - 1) : 0;
    const x = (index: number) => PAD.left + index * step;
    const y = (value: number) => PAD.top + (1 - (value - lo) / span) * inner.h;

    const base = PAD.top + inner.h;

    /**
     * The line, split wherever the rolling window was too thin to average.
     *
     * A gap is drawn as a gap. Joining across it would invent a straight line
     * through a fortnight nobody practised, which is the one thing a progress
     * chart must not do.
     */
    const segmentsFor = (key: SeriesKey): [number, number][][] => {
      const out: [number, number][][] = [];
      let run: [number, number][] = [];
      points.forEach((point, index) => {
        const value = valueOf(point, key);
        if (value === null) {
          if (run.length > 0) out.push(run);
          run = [];
          return;
        }
        run.push([x(index), y(value)]);
      });
      if (run.length > 0) out.push(run);
      return out;
    };

    const draw = (run: [number, number][]) =>
      run
        .map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(2)},${py.toFixed(2)}`)
        .join("");

    const pathFor = (key: SeriesKey) => segmentsFor(key).map(draw).join(" ");

    const areaFor = (key: SeriesKey) =>
      segmentsFor(key)
        .filter((run) => run.length > 1)
        .map(
          (run) =>
            `${draw(run)}L${run[run.length - 1][0].toFixed(2)},${base}L${run[0][0].toFixed(
              2,
            )},${base}Z`,
        )
        .join(" ");

    const maxCount = Math.max(1, ...points.map((point) => point.count));
    /* The volume band owns the bottom fifth of the plot and never overlaps the
       lowest plotted accuracy, so the two readings cannot be confused. */
    const bars = points.map((point, index) => ({
      x: x(index) - Math.max(1, Math.min(9, step * 0.42)) / 2,
      w: Math.max(1, Math.min(9, step * 0.42)),
      h: point.count === 0 ? 0 : Math.max(1.5, (point.count / maxCount) * (inner.h * 0.2)),
      count: point.count,
    }));

    /* Four or five date ticks, evenly spaced, first and last always shown. */
    const tickCount = width < 420 ? 3 : width < 700 ? 4 : 5;
    const ticks =
      points.length <= 1
        ? points.map((_, index) => index)
        : Array.from({ length: tickCount }, (_, i) =>
            Math.round((i * (points.length - 1)) / (tickCount - 1)),
          ).filter((value, i, all) => all.indexOf(value) === i);

    /* Gridlines on tens, at most five of them, so a tall range does not end up
       ruled like graph paper. */
    const gridStep = span > 0.5 ? 0.2 : 0.1;
    const grid: number[] = [];
    for (let value = lo; value <= hi + 1e-9; value += gridStep) {
      grid.push(Math.round(value * 100) / 100);
    }

    /* Below a fortnight of points the line is short enough that each day is a
       readable mark, and a single isolated day would otherwise draw nothing at
       all — a one-point path has no stroke. */
    const dots =
      points.length <= 14
        ? points
            .map((point, index) => {
              const value = valueOf(point, series);
              return value === null ? null : { x: x(index), y: y(value) };
            })
            .filter((dot): dot is { x: number; y: number } => dot !== null)
        : [];

    /*
     * Where the callout sits.
     *
     * The label is pushed to whichever side keeps it inside the plot, and the
     * leader is a straight drop from the point — a curved connector at this size
     * reads as decoration rather than as a pointer.
     */
    const note = data.note;
    const noteValue = note ? valueOf(points[note.index] ?? points[0], "overall") : null;
    const noteAt =
      note && noteValue !== null
        ? (() => {
            const px = x(note.index);
            const py = y(noteValue);
            const near = px > PAD.left + inner.w * 0.72;
            /*
             * The label goes where there is space, not where the trend points.
             *
             * Near the right-hand edge that means the top margin: anchored to
             * the end, a label there is written back across the line it is
             * describing. Everywhere else it sits above a low point and below a
             * high one, clear of the shape either way.
             */
            const low = py > PAD.top + inner.h * 0.55;
            const label = near
              ? PAD.top - 12
              : low
                ? Math.max(PAD.top + 10, py - 32)
                : Math.min(base - 14, py + 34);
            return {
              x: px,
              y: py,
              label,
              textX: near ? px - 8 : px + 8,
              anchor: (near ? "end" : "start") as "end" | "start",
            };
          })()
        : null;

    return { points, lo, hi, span, step, x, y, pathFor, areaFor, bars, ticks, grid, dots, base, noteAt };
  }, [data, height, series, width]);

  const active = hover !== null ? chart.points[hover] : null;
  const drawn = seen && width > 0;
  const path = chart.pathFor(series);

  /*
   * Draw the line on, from its own measured length.
   *
   * The obvious version of this is `pathLength={1}` with a dash array of 1, so
   * the dash maths needs no measurement — but Chrome does not scale the dash
   * pattern by `pathLength` here, and the line rendered as a 1px dotted ghost
   * instead of a stroke. Measuring is a few lines and is what actually works.
   *
   * Written to the node rather than to state on purpose: this is a visual
   * property of an element that already exists, and routing it through a render
   * would mean a second pass on every resize.
   */
  useEffect(() => {
    const node = lineRef.current;
    if (!node) return;
    const length = node.getTotalLength();
    if (!Number.isFinite(length) || length === 0) return;
    node.style.strokeDasharray = `${length}`;
    node.style.strokeDashoffset = drawn || reduced ? "0" : `${length}`;
  }, [path, drawn, reduced, width]);

  const rangeOptions: { value: TrendRange; label: string }[] = [
    { value: "7d", label: t("pg.range7d") },
    { value: "30d", label: t("pg.range30d") },
    { value: "90d", label: t("pg.range90d") },
    { value: "all", label: t("pg.rangeAll") },
  ];
  const seriesOptions = [
    { value: "overall" as SeriesKey, label: t("pg.trendBoth") },
    ...subjects.map((subject) => ({
      value: subject.id as SeriesKey,
      label: tx(subject.name),
    })),
  ];

  const tone = series === "overall" ? "var(--brand)" : subjectColor(series);
  const thin = data.attempts < RULES.trendMin * 2;

  /** Pointer to index. Reads the rect each time, so a resized window is right. */
  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (chart.points.length === 0) return;
    const box = event.currentTarget.getBoundingClientRect();
    const local = event.clientX - box.left;
    const index =
      chart.step > 0
        ? Math.round((local - PAD.left) / chart.step)
        : 0;
    setHover(Math.max(0, Math.min(chart.points.length - 1, index)));
  };

  const onKey = (event: React.KeyboardEvent) => {
    const last = chart.points.length - 1;
    if (last < 0) return;
    const at = hover ?? last;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setHover(Math.min(last, at + 1));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setHover(Math.max(0, at - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setHover(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setHover(last);
    } else if (event.key === "Escape") {
      setHover(null);
    }
  };

  const tipLeft = active !== null && hover !== null ? chart.x(hover) : 0;
  /* Clamped inside the frame and flipped past the midpoint, so the tooltip is
     never half off the right edge of a phone. */
  const tipStyle: React.CSSProperties = {
    left: Math.min(Math.max(tipLeft, 8), Math.max(8, width - 8)),
    top: PAD.top,
    transform: `translate(${tipLeft > width / 2 ? "calc(-100% - 12px)" : "12px"}, 0)`,
  };

  return (
    <div ref={inRef}>
      <div className="pg-zone-row">
        <h3 className="pg-zone">{t("pg.trend")}</h3>
        <div className="pg-trend-controls">
          <Segmented
            value={range}
            options={rangeOptions}
            onChange={(value) => {
              setRange(value);
              setHover(null);
              setMark(null);
            }}
            label={t("pg.rangeLabel")}
          />
          <Segmented
            value={series}
            options={seriesOptions}
            onChange={(value) => setSeries(value)}
            label={t("pg.seriesLabel")}
          />
        </div>
      </div>

      {/* Range summary: the number the chart is about, and how it compares with
          the period before it — the comparison a line alone cannot state. */}
      <div className="pg-trend-summary">
        <span className="pg-trend-value">{asPercent(data.compare.current)}</span>
        <Delta value={data.compare.delta} good="up" fallback={t("pg.noBaseline")} />
        <span className="pg-trend-aside">
          {data.compare.delta !== null &&
            `${fill(t("pg.vsPrevious"), {
              days: range === "all" ? chart.points.length : Number(range.replace(/\D/g, "")),
            })} · `}
          {/* The window is part of what the number means, so it is stated beside
              it and re-stated when the range control changes it. */}
          {fill(t("pg.trendHint"), { window: data.windowDays })}
        </span>
      </div>

      {thin ? (
        <Void
          title={t("pg.empty")}
          body={fill(t("pg.trendEmpty"), {
            need: Math.max(1, RULES.trendMin * 2 - data.attempts),
          })}
        />
      ) : (
        <div
          ref={wrapRef}
          className="pg-chart pg-chart-cursor mt-2"
          style={{ height }}
          tabIndex={0}
          role="application"
          aria-label={`${t("pg.trend")} — ${fill(t("pg.trendHint"), {
            window: data.windowDays,
          })}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
        >
          {width > 0 && (
            <svg width={width} height={height} aria-hidden focusable="false">
              <defs>
                <linearGradient id="pg-trend-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tone} stopOpacity="0.17" />
                  <stop offset="72%" stopColor={tone} stopOpacity="0.02" />
                  <stop offset="100%" stopColor={tone} stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* grid + y labels */}
              {chart.grid.map((value) => (
                <g key={value}>
                  <line
                    className="pg-gridline"
                    x1={PAD.left}
                    x2={width - PAD.right}
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

              {/*
                Mock exams as events on the timeline.

                A mock is a thing that happened on a date, so its marker sits on
                the date axis with a hairline rising to the accuracy line rather
                than floating above the plot with nothing under it. The score is
                printed beside the marker when the range is short enough to have
                room for it, and the hover carries the sitting in full.
              */}
              {data.marks.map((item, markIndex) => {
                const index = chart.points.findIndex((point) => point.day === item.day);
                if (index < 0) return null;
                const mx = chart.x(index);
                const on = mark === markIndex;
                /* Two sittings three days apart are 12px apart on a phone, and
                   their scores print on top of each other. The marker always
                   shows; the number only when it has room. */
                const previous = data.marks[markIndex - 1];
                const previousIndex = previous
                  ? chart.points.findIndex((point) => point.day === previous.day)
                  : -1;
                const room =
                  previousIndex < 0 || Math.abs(mx - chart.x(previousIndex)) > 38;
                return (
                  <g
                    key={`${item.ms}-${item.score}`}
                    onMouseEnter={() => setMark(markIndex)}
                    onMouseLeave={() =>
                      setMark((current) => (current === markIndex ? null : current))
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <line
                      x1={mx}
                      x2={mx}
                      y1={PAD.top}
                      y2={chart.base + MARK_ROW}
                      stroke={
                        on
                          ? "color-mix(in srgb, var(--brand) 55%, transparent)"
                          : "color-mix(in srgb, var(--foreground) 14%, transparent)"
                      }
                      strokeWidth="1"
                      strokeDasharray="2 4"
                    />
                    {/* An invisible target, so a 7px marker is still hoverable. */}
                    <rect
                      x={mx - 12}
                      y={chart.base + MARK_ROW - 12}
                      width={24}
                      height={26}
                      fill="transparent"
                    />
                    <circle
                      cx={mx}
                      cy={chart.base + MARK_ROW}
                      r={on ? 5 : 4}
                      fill="var(--brand)"
                      stroke="var(--surface)"
                      strokeWidth="2"
                      style={{ transition: "r 140ms ease" }}
                    />
                    {data.marks.length <= 5 && room && (
                      <text
                        className="pg-tick"
                        x={mx}
                        y={chart.base + MARK_LABEL_ROW}
                        textAnchor="middle"
                        fill={on ? "var(--foreground)" : "var(--muted)"}
                        fontWeight="600"
                      >
                        {item.score}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* the reference line: your overall, when a section is selected */}
              <g key={`${range}:${series}`} className="fade-in">
                {series !== "overall" && (
                  <path
                    d={chart.pathFor("overall")}
                    fill="none"
                    stroke="var(--faint)"
                    strokeWidth="1.25"
                    strokeDasharray="3 3"
                    opacity="0.7"
                  />
                )}

                <path
                  className="pg-area"
                  data-drawn={drawn ? "true" : undefined}
                  d={chart.areaFor(series)}
                  fill="url(#pg-trend-fill)"
                />
                <path
                  ref={lineRef}
                  className="pg-line"
                  d={path}
                  stroke={tone}
                  /* Hidden until measured, so the first paint is never a full
                     line that then re-draws itself. */
                  strokeDasharray="1 9999"
                />
                {chart.dots.map((dot, index) => (
                  <circle
                    key={index}
                    cx={dot.x}
                    cy={dot.y}
                    r={2.5}
                    fill="var(--surface)"
                    stroke={tone}
                    strokeWidth="1.5"
                    opacity={drawn ? 1 : 0}
                    style={{ transition: "opacity 500ms ease 700ms" }}
                  />
                ))}
              </g>

              {/* Daily volume, drawn over the area rather than under it: the
                  gradient fades towards the baseline but not to nothing, and
                  underneath it the bars were a smudge. */}
              <g opacity={drawn ? 1 : 0} style={{ transition: "opacity 600ms ease 200ms" }}>
                {chart.bars.map((bar, index) => (
                  <rect
                    key={index}
                    x={bar.x}
                    y={chart.base - bar.h}
                    width={bar.w}
                    height={bar.h}
                    rx={1}
                    fill="color-mix(in srgb, var(--foreground) 16%, transparent)"
                  />
                ))}
              </g>

              {/* x labels */}
              {chart.ticks.map((index) => (
                <text
                  key={index}
                  className="pg-tick"
                  x={Math.min(Math.max(chart.x(index), PAD.left), width - PAD.right)}
                  y={chart.base + DATE_ROW}
                  textAnchor={index === 0 ? "start" : index === chart.points.length - 1 ? "end" : "middle"}
                >
                  {asShortDate(chart.points[index].ms)}
                </text>
              ))}

              {/*
                One callout, when the range contains a move worth naming.

                Anchored to the point it describes with a short leader, sat above
                the line for a rise and below it for a fall so the label never
                covers the shape it is talking about. Suppressed while the
                pointer is in the chart, because two things pointing at the same
                line at once is one too many.
              */}
              {/* Suppressed on a narrow chart: the callout is 150px of type and
                  the range summary above already carries the same figure. */}
              {data.note && !active && chart.noteAt && width >= 460 && (
                <g className="pg-annot" opacity={drawn ? 1 : 0}>
                  <circle
                    cx={chart.noteAt.x}
                    cy={chart.noteAt.y}
                    r={3.5}
                    fill={tone}
                    stroke="var(--surface)"
                    strokeWidth="2"
                  />
                  <line
                    x1={chart.noteAt.x}
                    x2={chart.noteAt.x}
                    y1={chart.noteAt.y + (chart.noteAt.label < chart.noteAt.y ? -6 : 6)}
                    y2={chart.noteAt.label + (chart.noteAt.label < chart.noteAt.y ? 5 : -9)}
                    stroke="color-mix(in srgb, var(--foreground) 22%, transparent)"
                    strokeWidth="1"
                  />
                  <text
                    className="pg-annot-text"
                    x={chart.noteAt.textX}
                    y={chart.noteAt.label}
                    textAnchor={chart.noteAt.anchor}
                  >
                    {fill(
                      t(data.note.kind === "fall" ? "pg.trendFall" : "pg.trendRise"),
                      { points: Math.abs(Math.round(data.note.delta * 100)) },
                    )}
                  </text>
                </g>
              )}

              {/* crosshair + emphasis */}
              {active && hover !== null && (
                <g>
                  <line
                    className="pg-crosshair"
                    x1={chart.x(hover)}
                    x2={chart.x(hover)}
                    y1={PAD.top}
                    y2={chart.base}
                  />
                  {[series, ...(series === "overall" ? [] : ["overall" as SeriesKey])].map(
                    (key) => {
                      const value = valueOf(active, key);
                      if (value === null) return null;
                      return (
                        <circle
                          key={key}
                          className="pg-dot"
                          cx={chart.x(hover)}
                          cy={chart.y(value)}
                          r={key === series ? 4.5 : 3}
                          fill="var(--surface)"
                          stroke={key === series ? tone : "var(--faint)"}
                          strokeWidth="2"
                        />
                      );
                    },
                  )}
                </g>
              )}
            </svg>
          )}

          {/* A sitting, when one is under the pointer: the score, then the only
              per-section figure a finished mock stores — raw share correct. */}
          {mark !== null && data.marks[mark] && (
            <div
              className="pg-tip"
              data-show="true"
              style={{
                left: Math.min(
                  Math.max(chart.x(chart.points.findIndex((p) => p.day === data.marks[mark].day)), 8),
                  Math.max(8, width - 8),
                ),
                bottom: 8,
                transform: `translateX(${
                  chart.x(chart.points.findIndex((p) => p.day === data.marks[mark].day)) >
                  width / 2
                    ? "calc(-100% - 12px)"
                    : "12px"
                })`,
              }}
            >
              <p className="pg-tip-date">
                {asDate(data.marks[mark].ms)} · {t("pg.mockOneWord")}
              </p>
              <p className="pg-tip-score">{data.marks[mark].score}</p>
              {data.marks[mark].bySubject.map((section) => (
                <p className="pg-tip-row" key={section.subjectId}>
                  <span
                    className="pg-tip-swatch"
                    style={{ ["--tone" as string]: subjectColor(section.subjectId) }}
                  />
                  <span>{shortSubject(section.subjectId)}</span>
                  <span>{asPercent(section.accuracy)}</span>
                </p>
              ))}
              <p className="pg-tip-note">{t("pg.mockRawNote")}</p>
            </div>
          )}

          {/* The tooltip. Real dates, real counts, and the rolling figure named
              as rolling — never a bare decimal. */}
          <div
            className="pg-tip"
            data-show={active && mark === null ? "true" : undefined}
            style={tipStyle}
          >
            {active && (
              <>
                <p className="pg-tip-date">{asDate(active.ms)}</p>
                <p className="pg-tip-row">
                  <span className="pg-tip-swatch" style={{ ["--tone" as string]: tone }} />
                  <span>{seriesOptions.find((o) => o.value === series)?.label}</span>
                  <span>{asPercent(valueOf(active, series))}</span>
                </p>
                {series !== "overall" && (
                  <p className="pg-tip-row">
                    <span
                      className="pg-tip-swatch"
                      style={{ ["--tone" as string]: "var(--faint)" }}
                    />
                    <span>{t("pg.trendBoth")}</span>
                    <span>{asPercent(active.overall)}</span>
                  </p>
                )}
                <p className="pg-tip-note">
                  {valueOf(active, series) === null
                    ? t("pg.trendNoWindow")
                    : fill(t("pg.trendTooltip"), {
                        count: active.count,
                        correct: active.correct,
                      })}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/*
        The same numbers, reachable without a pointer or a picture.

        The wrapper carries `sr-only`, not the table: a table lays itself out at
        its minimum content width whatever `width: 1px` says, so an `.sr-only`
        table is an invisible 500px element that widens the document and hands a
        phone a horizontal scrollbar. Clipped by a div, it takes up nothing.
      */}
      {!thin && (
        <div className="sr-only">
          <table>
          <caption>{t("pg.trendTableCaption")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("pg.trendDate")}</th>
              <th scope="col">{seriesOptions.find((o) => o.value === series)?.label}</th>
              <th scope="col">{t("pg.trendVolume")}</th>
            </tr>
          </thead>
          <tbody>
            {chart.points.map((point) => (
              <tr key={point.day}>
                <th scope="row">{asDate(point.ms, true)}</th>
                <td>{asPercent(valueOf(point, series))}</td>
                <td>{point.count}</td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
