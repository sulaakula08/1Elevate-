"use client";

import { useRef } from "react";
import { useReducedMotion } from "motion/react";
import { DEMO_COHORT, DEMO_OUTCOMES, type DemoOutcome } from "@/data/landing-demo";
import { useI18n } from "@/lib/i18n";
import { useCountTo, useEntered, useScrollVar } from "./scroll";

/**
 * The outcomes wall.
 *
 * ---- what is real here and what is not ----
 *
 * Nothing. Every student, score, city and quote comes from `landing-demo.ts`,
 * which exists to be replaced. The whole section is switched off on production
 * builds unless someone deliberately turns it on — read the header of that file
 * before touching this one. `data-synthetic` on the root is the marker that says
 * so from devtools without saying it to a reader.
 *
 * ---- why it is not a grid of testimonials ----
 *
 * The interesting fact about each student is one number moving, so that is what
 * a card is: the two scores, the gain, and nothing else until you ask. Asking is
 * hovering, and the answer arrives as a panel rising over the card rather than as
 * the card growing — so the wall never reflows, six cards never jump when one is
 * pointed at, and the whole interaction is two transforms.
 *
 * The score does not count up from zero. It counts from where the student
 * started, because a number sweeping 0 → 1390 is a slot machine and a number
 * sweeping 1240 → 1390 is the claim being made.
 */
export function Results() {
  const { t } = useI18n();
  const scope = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const entered = useEntered(scope, { threshold: 0.08 });

  useScrollVar(scope, { range: "through", property: "--p", enabled: !reduced });

  return (
    <section
      id="outcomes"
      ref={scope}
      className="lp-res"
      aria-labelledby="lp-res-title"
      /* Invisible to a reader, unmissable in a code review or a devtools
         inspection: everything below this node is invented. */
      data-synthetic="true"
    >
      <header className="lp-res-head">
        <p className="t-label">{t("lp.resultsEyebrow")}</p>
        <h2 id="lp-res-title" className="lp-res-title">
          {t("lp.resultsTitle")}
        </h2>
        <p className="lp-res-sub">{t("lp.resultsSub")}</p>
      </header>

      <dl className="lp-res-cohort">
        {DEMO_COHORT.map((figure, i) => (
          <Figure
            key={figure.id}
            figure={figure}
            run={entered}
            index={i}
            instant={Boolean(reduced)}
          />
        ))}
      </dl>

      <ul className="lp-res-wall">
        {DEMO_OUTCOMES.map((outcome, i) => (
          <li
            key={outcome.id}
            className="lp-res-slot"
            data-featured={i === 0 ? "" : undefined}
            style={{ ["--i" as string]: i }}
          >
            <Card
              outcome={outcome}
              run={entered}
              index={i}
              instant={Boolean(reduced)}
              featured={i === 0}
            />
          </li>
        ))}
      </ul>

      <p className="lp-res-hint">
        <span className="lp-res-hint-pointer">{t("lp.resultsHint")}</span>
        <span className="lp-res-hint-touch">{t("lp.resultsHintTouch")}</span>
      </p>
    </section>
  );
}

/** One cohort figure. Counts from zero, because a total has no earlier value. */
function Figure({
  figure,
  run,
  index,
  instant,
}: {
  figure: (typeof DEMO_COHORT)[number];
  run: boolean;
  index: number;
  /** Reduced motion: the number is its value, not a number arriving at it. */
  instant: boolean;
}) {
  // Staggered by giving each figure its own duration rather than its own timer:
  // three numbers that land on the same frame read as one number in three
  // places, and three timers to avoid that would be three timers too many.
  const shown = useCountTo(figure.value, run, {
    duration: instant ? 0 : 950 + index * 220,
  });

  return (
    <div className="lp-res-figure" style={{ ["--i" as string]: index }} data-in={run ? "" : undefined}>
      <dt className="lp-res-figure-value num">
        {figure.prefix}
        {shown}
        {figure.suffix}
      </dt>
      <dd className="lp-res-figure-label">{figure.label}</dd>
    </div>
  );
}

function Card({
  outcome,
  run,
  index,
  instant,
  featured,
}: {
  outcome: DemoOutcome;
  run: boolean;
  index: number;
  instant: boolean;
  featured: boolean;
}) {
  const { t } = useI18n();
  const gain = outcome.to - outcome.from;
  const score = useCountTo(outcome.to, run, {
    from: outcome.from,
    duration: instant ? 0 : 1150 + index * 130,
  });

  return (
    /*
     * `tabIndex` and no role: the card is a paragraph of text that happens to
     * reveal more of itself, not a control. Making it focusable is what lets a
     * keyboard reader open it — the CSS expands on `:focus-visible` and `:hover`
     * alike — and giving it a button role would promise an action it does not
     * perform. Every word inside is in the DOM at all times, so a screen reader
     * never depends on the expansion at all.
     */
    <article
      className="lp-res-card"
      tabIndex={featured ? undefined : 0}
      data-in={run ? "" : undefined}
      data-featured={featured ? "" : undefined}
    >
      <p className="lp-res-scores">
        <span className="num lp-res-from">{outcome.from}</span>
        <span className="lp-res-arrow" aria-hidden />
        <span className="num lp-res-to">{score}</span>
      </p>

      <p className="lp-res-delta num">
        +{gain} <span>{t("lp.resultsGain")}</span>
      </p>

      <span
        className="lp-res-gain-bar"
        style={{ ["--gain" as string]: Math.min(gain / 160, 1) }}
        aria-hidden
      />

      {/*
        In the resting state the card ends on the skill that moved, not on white
        space. The first version kept everything but the two scores behind the
        hover, which left six cards each holding two lines in a box twice that
        tall — a wall of unfinished cards, and no reason to point at one.

        The skill is also the most product-specific fact here: it says the gain
        came from somewhere nameable.
      */}
      <p className="lp-res-fixed">
        <span className="t-label">{t("lp.resultsFixed")}</span>
        <span className="lp-res-skill">{outcome.skill}</span>
      </p>

      <div className="lp-res-panel">
        <div className="lp-res-person">
          <span className="lp-res-avatar" aria-hidden>
            {outcome.name.slice(0, 1)}
          </span>
          <p className="lp-res-who">
            <strong>{outcome.name}</strong>
          <span aria-hidden> · </span>
            <span className="lp-res-place">{outcome.place}</span>
          </p>
        </div>
        <blockquote className="lp-res-quote">{outcome.quote}</blockquote>
        <p className="lp-res-facts num">
          {outcome.answered} {t("lp.resultsAnswered")}
          <span aria-hidden> · </span>
          {outcome.weeks} {t("lp.resultsWeeks")}
        </p>
      </div>
    </article>
  );
}
