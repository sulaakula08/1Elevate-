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
/** Sunday-first rows, every day named so no row is ambiguous. */
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ActivityHeatmap({ attempts }: { attempts: Attempt[] }) {
  const { t } = useI18n();

  // Recomputing a year of cells on every render is wasteful, and `attempts`
  // only changes when something is actually answered.
  const { weeks, total, activeDays } = useMemo(
    () => contributionYear(attempts),
    [attempts],
  );

  /**
   * A month is labelled on the first column that contains it.
   *
   * Two edges to respect. The first column is only labelled when most of it
   * actually belongs to that month, otherwise a year starting on the 29th gets
   * a label for a month it barely shows. And the last two columns are never
   * labelled, because the text is wider than a column and would run off the
   * right edge with nothing after it to sit over.
   */
  const labels = weeks.map((week, i) => {
    const month = new Date(week.days[0].ms).getMonth();
    if (i >= weeks.length - 2) return null;
    if (i === 0) {
      const daysOfMonth = week.days.filter((d) => new Date(d.ms).getMonth() === month).length;
      return daysOfMonth >= 4 ? MONTHS[month] : null;
    }
    const previous = new Date(weeks[i - 1].days[0].ms).getMonth();
    return month === previous ? null : MONTHS[month];
  });

  return (
    <section className="py-12 border-t">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-h3 font-medium">
          {total} {t("progress.heatTitle")}
        </h2>
        <p className="text-sm text-muted">
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
                  {/* Absolutely positioned so the text contributes nothing to
                      the column's width. With table-layout: fixed the first row
                      decides every column, so a label laid out normally widens
                      its own column and shunts the grid out of alignment. */}
                  {label && <span>{label}</span>}
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

      <div className="mt-3 flex items-center gap-2 text-micro text-faint">
        <span>{t("progress.heatLess")}</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span key={level} className="heat-cell heat-key" data-level={level} />
        ))}
        <span>{t("progress.heatMore")}</span>
      </div>
    </section>
  );
}
