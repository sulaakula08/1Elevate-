"use client";

import { useMemo } from "react";
import type { Attempt } from "@/lib/storage";
import { contributionYear, streak } from "@/lib/stats";
import { useI18n } from "@/lib/i18n";
import { NOUNS, pluralize } from "@/lib/plural";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Thirteen weeks is a quarter — long enough to show a habit, short enough to read. */
const WEEKS = 13;

/**
 * The dashboard's activity strip.
 *
 * The full-year heatmap on /account is the GitHub layout on purpose: 53 columns,
 * a weekday gutter and a Less/More key. That is the right tool for reviewing a
 * year, and the wrong one for a dashboard — it is wide, it needs its own
 * horizontal scroll, and it makes the page look like a contribution graph with
 * an exam product attached.
 *
 * This is one quarter, no weekday gutter and no legend, sized to sit in a
 * dashboard column. The heading carries the streak, because on a study product
 * the number that matters is consecutive days, not a total.
 *
 * An account with no attempts still gets the grid, drawn entirely at level 0.
 * Those cells are accurate — there really was no practice on those days — so
 * this is an honest empty state rather than a fabricated one, and it shows the
 * student the shape of the thing they are about to start filling in.
 */
export function StudyActivity({ attempts }: { attempts: Attempt[] }) {
  const { t } = useI18n();

  const { weeks, days, activeDays, total } = useMemo(() => {
    const year = contributionYear(attempts);
    return {
      weeks: year.weeks.slice(-WEEKS),
      days: streak(attempts),
      activeDays: year.activeDays,
      total: year.total,
    };
  }, [attempts]);

  // A month is named on the first column that opens it, and never on the last
  // column, where the label would have nothing after it to sit over.
  const labels = weeks.map((week, i) => {
    const month = new Date(week.days[0].ms).getMonth();
    if (i === weeks.length - 1) return null;
    if (i === 0) return MONTHS[month];
    return month === new Date(weeks[i - 1].days[0].ms).getMonth() ? null : MONTHS[month];
  });

  return (
    <div className="act">
      <p className="act-lede">
        {days > 0 ? (
          <>
            <span className="num act-streak">{days}</span>{" "}
            <span>{t("home.actStreak")}</span>
          </>
        ) : (
          <span className="text-muted">{t("home.actNoStreak")}</span>
        )}
      </p>

      <div className="act-grid" aria-hidden>
        <div className="act-months">
          {labels.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>
        <div className="act-cells">
          {weeks.map((week, col) => (
            <div key={col} className="act-col">
              {Array.from({ length: 7 }, (_, row) => {
                const cell = week.days[row];
                if (!cell) return <span key={row} className="act-cell act-cell-pad" />;
                return (
                  <span
                    key={row}
                    className="act-cell"
                    data-level={cell.level}
                    title={`${cell.count} · ${cell.day}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="act-foot">
        {total > 0
          ? `${pluralize(total, NOUNS.question)} · ${activeDays} ${t("home.actActiveDays")}`
          : t("home.actEmpty")}
      </p>
    </div>
  );
}
