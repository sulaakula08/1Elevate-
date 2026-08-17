"use client";

import { FUTURE_RESULTS, type FutureResult } from "@/data/future-results";
import { useI18n } from "@/lib/i18n";

/**
 * A deliberately labelled concept carousel for future verified SAT outcomes.
 * The profiles are design fixtures; visible copy and `data-synthetic` keep that
 * distinction clear when this page is shown before real outcomes exist.
 */
export function Results() {
  const { t } = useI18n();

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
          <h2 id="lp-future-title" className="lp-future-title">
            {t("lp.resultsTitle")}
          </h2>
          <p className="lp-future-sub">{t("lp.resultsSub")}</p>
        </div>
      </div>

      <div
        className="lp-future-marquee"
        role="region"
        aria-roledescription="carousel"
        aria-label={t("lp.resultsCarousel")}
        tabIndex={0}
      >
        <div className="lp-future-track">
          {[false, true].map((duplicate) => (
            <ol
              key={duplicate ? "duplicate" : "primary"}
              className="lp-future-group"
              aria-hidden={duplicate || undefined}
            >
              {FUTURE_RESULTS.map((result, index) => (
                <li key={result.id} className="lp-future-slide">
                  <ResultCard result={result} index={index} />
                </li>
              ))}
            </ol>
          ))}
        </div>
      </div>
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
