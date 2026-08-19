"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { CountUp } from "./motion";

/**
 * The moment the review queue empties.
 *
 * Clearing it is the only thing on this page that is genuinely finished — every
 * other state is a list getting shorter — and until now it looked identical to
 * never having started: the same quiet empty state a new account sees on its
 * first visit. This is the one place in the product where a flourish is earned,
 * so the page says so properly.
 *
 * It only ever renders on the transition. A student who arrives with an empty
 * queue still gets the plain empty state, because congratulating someone for
 * work they did last week — or never did — is how a celebration stops meaning
 * anything.
 *
 * The sequence is staged rather than simultaneous: rings out, tick drawn,
 * sparks thrown, then the words. Everything arriving at once reads as a page
 * that simply appeared; a beat between the mark and the number is what makes it
 * feel like a response to what the student just did.
 */
export function QueueCleared({
  count,
  onDismiss,
}: {
  /** How many were in the queue when this sitting started. */
  count: number;
  /** Returns to the ordinary empty state, for anyone who wants it gone. */
  onDismiss: () => void;
}) {
  const { t } = useI18n();
  /* Held back one frame so the entrance animations start from their first
     keyframe. Mounting mid-animation is what makes a celebration look like a
     layout shift. */
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setPlaying(true));
    /*
     * Safety net, the same one Reveal carries. requestAnimationFrame does not
     * fire while the tab is in the background, and every line below starts at
     * opacity 0 waiting for this flag — without a timer, finishing the queue
     * and switching tabs before the frame lands would leave the page blank on
     * return, with nothing to nudge it back.
     */
    const fallback = window.setTimeout(() => setPlaying(true), 400);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <div className="qc" data-playing={playing ? "" : undefined}>
      {/*
       * The mark. Two expanding rings behind a drawn tick, with twelve sparks
       * thrown outward from the centre — each one an element rotated to its own
       * angle, so a single keyframe animation serves all of them and the whole
       * burst costs no JavaScript at all.
       */}
      <div className="qc-mark" aria-hidden>
        <span className="qc-ring" />
        <span className="qc-ring qc-ring-2" />

        <span className="qc-sparks">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} style={{ ["--a" as string]: `${i * 30}deg`, ["--d" as string]: `${i * 18}ms` }} />
          ))}
        </span>

        <svg viewBox="0 0 48 48" width="64" height="64" fill="none" className="qc-tick">
          <circle cx="24" cy="24" r="21" stroke="var(--success)" strokeWidth="1.5" pathLength={1} />
          <path
            d="M15 24.5l6 6 12-13"
            stroke="var(--success)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
          />
        </svg>
      </div>

      <p className="qc-title display">{t("review.clearedTitle")}</p>

      <p className="qc-count num">
        <CountUp value={count} />
        <span className="qc-count-label">{t("review.clearedCount")}</span>
      </p>

      <p className="qc-body">{t("review.clearedBody")}</p>

      <div className="qc-actions">
        <Link href="/practice" className="btn btn-primary">
          {t("review.clearedPractice")}
        </Link>
        <Link href="/progress" className="btn">
          {t("review.clearedProgress")}
        </Link>
        <button type="button" className="rv-clear" onClick={onDismiss}>
          {t("review.clearedDismiss")}
        </button>
      </div>
    </div>
  );
}
