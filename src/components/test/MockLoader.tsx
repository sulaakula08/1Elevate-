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
 *
 * The ring is animated by CSS, not by React. It used to set `stroke-dashoffset`
 * from a requestAnimationFrame loop while a 300ms CSS transition was declared on
 * that same property: every frame restarted an ease from a stale value, so the
 * arc lagged, stuttered, and for the first half second looked like an empty
 * circle. A keyframe on the compositor cannot stutter, costs no renders, and is
 * the same three seconds either way. React is left with what it is actually
 * needed for — moving the step labels and handing over at the end.
 */

const TOTAL_MS = 3600;

const STEPS = [
  "mock.loadStep1",
  "mock.loadStep2",
  "mock.loadStep3",
  "mock.loadStep4",
] as const;

/** Geometry shared between the SVG and the keyframe that sweeps it. */
const RADIUS = 38;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function MockLoader({ onReady }: { onReady: () => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);

  // onReady is called from a timer, so keep the ref fresh rather than re-arming
  // the countdown every time the parent re-renders.
  const readyRef = useRef(onReady);
  useEffect(() => {
    readyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    // One timer per step plus the handover, instead of a frame loop: four state
    // changes over three and a half seconds is all this screen needs.
    const perStep = TOTAL_MS / STEPS.length;
    const timers = STEPS.slice(1).map((_, i) =>
      window.setTimeout(() => setStep(i + 1), perStep * (i + 1)),
    );
    timers.push(window.setTimeout(() => readyRef.current(), TOTAL_MS));
    return () => timers.forEach(window.clearTimeout);
  }, []);

  return (
    <div className="mk-load fade-in" role="status" aria-live="polite">
      <div className="mk-load-inner">
        <div className="mk-ring-holder">
          {/* A soft halo, sized off the ring. Purely light — it sits behind the
              stroke and pulses, so the ring reads as lit rather than drawn. */}
          <span className="mk-ring-glow" aria-hidden />

          <svg
            className="mk-ring"
            viewBox="0 0 96 96"
            style={{ ["--circ" as string]: CIRCUMFERENCE, ["--spin" as string]: `${TOTAL_MS}ms` }}
            aria-hidden
          >
            <defs>
              {/* Brand into its second hue, so the arc has depth along its
                  length rather than being one flat colour. */}
              <linearGradient id="mk-arc" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--brand)" />
                <stop offset="100%" stopColor="var(--brand-2)" />
              </linearGradient>
            </defs>

            <circle
              className="mk-ring-track"
              cx="48"
              cy="48"
              r={RADIUS}
              fill="none"
              strokeWidth="3"
            />
            {/* Two arcs: one sweeps with the wait, the other chases it so there
                is motion even at the moment the sweep is barely underway. */}
            <circle
              className="mk-ring-arc"
              cx="48"
              cy="48"
              r={RADIUS}
              fill="none"
              stroke="url(#mk-arc)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle
              className="mk-ring-chase"
              cx="48"
              cy="48"
              r={RADIUS}
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <p className="display mt-7 text-h2">{t("mock.loadTitle")}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("mock.loadSub")}</p>

        <div className="mk-steps">
          {STEPS.map((key, i) => (
            <p
              key={key}
              className={`mk-step ${i < step ? "mk-step-done" : i === step ? "mk-step-on" : ""}`}
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
