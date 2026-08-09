"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

/**
 * The few seconds between "begin" and the first question.
 *
 * It is doing real work — the four modules are dealt out of the bank while this
 * is on screen — but the point is as much ceremony as cover: the test proper
 * should not start on the same click that ended the browsing. Four labelled
 * steps make the wait legible instead of dead.
 */

const TOTAL_MS = 3600;

const STEPS = [
  "mock.loadStep1",
  "mock.loadStep2",
  "mock.loadStep3",
  "mock.loadStep4",
] as const;

export function MockLoader({ onReady }: { onReady: () => void }) {
  const { t } = useI18n();
  const [progress, setProgress] = useState(0);

  // onReady is called from a timer, so keep the ref fresh rather than
  // re-arming the countdown every time the parent re-renders.
  const readyRef = useRef(onReady);
  useEffect(() => {
    readyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const started = performance.now();
    let frame = 0;
    const tick = () => {
      const ratio = Math.min(1, (performance.now() - started) / TOTAL_MS);
      setProgress(ratio);
      if (ratio < 1) frame = requestAnimationFrame(tick);
      else readyRef.current();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // The last step stays "in progress" until the whole thing is done, so nothing
  // reads as finished a beat before the screen hands over.
  const reached = Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length));
  const radius = 34;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="mk-load fade-in" role="status" aria-live="polite">
      <div className="mk-load-inner">
        <svg className="mk-ring" width="88" height="88" viewBox="0 0 88 88" aria-hidden>
          <circle cx="44" cy="44" r={radius} fill="none" stroke="var(--line)" strokeWidth="3" />
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="var(--brand)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
          />
        </svg>

        <p className="display mt-7 text-h2">{t("mock.loadTitle")}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("mock.loadSub")}</p>

        <div className="mk-steps">
          {STEPS.map((key, i) => (
            <p
              key={key}
              className={`mk-step ${
                i < reached ? "mk-step-done" : i === reached ? "mk-step-on" : ""
              }`}
            >
              <span className="mk-step-dot" aria-hidden />
              {t(key)}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
