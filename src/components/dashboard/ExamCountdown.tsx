"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatSatDate, satCountdown, satExamTime } from "@/lib/sat-date";
import { useI18n } from "@/lib/i18n";

export function ExamCountdown({ examDate }: { examDate: string }) {
  const { t } = useI18n();
  const [now, setNow] = useState<number | null>(null);
  const [timeZone, setTimeZone] = useState<string>();

  /* Date.now() starts after mount so prerendered HTML and hydration agree. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const syncTimeZone = () => setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    setNow(Date.now());
    syncTimeZone();
    const update = () => setNow(Date.now());
    const onVisibilityChange = () => {
      update();
      syncTimeZone();
    };
    const id = window.setInterval(update, 1_000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Re-resolve the local timestamp on every clock render. This is cheap and
  // lets a changed system time zone take effect as soon as the tab is revisited.
  const target = satExamTime(examDate);
  const formattedDate = useMemo(
    () => formatSatDate(examDate, timeZone),
    [examDate, timeZone],
  );
  const passed = target !== null && now !== null && target <= now;
  const left = target !== null && now !== null && !passed ? satCountdown(target, now) : null;

  if (target === null) {
    return (
      <section className="sat-countdown sat-countdown-empty">
        <div>
          <p className="sat-countdown-label">{t("plan.countdownLabel")}</p>
          <h2>{t("plan.countdownNone")}</h2>
          <p>{t("plan.countdownNoneHint")}</p>
        </div>
        <Link href="/settings#sat-exam" className="btn btn-primary">
          {t("plan.countdownSet")}
        </Link>
      </section>
    );
  }

  if (passed) {
    return (
      <section className="sat-countdown sat-countdown-empty">
        <div>
          <p className="sat-countdown-label">{t("plan.countdownLabel")}</p>
          <h2>{t("plan.countdownPassed")}</h2>
          <p>{t("plan.countdownPassedHint")}</p>
        </div>
        <Link href="/settings#sat-exam" className="btn">
          {t("plan.countdownUpdate")}
        </Link>
      </section>
    );
  }

  const units = [
    [left?.hours, t("plan.countdownHours")],
    [left?.minutes, t("plan.countdownMinutes")],
    [left?.seconds, t("plan.countdownSeconds")],
  ] as const;

  return (
    <section className="sat-countdown" aria-labelledby="sat-countdown-title">
      <div className="sat-countdown-main">
        <p className="sat-countdown-label">{t("plan.countdownLabel")}</p>
        <div className="sat-countdown-days">
          <span className="num">{left?.days ?? "—"}</span>
          <span>{t("plan.countdownDays")}</span>
        </div>
      </div>

      <div className="sat-countdown-clock" aria-live="off" aria-atomic="true">
        <div className="sat-countdown-time">
          {units.map(([value, label], index) => (
            <span key={label} className="sat-countdown-unit">
              {index > 0 && <span className="sat-countdown-colon" aria-hidden>:</span>}
              <span className="num sat-countdown-number">
                {value === undefined ? "—" : String(value).padStart(2, "0")}
              </span>
              <span className="sat-countdown-unit-label">{label}</span>
            </span>
          ))}
        </div>
        <div className="sat-countdown-meta">
          <h2 id="sat-countdown-title">
            SAT · <time dateTime={examDate}>{formattedDate}</time>
          </h2>
          <p>{t("plan.countdownDisclaimer")}</p>
        </div>
      </div>

      <Link href="/settings#sat-exam" className="sat-countdown-edit" aria-label={t("plan.countdownUpdate")}>
        {t("plan.countdownUpdate")} <span aria-hidden>→</span>
      </Link>
    </section>
  );
}
