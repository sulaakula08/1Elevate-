"use client";

import { useEffect, useState } from "react";
import { countdownTo, formatExamDate, nextExam, type Countdown } from "@/config/exam";
import { useI18n } from "@/lib/i18n";

/**
 * Time to the next scheduled SAT.
 *
 * ── On hydration ───────────────────────────────────────────────────────────
 * This page is prerendered at build time, so anything derived from `Date.now()`
 * during render would be baked into the HTML and then disagree with the client
 * a moment later — React would warn, and the first paint would show a number
 * from whenever the build ran. The fix is that `now` starts as null and is only
 * filled in from an effect: the server and the client's first render produce
 * the same placeholder, and the real figure appears once the component is
 * mounted and the clock is genuinely the visitor's own.
 *
 * ── On time zones ──────────────────────────────────────────────────────────
 * The countdown is a subtraction between two absolute instants — `Date.parse`
 * of an ISO string that carries its own UTC offset, minus the browser's clock —
 * so it is correct in any zone the student happens to be in. The zone in the
 * config is used only to print the calendar date the way the test centre states
 * it, which is not the same question.
 */
export function ExamCountdown() {
  const { t } = useI18n();
  const [now, setNow] = useState<number | null>(null);

  // Adopting the clock after mount is the whole mechanism: reading it during
  // render is exactly the thing that would bake build time into the HTML. The
  // setState here is deliberate, as it is in app-state and i18n.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setNow(Date.now());
    // A minute is the smallest unit shown, so a minute is how often this needs
    // to wake up. A per-second tick would repaint 60× for no visible change.
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const exam = now === null ? null : nextExam(now);
  const left: Countdown | null = exam && now !== null ? countdownTo(exam, now) : null;

  if (now !== null && !exam) {
    return (
      <section className="pl-countdown pl-countdown-empty">
        <p className="pl-countdown-label">{t("plan.countdownLabel")}</p>
        <p className="text-[15px] font-medium text-foreground">{t("plan.countdownNone")}</p>
        <p className="pl-countdown-date">{t("plan.countdownNoneHint")}</p>
      </section>
    );
  }

  return (
    <section className="pl-countdown">
      <p className="pl-countdown-label">{t("plan.countdownLabel")}</p>

      {/* Before mount the three slots are drawn as em dashes, so the block is
          already its final size and nothing jumps when the numbers arrive. */}
      <div className="pl-countdown-row" aria-live="polite">
        {(
          [
            [left?.days, t("plan.countdownDays")],
            [left?.hours, t("plan.countdownHours")],
            [left?.minutes, t("plan.countdownMinutes")],
          ] as [number | undefined, string][]
        ).map(([value, unit]) => (
          <span key={unit} className="pl-countdown-part">
            <span className="pl-countdown-n">{value ?? "—"}</span>
            <span className="pl-countdown-u">{unit}</span>
          </span>
        ))}
      </div>

      <p className="pl-countdown-date">{exam ? formatExamDate(exam) : " "}</p>
    </section>
  );
}
