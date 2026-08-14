"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Attempt } from "@/lib/storage";
import { contributionYear, streak } from "@/lib/stats";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { NOUNS, pluralize } from "@/lib/plural";

/**
 * Counts from wherever the display currently is up to `target`.
 *
 * Two cases, one mechanism. On mount it runs 0 → n, so the streak arrives as a
 * tally being taken rather than as a number that was always there. When the
 * streak later grows — a first attempt logged today, on a dashboard already
 * open — it runs from the old value to the new one, which is the only moment
 * the count actually means something.
 *
 * `settled` is the flag the caller uses to fire the landing animation: it goes
 * false while the digits are still moving and true on the frame they stop, so
 * the bump plays once, at the end, instead of fighting the count.
 */
function useCountUp(target: number, ms = 850) {
  const [value, setValue] = useState(target);
  const [running, setRunning] = useState(false);
  // Where the last run finished, so an interrupted count resumes from what the
  // student can currently see rather than snapping back to the old target.
  const shown = useRef(target);
  const first = useRef(true);

  useEffect(() => {
    const reduced =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;

    const from = first.current ? 0 : shown.current;
    first.current = false;

    // Nothing to travel, or the student asked for no motion.
    if (reduced || from === target) {
      shown.current = target;
      setValue(target);
      return;
    }

    setRunning(true);
    let raf = 0;
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      // Ease-out cubic: fast off the mark, decelerating onto the final digit,
      // which is what makes the last number feel arrived at.
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (target - from) * eased);
      shown.current = next;
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(step);
      else setRunning(false);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return { value, settled: !running };
}

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

  const { settings } = useSettings();

  const { weeks, days, activeDays, total, todayCount } = useMemo(() => {
    const year = contributionYear(attempts);
    return {
      weeks: year.weeks.slice(-WEEKS),
      days: streak(attempts),
      activeDays: year.activeDays,
      total: year.total,
      todayCount: year.todayCount,
    };
  }, [attempts]);

  const goal = settings.dailyGoal;
  const goalMet = goal > 0 && todayCount >= goal;

  const { value: shownDays, settled } = useCountUp(days);

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
          <span className="act-streak-wrap" data-landed={settled ? "true" : undefined}>
            {/* The glow is a sibling, not a filter on the SVG: a drop-shadow
                cannot be animated independently of the shape casting it, and
                the point is that the light lags the flame. */}
            <span className="act-flame">
              <span className="act-flame-glow" aria-hidden />
              <svg viewBox="0 0 24 24" aria-hidden>
                <path
                  className="act-flame-outer"
                  d="M13.2 2.4c.5 3.6-1.9 4.8-3.4 6.8-1.2 1.6-1.3 3.2-.3 4.5.2-1.6 1.2-2.7 2.5-3.9.1 2.3 2.4 3.2 2.4 5.7 0 1.5-.9 2.8-2.3 3.3 2.8-.1 5.3-2.1 5.8-4.9.7-4.1-1.7-8.2-4.7-11.5Z"
                />
                <path
                  className="act-flame-core"
                  d="M10.4 20.5c-2.5-.7-4.3-2.8-4.3-5.4 0-2.2 1.2-4.1 2.8-5.8-.2 2.7 1 3.6 1.8 4.7.9 1.2 1 2.4.4 3.4-.5.8-.9 1.7-.7 3.1Z"
                />
              </svg>
            </span>
            {/* The digits move, so the accessible value must not: a screen
                reader announcing "1 day streak… 2… 3…" is noise. The live text
                is the real number, the animated one is decoration. */}
            <span>
              <span className="num act-streak" aria-hidden>
                {shownDays}
              </span>
              <span className="sr-only">{days}</span>{" "}
              <span>{t("home.actStreak")}</span>
            </span>
          </span>
        ) : (
          <span className="text-muted">{t("home.actNoStreak")}</span>
        )}
      </p>

      {/* The goal, only once there is one. A bar showing 0 of 0 is a widget
          advertising a feature rather than reporting a fact. */}
      {goal > 0 && (
        <div className="act-goal">
          <div className="act-goal-head">
            <span className="num">
              {Math.min(todayCount, goal)} / {goal}
            </span>
            <span className="text-muted">
              {goalMet ? t("home.actGoalMet") : t("home.actGoalToday")}
            </span>
          </div>
          <div className="act-goal-track">
            <div
              className="act-goal-fill"
              data-met={goalMet ? "true" : undefined}
              style={{ width: `${Math.min(1, todayCount / goal) * 100}%` }}
            />
          </div>
        </div>
      )}

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
