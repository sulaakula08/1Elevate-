"use client";

import { getSubject } from "@/data/exams";
import type { Insight, Metric, PeriodReport } from "@/lib/analytics";
import { asDuration, asPercent, fill } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";
import { Delta, Void } from "./primitives";

/**
 * What the data says, and how last month compares.
 *
 * The insights are the highest-value content on the page and the first pass set
 * them as four equal paragraphs with a coloured left border — an interpretation
 * delivered as a changelog. They are now written as an editorial: the leading
 * reading gets a figure at display size and a real headline, the rest are
 * compact readings in one ruled row.
 *
 * Nothing about the underlying rules changed. Every figure still comes from a
 * deterministic rule in lib/analytics.ts with a threshold and a minimum sample.
 */

/** The tone a reading carries: good news, a warning, or an observation. */
function toneOf(insight: Insight): string {
  return insight.tone === "good"
    ? "var(--success)"
    : insight.tone === "warn"
      ? "var(--danger)"
      : "var(--brand)";
}

export function Insights({ insights }: { insights: Insight[] }) {
  const { t, tx } = useI18n();

  if (insights.length === 0) return null;

  /* A subject arrives as an id, and "sat-rw needs more time" is not a sentence. */
  const resolve = (insight: Insight) => {
    const values = { ...insight.values };
    if (typeof values.subject === "string") {
      const subject = getSubject(values.subject);
      if (subject) values.subject = tx(subject.name);
    }
    return values;
  };

  const [lead, ...rest] = insights;
  const leadValues = resolve(lead);

  return (
    <div className="pg-insights">
      <div className="pg-spot" style={{ ["--tone" as string]: toneOf(lead) }}>
        <p className="pg-spot-figure">
          {fill(t(`pg.insight.${lead.kind}.figure`), leadValues)}
        </p>
        <div className="min-w-0">
          <p className="pg-spot-role">{t(`pg.insight.${lead.kind}.role`)}</p>
          <p className="pg-spot-title">
            {fill(t(`pg.insight.${lead.kind}.title`), leadValues)}
          </p>
          <p className="pg-spot-body">
            {fill(t(`pg.insight.${lead.kind}.body`), leadValues)}
          </p>
        </div>
      </div>

      {rest.length > 0 && (
        <div className="pg-ins-row">
          {rest.map((insight) => {
            const values = resolve(insight);
            return (
              <div
                key={insight.id}
                className="pg-ins"
                style={{ ["--tone" as string]: toneOf(insight) }}
              >
                {/* Three things, in the order they are scanned: the number,
                    what kind of reading it is, and what it is about. The
                    evidence follows at the quietest weight on the page. */}
                <p className="pg-ins-figure">
                  {fill(t(`pg.insight.${insight.kind}.figure`), values)}
                </p>
                <p className="pg-ins-role">{t(`pg.insight.${insight.kind}.role`)}</p>
                <p className="pg-ins-title">
                  {fill(t(`pg.insight.${insight.kind}.title`), values)}
                </p>
                <p className="pg-ins-body">
                  {fill(t(`pg.insight.${insight.kind}.body`), values)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * The last thirty days against the thirty before them.
 *
 * Tier 3: a strip, not a section. Two things still make it more than a table of
 * arrows — direction is declared per metric, so a falling answer time is green
 * and a falling accuracy is red from the same negative number; and a comparison
 * with nothing behind it is not drawn at all.
 */
export function PeriodComparison({ period }: { period: PeriodReport }) {
  const { t, tx } = useI18n();

  if (!period.hasBaseline) {
    return <Void title={t("pg.empty")} body={t("pg.periodEmpty")} />;
  }

  const name = (metric: Metric) => {
    if (metric.key !== "subject") return t(`pg.metric.${metric.key}`);
    const subject = getSubject(metric.subjectId ?? "");
    return subject ? tx(subject.name) : (metric.subjectId ?? "");
  };

  const shown = (metric: Metric) => {
    if (metric.current === null) return "—";
    if (metric.format === "percent") return asPercent(metric.current);
    if (metric.format === "seconds") return asDuration(metric.current);
    return String(metric.current);
  };

  return (
    <div className="pg-period">
      <p className="pg-period-label">
        {fill(t("pg.period"), { days: period.days })}
      </p>
      <dl className="pg-period-cells">
        {period.metrics.map((metric) => (
          <div key={`${metric.key}:${metric.subjectId ?? ""}`} className="pg-period-cell">
            <dt>{name(metric)}</dt>
            <dd>
              <span
                className="pg-period-value"
                data-empty={metric.current === null ? "true" : undefined}
              >
                {shown(metric)}
              </span>
              <Delta
                value={metric.delta}
                good={metric.good}
                format={
                  metric.format === "percent"
                    ? "points"
                    : metric.format === "seconds"
                      ? "seconds"
                      : "count"
                }
              />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
