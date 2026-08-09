"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

/**
 * The ten-minute break between Reading and Writing and Math.
 *
 * The real test gives it, so a practice test that skips straight into Math
 * trains the wrong pacing. It runs itself down and then moves on; a student in a
 * hurry can end it early, which is also what the real app allows.
 */

const BREAK_SECONDS = 10 * 60;

const TIPS = ["mock.breakTip1", "mock.breakTip2", "mock.breakTip3"] as const;

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function BreakScreen({
  nextSectionName,
  onDone,
}: {
  nextSectionName: string;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [left, setLeft] = useState(BREAK_SECONDS);

  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          doneRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const ratio = left / BREAK_SECONDS;
  const radius = 92;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="mk-break fade-in">
      <p className="label-xs">{t("mock.breakLabel")}</p>

      <div className="relative mt-6 grid place-items-center">
        <svg className="mk-break-dial" viewBox="0 0 200 200" aria-hidden>
          <circle cx="100" cy="100" r={radius} fill="none" stroke="var(--line)" strokeWidth="4" />
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="var(--brand)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - ratio)}
          />
        </svg>
        <p
          className="mk-break-clock absolute"
          role="timer"
          aria-live="off"
          aria-label={t("mock.breakLabel")}
        >
          {clock(left)}
        </p>
      </div>

      <p className="display mt-9 text-h2">{t("mock.breakTitle")}</p>
      <p className="mt-2.5 max-w-sm text-sm leading-relaxed text-muted">
        {t("mock.breakBody")}
      </p>

      <div className="mk-break-tips">
        {TIPS.map((key) => (
          <p key={key} className="mk-break-tip">
            <span aria-hidden>·</span>
            {t(key)}
          </p>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-3">
        <button className="btn btn-primary btn-lg" onClick={onDone}>
          {t("mock.breakSkip")}
        </button>
        <p className="text-micro text-faint">
          {t("mock.breakNext")}: {nextSectionName}
        </p>
      </div>
    </div>
  );
}
