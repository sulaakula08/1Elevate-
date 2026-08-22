"use client";

import Link from "next/link";
import { getSubject } from "@/data/exams";
import type { Analytics, FocusItem } from "@/lib/analytics";
import { RULES, asPercent, fill } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";
import { NOUNS, pluralize } from "@/lib/plural";
import { Delta, Void, bandColor, useInView } from "./primitives";

/**
 * Where the points are going, and what to do about it.
 *
 * The ranking itself was the strongest thing on the first pass and its model is
 * untouched: the gap to the student's own strongest domain in that section,
 * multiplied by the share of the exam that domain carries. What changed is that
 * the consequence now leads — a total at the top, a figure per row set large,
 * and a bar that shows the three quantities the model is actually about: what
 * you get right now, what your own best domain gets right, and the distance
 * between them.
 *
 * The assumption is still stated rather than hidden, because the comparison is
 * against the student's own best domain and not against perfection: "be perfect
 * at Geometry" is not a plan.
 */
/**
 * The consequence, before the list of causes.
 *
 * Kept as its own export so the chapter can run it full width above both
 * columns: the total is the point of the section, and boxed into the left column
 * it read as a caption on the list.
 */
export function OpportunityTotal({ analytics }: { analytics: Analytics }) {
  const { t } = useI18n();
  const { opportunityTotal } = analytics;

  if (opportunityTotal.domains === 0) return null;

  return (
    <div className="pg-total">
      <p className="pg-total-figure">
        {fill(t("pg.losingPoints"), { points: opportunityTotal.points })}
      </p>
      <div className="min-w-0">
        <p className="pg-total-head">{t("pg.totalHead")}</p>
        <p className="pg-total-sub">
          {fill(t("pg.totalSub"), { domains: opportunityTotal.domains })}
        </p>
      </div>
    </div>
  );
}

export function Opportunities({ analytics }: { analytics: Analytics }) {
  const { t } = useI18n();
  const { opportunities, opportunityPending } = analytics;
  const [ref, seen] = useInView<HTMLDivElement>();

  if (opportunities.length === 0) {
    return (
      <Void
        title={t("pg.empty")}
        body={
          analytics.reliableDomains > 0
            ? fill(t("pg.losingNeedTwo"), {
                threshold: RULES.reliable,
                have: analytics.reliableDomains,
              })
            : fill(t("pg.losingEmpty"), {
                threshold: RULES.reliable,
                need: opportunityPending || RULES.reliable,
              })
        }
      />
    );
  }

  return (
    <div ref={ref}>
      <ol className="pg-opps">
        {opportunities.map((opportunity, index) => {
          const subject = getSubject(opportunity.subjectId);
          return (
            <li
              key={`${opportunity.subjectId}:${opportunity.key}`}
              className="pg-opp"
              style={{ ["--band" as string]: bandColor(opportunity.band) }}
            >
              <span className="pg-opp-rank" aria-hidden>
                {index + 1}
              </span>

              <span className="pg-opp-title">
                {opportunity.key}
                <span className="pg-opp-where">{subject?.name.en}</span>
              </span>

              <span className="pg-opp-points">
                {fill(t("pg.losingPoints"), { points: opportunity.points })}
              </span>

              {/* Three quantities on one bar: what you get right, what your best
                  domain gets right, and the ground between them. */}
              <span className="pg-opp-bar" aria-hidden>
                <span
                  className="pg-opp-have"
                  style={{ width: seen ? `${opportunity.accuracy * 100}%` : "0%" }}
                />
                <span
                  className="pg-opp-recover"
                  style={{
                    left: `${opportunity.accuracy * 100}%`,
                    width: seen
                      ? `${Math.max(0, opportunity.ceiling - opportunity.accuracy) * 100}%`
                      : "0%",
                  }}
                />
                <span
                  className="pg-opp-post"
                  style={{ left: `${opportunity.ceiling * 100}%` }}
                />
              </span>

              <span className="pg-opp-legend">
                <span className="pg-opp-now">{asPercent(opportunity.accuracy)}</span>
                {fill(t("pg.oppReach"), {
                  best: opportunity.ceilingKey,
                  accuracy: asPercent(opportunity.ceiling),
                })}
                <span className="pg-opp-weight">
                  {fill(t("pg.losingWeight"), { percent: asPercent(opportunity.weight) })}
                </span>
                {opportunity.change.delta !== null && (
                  <Delta value={opportunity.change.delta} good="up" />
                )}
              </span>
            </li>
          );
        })}
      </ol>

      <details className="pg-method">
        <summary>
          <span className="pg-method-caret" aria-hidden>
            ›
          </span>
          {t("pg.losingMethod")}
        </summary>
        <p className="pg-method-body">{t("pg.losingHint")}</p>
      </details>
    </div>
  );
}

/**
 * The three things to do next.
 *
 * Built from the ranking, then topped up from what the student actually has
 * waiting: a review queue beats new practice, because the queue is made of
 * questions already known to be missed, and a first mock beats both when there
 * is no measurement at all. Each row answers what to do, why, and what it is
 * worth — in that order, and in no more than two lines.
 */
export function NextFocus({
  analytics,
  queueLength,
}: {
  analytics: Analytics;
  queueLength: number;
}) {
  const { t } = useI18n();
  const { focus, mocks, totals } = analytics;

  const items: (FocusItem & { title: string; why: string; worth?: string; cta: string })[] = [];

  if (queueLength > 0) {
    items.push({
      key: "review",
      kind: "review",
      subjectId: null,
      accuracy: null,
      points: null,
      impact: "high",
      href: "/review",
      count: queueLength,
      title: t("pg.nextReview"),
      why: fill(t("pg.nextReviewNote"), {
        count: pluralize(queueLength, NOUNS.question),
      }),
      cta: t("pg.openReview"),
    });
  }

  for (const item of focus) {
    const subject = getSubject(item.subjectId ?? "");
    items.push({
      ...item,
      title: item.key,
      why: fill(t("pg.nextDomainWhy"), {
        subject: subject?.name.en ?? "",
        accuracy: asPercent(item.accuracy),
      }),
      worth: fill(t("pg.losingPoints"), { points: item.points ?? 0 }),
      cta: t("pg.nextPractice"),
    });
  }

  if (mocks === null) {
    items.push({
      key: "mock",
      kind: "mock",
      subjectId: null,
      accuracy: null,
      points: null,
      impact: totals.attempts > 20 ? "high" : "medium",
      href: "/mock",
      title: t("pg.nextMock"),
      why: t("pg.nextMockNote"),
      cta: t("pg.openMock"),
    });
  }

  if (items.length === 0) {
    items.push({
      key: "volume",
      kind: "volume",
      subjectId: null,
      accuracy: null,
      points: null,
      impact: "medium",
      href: "/practice",
      title: t("pg.nextVolume"),
      why: fill(t("pg.nextVolumeNote"), {
        count: Math.max(1, RULES.estimateMin * 2 - totals.attempts),
      }),
      cta: t("pg.openPractice"),
    });
  }

  return (
    <ol className="pg-focus">
      {items.slice(0, 3).map((item, index) => (
        <li key={`${item.kind}:${item.key}`}>
          <Link
            href={item.href}
            className="pg-focus-item"
            data-lead={index === 0 ? "true" : undefined}
          >
            <span className="pg-focus-rank" aria-hidden>
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="pg-focus-name">
                {item.title}
                {item.worth && <span className="pg-focus-worth">{item.worth}</span>}
              </span>
              <span className="pg-focus-why">{item.why}</span>
            </span>
            <span className="pg-focus-go">
              {item.cta}
              <span className="pg-focus-arrow" aria-hidden>
                →
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
