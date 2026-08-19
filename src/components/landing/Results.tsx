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
      <div className="lp-future-head" data-motion="section-head">
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
              {FUTURE_RESULTS.map((result) => (
                <li key={result.id} className="lp-future-slide">
                  <ResultCard result={result} />
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
 * One card, drawn as the score report a student is actually handed: who and
 * which sitting, then a white report panel with the total and the two section
 * scores, then the skill and the gain.
 *
 * Four things that were on this card are gone: a card index, a scale bar, a
 * "previous 1370" row and the report's readiness sentence. Each was true, and
 * together they turned a result you could read in one look into a form. The
 * report itself only prints the total, its range and the two sections large;
 * everything else on it is small print, and small print does not belong on a
 * card going past in a marquee.
 */
function ResultCard({ result }: { result: FutureResult }) {
  const { t } = useI18n();
  const gain = result.to - result.from;

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
        <p className="lp-future-admin">
          SAT · {result.administration} {t("lp.resultsAdministration")}
        </p>
      </header>

      <div className="lp-future-report">
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

      {/* The gain rides on the skill line rather than getting a row of its own:
          "+170" and "the skill that moved" are one sentence, not two facts. */}
      <div className="lp-future-skill">
        <span>{t("lp.resultsMoved")}</span>
        <p>
          <strong>{result.skill}</strong>
          <em className="num">
            +{gain}
            <span className="sr-only"> {t("lp.resultsGain")}</span>
          </em>
        </p>
      </div>
    </article>
  );
}
