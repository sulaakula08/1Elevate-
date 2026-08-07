"use client";

import { useMemo } from "react";
import type { Attempt } from "@/lib/storage";
import { contributionYear } from "@/lib/stats";
import { useI18n } from "@/lib/i18n";

/**
 * A year of practice, one square per day.
 *
 * The layout follows the convention people already know from GitHub — weeks as
 * columns, weekdays as rows, month labels along the top, a Less/More key — but
 * the colours come from the app's own accent ramp rather than GitHub's green,
 * so it belongs to this product rather than looking borrowed.
 *
 * The grid is a table because that is what it is: a two-dimensional set of
 * values with row and column headers. That gets the weekday and month labels
 * read out properly instead of leaving a screen reader with 371 bare cells.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Sunday-first rows; only alternate weekdays are labelled, as in the original. */
const WEEKDAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

export function ActivityHeatmap({ attempts }: { attempts: Attempt[] }) {
  const { t } = useI18n();

  // Recomputing a year of cells on every render is wasteful, and `attempts`
  // only changes when something is actually answered.
  const { weeks, total, activeDays } = useMemo(
    () => contributionYear(attempts),
    [attempts],
  );

  /**
   * A month is labelled on the first column that belongs to it. Skipping the
   * very first column avoids a label that would sit half off the left edge when
   * the year happens to start mid-month.
   */
  const labels = weeks.map((week, i) => {
    if (i === 0) return null;
    const month = new Date(week.days[0].ms).getMonth();
    const previous = new Date(weeks[i - 1].days[0].ms).getMonth();
    return month === previous ? null : MONTHS[month];
  });

  return (
    <section className="py-12 border-t">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-[17px] font-medium">
          {total} {t("progress.heatTitle")}
        </h2>
        <p className="text-[13px] text-muted">
          {activeDays} {t("progress.heatActiveDays")}
        </p>
      </div>

      {/* 53 columns will not fit a phone, so the grid scrolls inside its own
          box rather than forcing the page sideways. */}
      <div className="mt-5 overflow-x-auto pb-1">
        <table className="heat" role="grid">
          <caption className="sr-only">{t("progress.heatCaption")}</caption>
          <thead>
            <tr>
              {/* Spacer above the weekday column. */}
              <th className="heat-daylabel" />
              {labels.map((label, i) => (
                <th key={i} className="heat-month" scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((weekday, row) => (
              <tr key={row}>
                <th className="heat-daylabel" scope="row">
                  {weekday}
                </th>
                {weeks.map((week, col) => {
                  const cell = week.days[row];
                  if (!cell || cell.future) {
                    return <td key={col} className="heat-pad" />;
                  }
                  return (
                    <td key={col} className="heat-cell-wrap">
                      <span
                        className="heat-cell"
                        data-level={cell.level}
                        title={`${cell.count} ${
                          cell.count === 1 ? t("progress.heatOne") : t("progress.heatMany")
                        } · ${cell.day}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[12px] text-faint">
        <span>{t("progress.heatLess")}</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span key={level} className="heat-cell heat-key" data-level={level} />
        ))}
        <span>{t("progress.heatMore")}</span>
      </div>
    </section>
  );
}
