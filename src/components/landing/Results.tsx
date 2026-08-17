"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { FUTURE_RESULTS, type FutureResult } from "@/data/future-results";
import { useI18n } from "@/lib/i18n";

/**
 * A deliberately labelled concept carousel for future verified SAT outcomes.
 * The profiles are design fixtures; visible copy and `data-synthetic` keep that
 * distinction clear when this page is shown before real outcomes exist.
 */
export function Results() {
  const { t } = useI18n();
  const track = useRef<HTMLOListElement>(null);
  const paused = useRef(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const carousel = track.current;
    if (!carousel || reduced) return;

    const timer = window.setInterval(() => {
      const firstCard = carousel.querySelector<HTMLElement>(".lp-future-slide");
      const bounds = carousel.getBoundingClientRect();
      const visible = bounds.top < window.innerHeight && bounds.bottom > 0;
      if (!firstCard || paused.current || !visible || document.hidden) return;

      const gap = Number.parseFloat(getComputedStyle(carousel).columnGap) || 0;
      const step = firstCard.getBoundingClientRect().width + gap;
      const maxScroll = carousel.scrollWidth - carousel.clientWidth;
      const lastStart = Math.max(0, Math.ceil(maxScroll / step));
      const current = Math.round(carousel.scrollLeft / step);
      const next = current >= lastStart ? 0 : current + 1;

      carousel.scrollTo({
        left: Math.min(next * step, maxScroll),
        behavior: "smooth",
      });
    }, 3600);

    return () => {
      window.clearInterval(timer);
    };
  }, [reduced]);

  return (
    <section
      id="outcomes"
      className="lp-future"
      aria-labelledby="lp-future-title"
      data-synthetic="true"
    >
      <div className="lp-future-head">
        <div className="lp-future-copy">
          <div className="lp-future-label-row">
            <p className="t-label">{t("lp.resultsEyebrow")}</p>
            <span className="lp-future-demo">{t("lp.resultsDemoShort")}</span>
          </div>
          <h2 id="lp-future-title" className="lp-future-title">
            {t("lp.resultsTitle")}
          </h2>
          <p className="lp-future-sub">{t("lp.resultsSub")}</p>
        </div>
      </div>

      <ol
        ref={track}
        className="lp-future-track"
        aria-label={t("lp.resultsCarousel")}
        tabIndex={0}
        onFocusCapture={() => {
          paused.current = true;
        }}
        onBlurCapture={() => {
          paused.current = false;
        }}
      >
        {FUTURE_RESULTS.map((result, index) => (
          <li key={result.id} className="lp-future-slide">
            <ResultCard result={result} index={index} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function ResultCard({ result, index }: { result: FutureResult; index: number }) {
  const { t } = useI18n();
  const gain = result.to - result.from;

  return (
    <article className="lp-future-card">
      <div className="lp-future-person">
        <span className="lp-future-avatar" aria-hidden>
          {result.name
            .split(" ")
            .map((part) => part[0])
            .slice(0, 2)
            .join("")}
        </span>
        <p>
          <strong>{result.name}</strong>
          <span>{result.place}</span>
        </p>
        <span className="lp-future-index num" aria-hidden>
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <div className="lp-future-score-block">
        <p className="t-label">{t("lp.resultsSatScore")}</p>
        <p className="lp-future-score num">{result.to}</p>
        <p className="lp-future-route num">
          <span>{result.from}</span>
          <span aria-hidden>→</span>
          <strong>+{gain}</strong>
          <span className="sr-only">{t("lp.resultsGain")}</span>
        </p>
      </div>

      <div className="lp-future-skill">
        <span>{t("lp.resultsMoved")}</span>
        <strong>{result.skill}</strong>
      </div>
    </article>
  );
}
