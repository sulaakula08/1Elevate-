"use client";

import { useRef } from "react";
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
  const reduced = useReducedMotion();

  function move(direction: -1 | 1) {
    const carousel = track.current;
    const firstCard = carousel?.querySelector<HTMLElement>(".lp-future-slide");
    if (!carousel || !firstCard) return;

    const gap = Number.parseFloat(getComputedStyle(carousel).columnGap) || 0;
    const step = firstCard.getBoundingClientRect().width + gap;
    const current = Math.round(carousel.scrollLeft / step);
    const last = FUTURE_RESULTS.length - 1;
    const next = Math.min(last, Math.max(0, current + direction));

    carousel.scrollTo({
      left: next * step,
      behavior: reduced ? "auto" : "smooth",
    });
  }

  return (
    <section
      id="outcomes"
      className="lp-future"
      aria-labelledby="lp-future-title"
      data-synthetic="true"
    >
      <div className="lp-future-head">
        <div className="lp-future-copy">
          <p className="t-label">{t("lp.resultsEyebrow")}</p>
          <p className="lp-future-badge">{t("lp.resultsDemoBadge")}</p>
          <h2 id="lp-future-title" className="lp-future-title">
            {t("lp.resultsTitle")}
          </h2>
          <p className="lp-future-sub">{t("lp.resultsSub")}</p>
        </div>

        <div className="lp-future-controls" aria-label={t("lp.resultsControls")}>
          <button
            type="button"
            className="lp-future-control"
            onClick={() => move(-1)}
            aria-label={t("lp.resultsPrevious")}
          >
            <span aria-hidden>←</span>
          </button>
          <button
            type="button"
            className="lp-future-control"
            onClick={() => move(1)}
            aria-label={t("lp.resultsNext")}
          >
            <span aria-hidden>→</span>
          </button>
        </div>
      </div>

      <ol ref={track} className="lp-future-track" aria-label={t("lp.resultsCarousel")}>
        {FUTURE_RESULTS.map((result, index) => (
          <li key={result.id} className="lp-future-slide">
            <ResultCard result={result} index={index} />
          </li>
        ))}
      </ol>

      <p className="lp-future-note">{t("lp.resultsDisclaimer")}</p>
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
