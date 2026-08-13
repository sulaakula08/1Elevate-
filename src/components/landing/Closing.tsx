"use client";

import Link from "next/link";
import { useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { LOOP_STEPS } from "./LoopFrame";
import { useEntered } from "./scroll";

/**
 * The last screen: the loop restated as five words, and one action.
 *
 * The five words are the same five the centre of the page walked through, in the
 * same order, read from the same array — so the closing cannot drift out of step
 * with the section it is summarising. The return arc under them is drawn on
 * arrival, and it is the only place on the page where the word "loop" is made
 * literal: the fifth step curves back into the first, because that is what the
 * product does on the evening after a session.
 */
export function Closing() {
  const { t } = useI18n();
  const scope = useRef<HTMLElement>(null);
  const entered = useEntered(scope, { threshold: 0.3 });

  return (
    <section ref={scope} className="lp-close" data-in={entered ? "" : undefined}>
      <p className="t-label lp-close-eyebrow">{t("lp.closeEyebrow")}</p>

      <div className="lp-close-loop">
        <ol className="lp-close-chips">
          {LOOP_STEPS.map((step, i) => (
            <li key={step.title} className="lp-close-chip" style={{ ["--n" as string]: i }}>
              {t(step.title)}
            </li>
          ))}
        </ol>

        {/*
          Three borders and two rounded corners, not an SVG path.

          The first version of this was a stretched `<svg preserveAspectRatio="none">`
          and it was a mess: at six times wider than tall, the corner curves
          smeared into a shape that read as a rendering fault. `border-radius`
          cannot stretch — a 14px corner is 14px at any width — so the same
          geometry drawn in CSS holds together from 30rem to 64rem, and there is
          no aspect ratio to keep in step with the layout.

          It draws itself with `clip-path`, right to left, which is the direction
          the return actually travels: out of Progress and back into Answer.
        */}
        <span className="lp-close-arc" aria-hidden>
          <span className="lp-close-arc-head" />
        </span>
      </div>

      <h2 className="lp-close-title display">{t("lp.closeTitle")}</h2>
      <p className="lp-close-text">{t("lp.closeText")}</p>

      <Link href="/signup" className="btn btn-primary btn-lg lp-close-cta">
        {t("landing.start")}
      </Link>
      <p className="lp-close-fine">{t("landing.noCard")}</p>
    </section>
  );
}
