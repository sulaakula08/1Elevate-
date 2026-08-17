"use client";

import type { CSSProperties } from "react";
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

/**
 * One card, drawn as the score report a student is actually handed: a coloured
 * administration band, then a white report panel carrying the total against its
 * 400–1600 scale and the two section scores beside it.
 *
 * The earlier card showed a single large number with a "from → gain" line under
 * it, which read as a marketing stat rather than as a result. Everything here is
 * the same data; it is arranged the way the score report arranges it, so the
 * card is legible as an outcome at a glance.
 */
function ResultCard({ result, index }: { result: FutureResult; index: number }) {
  const { t } = useI18n();
  const gain = result.to - result.from;
  // Where the total sits on the 400–1600 scale, and where it started. Used for
  // the scale bar, which is the one part of the report that is a picture.
  const position = (score: number) => ((score - 400) / 1200) * 100;

  return (
    <article className="lp-future-card">
      <header className="lp-future-band">
        <span className="lp-future-avatar" aria-hidden>
          {result.name
            .split(" ")
            .map((part) => part[0])
            .slice(0, 2)
            .join("")}
        </span>
        <p className="lp-future-person">
          <strong>{result.name}</strong>
          <span>{result.place}</span>
        </p>
        <span className="lp-future-index num" aria-hidden>
          {String(index + 1).padStart(2, "0")}
        </span>
        <p className="lp-future-admin">
          SAT · {result.administration} {t("lp.resultsAdministration")}
        </p>
      </header>

      <div className="lp-future-report">
        <div className="lp-future-report-top">
          <div className="lp-future-total">
            <p className="lp-future-report-label">{t("lp.resultsTotalScore")}</p>
            <p className="lp-future-score num">{result.to}</p>
            <p className="lp-future-range num">{t("lp.resultsRange")}</p>
          </div>

          <dl className="lp-future-sections">
            <div>
              <dt>{t("lp.resultsRw")}</dt>
              <dd className="num">{result.rw}</dd>
            </div>
            <div>
              <dt>{t("lp.resultsMath")}</dt>
              <dd className="num">{result.math}</dd>
            </div>
          </dl>
        </div>

        <div
          className="lp-future-scale"
          style={
            {
              "--from-pos": `${position(result.from)}%`,
              "--to-pos": `${position(result.to)}%`,
            } as CSSProperties
          }
          aria-hidden
        >
          <span className="lp-future-scale-span" />
          <span className="lp-future-scale-dot" />
        </div>

        <p className="lp-future-route num">
          <span>
            {t("lp.resultsPrevious")} <span className="num">{result.from}</span>
          </span>
          <strong>
            +{gain}
            <span className="sr-only"> {t("lp.resultsGain")}</span>
          </strong>
        </p>

        <p className="lp-future-benchmark">{t("lp.resultsBenchmark")}</p>
      </div>

      <div className="lp-future-skill">
        <span>{t("lp.resultsMoved")}</span>
        <strong>{result.skill}</strong>
      </div>
    </article>
  );
}
