"use client";

import { useMemo, useState } from "react";
import { getSubject } from "@/data/exams";
import type { ActivityReport, Milestone } from "@/lib/analytics";
import { RULES, asDate, asDuration, asPercent, asPoints, fill } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";
import { Segmented } from "./primitives";

/**
 * A year of practice, one square a day — or half a year, which is usually the
 * honest window.
 *
 * The grid is the convention everybody has already learned to read, and that is
 * the point of using it. What changed in this pass is the framing around it. The
 * headline is now the streak as a sentence with the date it started, because
 * "every day since 3 July" is an achievement and "51" in a row of four KPI cells
 * is a number. And the default range is six months: an account four months old
 * spent half the year as an empty grey field, which said nothing except that the
 * chart was too long.
 *
 * Hovering a day still gives what that day actually was — questions, accuracy,
 * time — because a heatmap that only encodes volume is half a picture.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Which square the tooltip is describing, and where that square is. */
type Hover = { col: number; row: number; x: number; y: number; size: number };

type Span = "6m" | "1y";

export function Consistency({ activity }: { activity: ActivityReport }) {
  const { t } = useI18n();
  const [active, setActive] = useState<Hover | null>(null);
  const [span, setSpan] = useState<Span>("6m");

  /* Twenty-six weeks is six months of columns. */
  const weeks = useMemo(
    () => (span === "6m" ? activity.weeks.slice(-27) : activity.weeks),
    [activity.weeks, span],
  );

  const cell = active ? weeks[active.col]?.days[active.row] : null;

  /* A month is named on the first column that opens it, and never on the last
     two, where the label would run off the right edge with nothing under it. */
  const labels = weeks.map((week, index) => {
    const month = new Date(week.days[0].ms).getMonth();
    if (index >= weeks.length - 2) return null;
    if (index === 0) {
      const own = week.days.filter((day) => new Date(day.ms).getMonth() === month).length;
      return own >= 4 ? MONTHS[month] : null;
    }
    const previous = new Date(weeks[index - 1].days[0].ms).getMonth();
    return month === previous ? null : MONTHS[month];
  });

  /* The last fortnight in words, for anyone who cannot hover an 11px square. */
  const recent = weeks
    .flatMap((week) => week.days)
    .slice(-14)
    .reverse();

  const inRange = weeks.flatMap((week) => week.days);
  const activeDays = inRange.filter((day) => day.count > 0).length;
  const answered = inRange.reduce((sum, day) => sum + day.count, 0);
  const hours = inRange.reduce((sum, day) => sum + day.spent, 0) / 3_600_000;

  return (
    <div>
      <div className="pg-zone-row">
        <div className="min-w-0">
          {activity.currentStreak > 0 ? (
            <p className="pg-streak-lede">
              {fill(t("pg.streakLede"), { days: activity.currentStreak })}
              {activity.streakStart !== null && (
                <span className="pg-streak-lede-since">
                  {fill(t("pg.streakSince"), { date: asDate(activity.streakStart) })}
                </span>
              )}
            </p>
          ) : (
            <p className="pg-streak-lede">{t("pg.streakNone")}</p>
          )}
        </div>
        <Segmented
          value={span}
          options={[
            { value: "6m", label: t("pg.span6m") },
            { value: "1y", label: t("pg.span1y") },
          ]}
          onChange={(value) => {
            setSpan(value);
            setActive(null);
          }}
          label={t("pg.spanLabel")}
        />
      </div>

      {/* The column count drives the grid, so the squares are fractions of the
          column rather than a fixed size that leaves a gap beside them. */}
      <div className="pg-year" style={{ ["--pg-cols" as string]: weeks.length }}>
        <div className="pg-year-inner">
          <div className="pg-year-months" aria-hidden>
            {labels.map((label, index) => (
              <span key={index} className="pg-year-month">
                {label && <span>{label}</span>}
              </span>
            ))}
          </div>

          <div className="pg-year-grid" role="presentation">
            {weeks.map((week, col) => (
              <div key={col} className="pg-year-col">
                {Array.from({ length: 7 }, (_, row) => {
                  const day = week.days[row];
                  if (!day) {
                    return <span key={row} className="pg-year-cell pg-year-cell-pad" />;
                  }
                  return (
                    <span
                      key={row}
                      className="pg-year-cell"
                      data-level={day.level}
                      data-active={
                        active?.col === col && active?.row === row ? "true" : undefined
                      }
                      title={`${asDate(day.ms)} — ${
                        day.count === 0
                          ? t("pg.heatNone")
                          : fill(t("pg.heatQuestions"), { count: day.count })
                      }`}
                      /* Measured from the square itself rather than from a
                         constant: the cell size is a CSS variable that grows
                         with the viewport. */
                      onMouseEnter={(event) => {
                        const node = event.currentTarget;
                        setActive({
                          col,
                          row,
                          x: node.offsetLeft,
                          y: node.offsetTop,
                          size: node.offsetHeight,
                        });
                      }}
                      onMouseLeave={() =>
                        setActive((current) =>
                          current?.col === col && current?.row === row ? null : current,
                        )
                      }
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {cell && (
            <div
              className="pg-tip"
              data-show="true"
              /* Below the square for the top rows and above it for the bottom
                 ones, so the panel always stays inside the grid. */
              style={{
                left: active ? active.x : 0,
                top: active ? (active.row > 3 ? active.y : active.y + active.size) : 0,
                transform: `translate(${
                  (active?.col ?? 0) > weeks.length * 0.62
                    ? `calc(-100% + ${active?.size ?? 11}px)`
                    : "-2px"
                }, ${active && active.row > 3 ? "calc(-100% - 8px)" : "8px"})`,
              }}
            >
              <p className="pg-tip-date">{asDate(cell.ms, true)}</p>
              {cell.count === 0 ? (
                <p className="pg-tip-note">{t("pg.heatNone")}</p>
              ) : (
                <>
                  <p className="pg-tip-row">
                    <span>{t("pg.vitalQuestions")}</span>
                    <span>{cell.count}</span>
                  </p>
                  <p className="pg-tip-row">
                    <span>{t("pg.colAccuracy")}</span>
                    <span>{asPercent(cell.correct / cell.count)}</span>
                  </p>
                  {cell.spent > 0 && (
                    <p className="pg-tip-row">
                      <span>{t("pg.heatRowTime")}</span>
                      <span>{asDuration(Math.round(cell.spent / 1000))}</span>
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* One quiet line, not four KPI cells: the streak is the headline above,
          and these are the totals behind it. */}
      <div className="pg-year-foot">
        <span className="pg-year-key-row">
          <span>{t("pg.heatLess")}</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className="pg-year-key" data-level={level} aria-hidden />
          ))}
          <span>{t("pg.heatMore")}</span>
        </span>
        <span className="pg-year-totals">
          {[
            fill(t("pg.footActive"), { days: activeDays, answered }),
            fill(t("pg.footHours"), { hours: Math.round(hours * 10) / 10 }),
            fill(t("pg.footLongest"), { days: activity.longestStreak }),
          ].join(" · ")}
        </span>
      </div>

      <div className="sr-only">
        <table>
          <caption>{t("pg.heatCaption")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("pg.trendDate")}</th>
              <th scope="col">{t("pg.trendVolume")}</th>
              <th scope="col">{t("pg.colAccuracy")}</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((day) => (
              <tr key={day.day}>
                <th scope="row">{asDate(day.ms, true)}</th>
                <td>{day.count}</td>
                <td>{day.count === 0 ? "—" : asPercent(day.correct / day.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Personal records.
 *
 * A training log: one line of figures, each with the date it was set. Progress
 * has to be rewarding or nobody returns to look at it, and the honest way to
 * reward it is to name things the student actually did — not to award them a
 * badge for opening the app. A record not yet set says what would set it.
 */
export function Records({ milestones }: { milestones: Milestone[] }) {
  const { t } = useI18n();

  return (
    <dl className="pg-records">
      {milestones.map((milestone) => (
        <div key={milestone.id} className="pg-record">
          <dt className="pg-record-label">{label(milestone, t)}</dt>
          <dd>
            <p
              className="pg-record-value"
              data-empty={milestone.value === null ? "true" : undefined}
            >
              {milestone.value === null ? t("pg.recPending") : value(milestone)}
            </p>
            <p className="pg-record-note">{note(milestone, t)}</p>
            {milestone.next && (
              <span className="pg-record-track">
                <span
                  className="pg-record-fill"
                  style={{
                    width: `${Math.min(100, Math.max(2, milestone.next.progress * 100))}%`,
                  }}
                />
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function label(milestone: Milestone, t: (key: string) => string): string {
  const base = t(`pg.rec.${milestone.id}`);
  if (milestone.id === "bestWeek" && milestone.subjectId) {
    const subject = getSubject(milestone.subjectId);
    return subject ? `${base} · ${subject.name.en}` : base;
  }
  return base;
}

function value(milestone: Milestone): string {
  const raw = milestone.value ?? 0;
  switch (milestone.unit) {
    case "percent":
      return asPercent(raw);
    case "points":
      return `${asPoints(raw)} pts`;
    default:
      return String(raw);
  }
}

function note(milestone: Milestone, t: (key: string) => string): string {
  if (milestone.value === null) {
    if (milestone.id === "bestAccuracyDay") {
      return fill(t("pg.recPendingHint"), { count: RULES.bestDayMin });
    }
    if (milestone.id === "bestWeek") {
      return fill(t("pg.emptyMore"), { count: RULES.bestWeekMin });
    }
    return "";
  }

  switch (milestone.id) {
    case "volume":
      return milestone.next
        ? fill(t("pg.rec.volumeNext"), {
            remaining: milestone.next.target - (milestone.value ?? 0),
            target: milestone.next.target,
          })
        : "";
    case "bestDay":
      return `${asDate(milestone.at ?? 0)} · ${fill(t("pg.rec.bestDayNote"), {
        percent: `${milestone.note ?? 0}%`,
      })}`;
    case "bestAccuracyDay":
      return `${asDate(milestone.at ?? 0)} · ${fill(t("pg.rec.bestAccuracyDayNote"), {
        count: milestone.note ?? 0,
      })}`;
    case "longestStreak":
      return fill(t("pg.rec.longestStreakNote"), { count: milestone.note ?? 0 });
    case "bestMock":
      return `${milestone.at ? `${asDate(milestone.at)} · ` : ""}${fill(
        t("pg.rec.bestMockNote"),
        { count: milestone.note ?? 0 },
      )}`;
    case "bestWeek":
      return `${milestone.at ? `${asDate(milestone.at)} · ` : ""}${fill(
        t("pg.rec.bestWeekNote"),
        { count: milestone.note ?? 0 },
      )}`;
    case "mostImproved":
      return `${milestone.label ?? ""} · ${fill(t("pg.rec.mostImprovedNote"), {
        days: RULES.windowDays,
      })}`;
    default:
      return "";
  }
}
