"use client";

import { getSubject } from "@/data/exams";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import {
  byDifficulty,
  bySubject,
  byTopic,
  difficultyColor,
  difficultyColorSoft,
  maxScore,
  overall,
  pct,
  recentActivity,
  streak,
} from "@/lib/stats";
import { EmptyState, PageTitle, RequireAccount } from "@/components/ui";
import { CountUp, ProgressBar, Reveal } from "@/components/motion";

export default function ProgressPage() {
  return (
    <RequireAccount>
      <ProgressInner />
    </RequireAccount>
  );
}

function ProgressInner() {
  const { t, tx } = useI18n();
  const { data } = useApp();

  const stats = overall(data.attempts);
  const subjects = bySubject(data.attempts);
  const levels = byDifficulty(data.attempts);
  const topics = byTopic(data.attempts).slice(0, 12);
  const activity = recentActivity(data.attempts);
  const peak = Math.max(1, ...activity.map((d) => d.count));

  if (stats.total === 0 && data.mocks.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <PageTitle>{t("progress.title")}</PageTitle>
        <EmptyState>{t("progress.noData")}</EmptyState>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageTitle>{t("progress.title")}</PageTitle>

      <dl className="border-t border-b grid grid-cols-2 sm:grid-cols-4">
        {[
          { label: t("progress.totalAnswered"), value: stats.total, suffix: "" },
          {
            label: t("progress.overallAccuracy"),
            value: Math.round(stats.accuracy * 100),
            suffix: "%",
          },
          { label: t("progress.streak"), value: streak(data.attempts), suffix: "" },
          { label: t("progress.mocksTaken"), value: data.mocks.length, suffix: "" },
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
            <dt className="text-[13px] text-muted mt-1">{stat.label}</dt>
          </div>
        ))}
      </dl>

      {/* activity */}
      <section className="py-12">
        <p className="label-xs">{t("progress.last14")}</p>
        <div className="mt-5 flex items-end gap-1.5 h-24">
          {activity.map((day) => (
            <div key={day.day} className="flex-1 flex flex-col items-center gap-2 h-full">
              <div className="flex-1 w-full flex items-end">
                <div
                  className="w-full transition-[height] duration-500"
                  style={{
                    height: `${Math.max(day.count ? 6 : 2, (day.count / peak) * 100)}%`,
                    background: day.count ? "var(--foreground)" : "var(--line)",
                  }}
                  title={`${day.day}: ${day.count}`}
                />
              </div>
              <span className="num text-[10px] text-faint">{day.day.slice(-2)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* score trend */}
      <section className="py-12 border-t">
        <p className="label-xs">{t("progress.scoreTrend")}</p>
        {data.mocks.length < 2 ? (
          <EmptyState>{t("progress.needMoreMocks")}</EmptyState>
        ) : (
          <ScoreTrend
            points={data.mocks.map((m) => ({
              score: m.score,
              max: maxScore(m.exam),
              at: m.at,
            }))}
          />
        )}
      </section>

      {/* by difficulty */}
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
                      <span className="num ml-auto text-[15px] font-medium">
                        {pct(bucket.accuracy)}
                      </span>
                    </div>
                    <p className="num text-[12px] text-faint mt-2">
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

      {/* by subject */}
      <section className="py-12 border-t">
        <p className="label-xs">{t("progress.bySubject")}</p>
        <ul className="mt-5">
          {subjects.map((bucket, i) => {
            const subject = getSubject(bucket.key);
            return (
              <Reveal as="li" key={bucket.key} delay={i * 50}>
                <div className="py-4 border-t first:border-t-0">
                  <div className="flex items-baseline gap-3">
                    <span className="text-[15px]">
                      {subject ? tx(subject.name) : bucket.key}
                    </span>
                    <span className="num ml-auto text-[14px] text-muted">
                      {pct(bucket.accuracy)}
                    </span>
                    <span className="num text-[13px] text-faint w-12 text-right">
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

      {/* by topic */}
      <section className="py-12 border-t">
        <p className="label-xs">{t("progress.byTopic")}</p>
        <ul className="mt-5">
          {topics.map((bucket) => (
            <li key={bucket.key} className="flex items-center gap-4 py-3 border-t first:border-t-0">
              <span className="text-[14px] flex-1 truncate">{bucket.key}</span>
              <div className="w-24 shrink-0">
                <ProgressBar
                  value={bucket.accuracy}
                  tone={bucket.accuracy < 0.5 ? "danger" : "ink"}
                />
              </div>
              <span className="num text-[13px] text-muted w-10 text-right">
                {pct(bucket.accuracy)}
              </span>
              <span className="num text-[12px] text-faint w-12 text-right">
                {bucket.correct}/{bucket.total}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Minimal inline line chart — normalised so SAT and ЕНТ scores share an axis. */
function ScoreTrend({ points }: { points: { score: number; max: number; at: number }[] }) {
  const width = 640;
  const height = 170;
  const padding = 26;
  const step = (width - padding * 2) / Math.max(1, points.length - 1);

  const coords = points.map((point, index) => {
    const ratio = point.max ? point.score / point.max : 0;
    return {
      x: padding + index * step,
      y: height - padding - ratio * (height - padding * 2),
      ...point,
    };
  });
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");

  return (
    <div className="mt-5 overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[320px]" fill="none" role="img">
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="var(--line)"
        />
        <path d={path} stroke="var(--foreground)" strokeWidth="1.5" strokeLinecap="round" />
        {coords.map((c, i) => (
          <g key={c.at}>
            <circle
              cx={c.x}
              cy={c.y}
              r="3"
              fill={i === coords.length - 1 ? "var(--accent)" : "var(--surface)"}
              stroke={i === coords.length - 1 ? "var(--accent)" : "var(--foreground)"}
              strokeWidth="1.25"
            />
            <text
              x={c.x}
              y={c.y - 12}
              textAnchor="middle"
              fontSize="11"
              fill="var(--faint)"
              className="num"
            >
              {c.score}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
