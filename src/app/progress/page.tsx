"use client";

import Link from "next/link";
import { getSubject } from "@/data/exams";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import {
  byDifficulty,
  byMode,
  bySubject,
  byTopic,
  difficultyColor,
  difficultyColorSoft,
  maxScore,
  medianSeconds,
  overall,
  pct,
  scoreStanding,
  streak,
  weakTopics,
  weekOverWeek,
} from "@/lib/stats";
import { EmptyState, PageTitle, RequireAccount } from "@/components/ui";
import { CountUp, ProgressBar, Reveal } from "@/components/motion";
import { SectionGate } from "@/components/SectionGate";

/**
 * `t()` falls back to the key itself, which would surface as
 * "progress.mode.something" if an old record ever carried an unknown mode. The
 * raw value is a better last resort than a key.
 */
const MODE_KEYS = new Set(["practice", "review", "mock"]);

function modeLabel(t: (key: string) => string, mode: string): string {
  return MODE_KEYS.has(mode) ? t(`progress.mode.${mode}`) : mode;
}

export default function ProgressPage() {
  return (
    <RequireAccount>
      <SectionGate section="progress">
        <ProgressInner />
      </SectionGate>
    </RequireAccount>
  );
}

function ProgressInner() {
  const { t, tx } = useI18n();
  const { account, data } = useApp();

  const stats = overall(data.attempts);
  const subjects = bySubject(data.attempts);
  const levels = byDifficulty(data.attempts);
  const topics = byTopic(data.attempts).slice(0, 12);
  const modes = byMode(data.attempts);
  const weak = weakTopics(data.attempts, 2, 4);
  const week = weekOverWeek(data.attempts);
  const pace = medianSeconds(data.attempts);
  const standing = scoreStanding(data.mocks, account!.targetScore);

  if (stats.total === 0 && data.mocks.length === 0) {
    return (
      <div className="container-app">
        <PageTitle>{t("progress.title")}</PageTitle>
        <EmptyState
          tone="progress"
          title={t("progress.noDataTitle")}
          action={{ href: "/practice", label: t("nav.practice") }}
        >
          {t("progress.noData")}
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="container-app">
      <PageTitle>{t("progress.title")}</PageTitle>

      {/* ---------------- where you stand ----------------
          The score is the number a student actually cares about, so it leads —
          against the target they set, not in the abstract. */}
      <section className="pb-12">
        <p className="label-xs">{t("progress.standing")}</p>
        {standing ? (
          <div className="mt-5 flex flex-wrap items-center gap-8 sm:gap-12">
            <ScoreDial
              score={standing.latest}
              target={account!.targetScore}
              max={standing.max}
            />
            <dl className="grid grid-cols-2 gap-x-10 gap-y-5 text-sm">
              <Figure label={t("progress.bestMock")} value={standing.best} />
              <Figure
                label={standing.toTarget > 0 ? t("progress.toTarget") : t("progress.onTarget")}
                value={standing.toTarget > 0 ? standing.toTarget : standing.latest}
                tone={standing.toTarget > 0 ? undefined : "var(--success)"}
              />
              {standing.change !== null && (
                <Figure
                  label={t("progress.pointsGained")}
                  value={standing.change}
                  signed
                  tone={
                    standing.change > 0
                      ? "var(--success)"
                      : standing.change < 0
                        ? "var(--danger)"
                        : undefined
                  }
                />
              )}
              {pace !== null && (
                <Figure
                  label={t("progress.pace")}
                  value={pace}
                  suffix="s"
                  hint={t("progress.paceHint")}
                />
              )}
            </dl>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm leading-relaxed text-muted">{t("progress.noMockYet")}</p>
            <Link href="/mock" className="btn btn-primary btn-sm mt-4">
              {t("progress.takeMock")}
            </Link>
          </div>
        )}
      </section>

      {/* ---------------- headline counters ---------------- */}
      <dl className="border-t border-b grid grid-cols-2 sm:grid-cols-4">
        {[
          {
            label: t("progress.totalAnswered"),
            value: stats.total,
            suffix: "",
            foot:
              week.answeredDelta === 0
                ? null
                : `${week.answeredDelta > 0 ? "+" : "−"}${Math.abs(week.answeredDelta)} ${t(
                    "progress.vsLastWeek",
                  )}`,
            footTone: week.answeredDelta > 0 ? "var(--success)" : "var(--muted)",
          },
          {
            label: t("progress.overallAccuracy"),
            value: Math.round(stats.accuracy * 100),
            suffix: "%",
            foot:
              week.accuracyDelta === null
                ? t("progress.noBaseline")
                : `${week.accuracyDelta >= 0 ? "+" : "−"}${Math.abs(
                    Math.round(week.accuracyDelta * 100),
                  )}% ${t("progress.vsLastWeek")}`,
            footTone:
              week.accuracyDelta !== null && week.accuracyDelta < 0
                ? "var(--danger)"
                : week.accuracyDelta !== null && week.accuracyDelta > 0
                  ? "var(--success)"
                  : "var(--faint)",
          },
          {
            label: t("progress.streak"),
            value: streak(data.attempts),
            suffix: "",
            foot: null,
            footTone: "var(--faint)",
          },
          {
            label: t("progress.thisWeek"),
            value: week.current.total,
            suffix: "",
            foot: week.current.total > 0 ? pct(week.current.accuracy) : null,
            footTone: "var(--faint)",
          },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`py-6 px-1 sm:px-5 ${i % 2 === 1 ? "border-l" : ""} ${
              i > 0 ? "sm:border-l" : ""
            } ${i > 1 ? "border-t sm:border-t-0" : ""}`}
          >
            <dd className="num text-2xl font-medium">
              <CountUp value={stat.value} suffix={stat.suffix} />
            </dd>
            <dt className="text-sm text-muted mt-1">{stat.label}</dt>
            {stat.foot && (
              <p className="num text-micro mt-1.5" style={{ color: stat.footTone }}>
                {stat.foot}
              </p>
            )}
          </div>
        ))}
      </dl>

      {/* ---------------- what to do next ----------------
          Placed above the analysis rather than below it: a student who reads one
          section should read the actionable one. */}
      {weak.length > 0 && (
        <section className="py-12">
          <p className="label-xs">{t("progress.focusNow")}</p>
          <p className="mt-2 text-sm text-muted">{t("progress.focusHint")}</p>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {weak.map((bucket, i) => (
              <Reveal key={bucket.key} delay={i * 60}>
                <div className="card-tone p-4" style={{ ["--tone" as string]: "var(--danger)" }}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm min-w-0 truncate">{bucket.key}</span>
                    <span className="num ml-auto text-sm font-medium text-danger">
                      {pct(bucket.accuracy)}
                    </span>
                  </div>
                  <ProgressBar value={bucket.accuracy} tone="danger" className="mt-2.5" />
                  <p className="num text-micro text-faint mt-2">
                    {bucket.correct}/{bucket.total}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <Link href="/review" className="btn btn-sm mt-5">
            {t("progress.goReview")}
          </Link>
        </section>
      )}

      {/* activity — a year at a glance, replacing the 14-day bars. Two weeks
          was too short a window to show a habit forming, which is the whole
          point of putting practice history in front of a student. */}
      <ActivityHeatmap attempts={data.attempts} />

      {/* ---------------- score trend ---------------- */}
      <section className="py-12 border-t">
        <p className="label-xs">{t("progress.scoreTrend")}</p>
        {data.mocks.length < 2 ? (
          <EmptyState>{t("progress.needMoreMocks")}</EmptyState>
        ) : (
          <ScoreTrend
            target={account!.targetScore}
            points={data.mocks.map((m) => ({
              score: m.score,
              max: maxScore(m.exam),
              at: m.at,
            }))}
          />
        )}
      </section>

      {/* ---------------- by how you practise ---------------- */}
      {modes.length > 1 && (
        <section className="py-12 border-t">
          <p className="label-xs">{t("progress.byMode")}</p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-3">
            {modes.map((bucket, i) => (
              <Reveal as="li" key={bucket.key} delay={i * 60}>
                <div className="py-4 px-4 rounded-[var(--radius-sm)] border">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm">{modeLabel(t, bucket.key)}</span>
                    <span className="num ml-auto text-sm font-medium">
                      {pct(bucket.accuracy)}
                    </span>
                  </div>
                  <ProgressBar
                    value={bucket.accuracy}
                    tone={bucket.accuracy < 0.5 ? "danger" : "ink"}
                    className="mt-2.5"
                  />
                  <p className="num text-micro text-faint mt-2">
                    {bucket.correct}/{bucket.total}
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      {/* ---------------- by difficulty ---------------- */}
      {levels.length > 0 && (
        <section className="py-12 border-t">
          <p className="label-xs">{t("diff.byLevel")}</p>
          <div className="mt-5 grid sm:grid-cols-3 gap-3">
            {levels.map((bucket, i) => {
              const level = Number(bucket.key);
              return (
                <Reveal key={bucket.key} delay={i * 60}>
                  <div
                    className="card-tone p-4"
                    style={{
                      ["--tone" as string]: difficultyColor(level),
                      ["--tone-soft" as string]: difficultyColorSoft(level),
                    }}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="badge">{t(`diff.${level}`)}</span>
                      <span className="num ml-auto text-body font-medium">
                        {pct(bucket.accuracy)}
                      </span>
                    </div>
                    <p className="num text-micro text-faint mt-2">
                      {bucket.correct}/{bucket.total}
                    </p>
                    <ProgressBar
                      value={bucket.accuracy}
                      tone={bucket.accuracy < 0.5 ? "danger" : "accent"}
                      className="mt-2"
                    />
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------------- by subject ---------------- */}
      <section className="py-12 border-t">
        <p className="label-xs">{t("progress.bySubject")}</p>
        <ul className="mt-5">
          {subjects.map((bucket, i) => {
            const subject = getSubject(bucket.key);
            return (
              <Reveal as="li" key={bucket.key} delay={i * 50}>
                <div className="py-4 border-t first:border-t-0">
                  <div className="flex items-baseline gap-3">
                    <span className="text-body">
                      {subject ? tx(subject.name) : bucket.key}
                    </span>
                    <span className="num ml-auto text-sm text-muted">
                      {pct(bucket.accuracy)}
                    </span>
                    <span className="num text-sm text-faint w-12 text-right">
                      {bucket.correct}/{bucket.total}
                    </span>
                  </div>
                  <ProgressBar
                    value={bucket.accuracy}
                    tone={bucket.accuracy < 0.5 ? "danger" : "ink"}
                    className="mt-2.5"
                  />
                </div>
              </Reveal>
            );
          })}
        </ul>
      </section>

      {/* ---------------- by topic ---------------- */}
      <section className="py-12 border-t">
        <p className="label-xs">{t("progress.byTopic")}</p>
        <ul className="mt-5">
          {topics.map((bucket) => (
            <li key={bucket.key} className="flex items-center gap-4 py-3 border-t first:border-t-0">
              <span className="text-sm flex-1 truncate">{bucket.key}</span>
              <div className="w-24 shrink-0">
                <ProgressBar
                  value={bucket.accuracy}
                  tone={bucket.accuracy < 0.5 ? "danger" : "ink"}
                />
              </div>
              <span className="num text-sm text-muted w-10 text-right">
                {pct(bucket.accuracy)}
              </span>
              <span className="num text-micro text-faint w-12 text-right">
                {bucket.correct}/{bucket.total}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** One labelled number, with an optional sign and colour. */
function Figure({
  label,
  value,
  suffix,
  hint,
  signed,
  tone,
}: {
  label: string;
  value: number;
  suffix?: string;
  hint?: string;
  signed?: boolean;
  tone?: string;
}) {
  return (
    <div>
      <dd className="num text-h2 font-medium" style={tone ? { color: tone } : undefined}>
        {signed && value > 0 ? "+" : ""}
        {value}
        {suffix}
      </dd>
      <dt className="text-micro text-muted mt-0.5">{label}</dt>
      {hint && <p className="text-2xs text-faint">{hint}</p>}
    </div>
  );
}

/**
 * The latest mock score as a dial against the target.
 *
 * The arc is 240° rather than a full circle so the gap reads as "how much is
 * left" rather than as a broken ring, and the number sits inside it because that
 * is what the whole graphic is for.
 */
function ScoreDial({ score, target, max }: { score: number; target: number; max: number }) {
  const size = 168;
  const radius = 70;
  const centre = size / 2;
  const sweep = 240;
  const start = 150; // degrees, clockwise from 3 o'clock

  const point = (angle: number, r = radius) => {
    const radians = (angle * Math.PI) / 180;
    return [centre + r * Math.cos(radians), centre + r * Math.sin(radians)];
  };
  const arc = (fromRatio: number, toRatio: number) => {
    const a1 = start + sweep * fromRatio;
    const a2 = start + sweep * toRatio;
    const [x1, y1] = point(a1);
    const [x2, y2] = point(a2);
    const large = Math.abs(a2 - a1) > 180 ? 1 : 0;
    return `M${x1},${y1} A${radius},${radius} 0 ${large} 1 ${x2},${y2}`;
  };

  // Scored on the part of the scale a student can move: 400 is the floor.
  const floor = 400;
  const span = Math.max(1, max - floor);
  const scoreRatio = Math.min(1, Math.max(0, (score - floor) / span));
  const targetRatio = Math.min(1, Math.max(0, (target - floor) / span));
  const [tx1, ty1] = point(start + sweep * targetRatio, radius - 9);
  const [tx2, ty2] = point(start + sweep * targetRatio, radius + 9);
  const reached = score >= target;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size * 0.82 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute -top-1">
        <path d={arc(0, 1)} fill="none" stroke="var(--line)" strokeWidth="9" strokeLinecap="round" />
        <path
          d={arc(0, Math.max(0.004, scoreRatio))}
          fill="none"
          stroke={reached ? "var(--success)" : "var(--brand)"}
          strokeWidth="9"
          strokeLinecap="round"
        />
        {/* Target tick: the one line on the dial that isn't the student's score. */}
        <line
          x1={tx1}
          y1={ty1}
          x2={tx2}
          y2={ty2}
          stroke="var(--foreground)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
        <p className="num text-h1 font-medium leading-none">
          <CountUp value={score} />
        </p>
        <p className="num text-micro text-faint mt-1.5">
          / {max} · {target}
        </p>
      </div>
    </div>
  );
}


/** Inline line chart on the 400–1600 SAT scale, with the target ruled across. */
function ScoreTrend({
  points,
  target,
}: {
  points: { score: number; max: number; at: number }[];
  target: number;
}) {
  const width = 640;
  const height = 190;
  const padding = 28;
  const step = (width - padding * 2) / Math.max(1, points.length - 1);
  const floor = 400;

  const yFor = (score: number, max: number) => {
    const ratio = Math.min(1, Math.max(0, (score - floor) / Math.max(1, max - floor)));
    return height - padding - ratio * (height - padding * 2);
  };

  const coords = points.map((point, index) => ({
    x: padding + index * step,
    y: yFor(point.score, point.max),
    ...point,
  }));
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  // Same path, closed along the baseline, so the line gets a weight beneath it.
  const area = `${path} L${coords[coords.length - 1].x},${height - padding} L${
    coords[0].x
  },${height - padding} Z`;
  const targetY = yFor(target, points[0]?.max ?? 1600);

  return (
    <div className="mt-5 overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[320px]"
        fill="none"
        role="img"
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="var(--line)"
        />
        <line
          x1={padding}
          y1={targetY}
          x2={width - padding}
          y2={targetY}
          stroke="var(--foreground)"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity="0.45"
        />
        <text x={width - padding} y={targetY - 6} textAnchor="end" fontSize="10" fill="var(--faint)">
          {target}
        </text>

        <path d={area} fill="url(#trend-fill)" />
        <path d={path} stroke="var(--brand)" strokeWidth="1.75" strokeLinecap="round" />

        {coords.map((c, i) => {
          const last = i === coords.length - 1;
          return (
            <g key={c.at}>
              <circle
                cx={c.x}
                cy={c.y}
                r={last ? 4 : 3}
                fill={last ? "var(--brand)" : "var(--surface)"}
                stroke="var(--brand)"
                strokeWidth="1.25"
              />
              <text
                x={c.x}
                y={c.y - 12}
                textAnchor="middle"
                fontSize="11"
                fill={last ? "var(--foreground)" : "var(--faint)"}
                className="num"
              >
                {c.score}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
