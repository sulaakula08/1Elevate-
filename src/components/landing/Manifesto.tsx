"use client";

import { useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { useReducedMotion } from "motion/react";
import { useScrollVar } from "./scroll";

/**
 * The turn out of the hero and into the product story.
 *
 * It carries one idea and nothing else: a wrong answer is information, and the
 * rest of the page is about what happens to it. No feature is named, no benefit
 * is claimed and there is no call to action — this is the beat of silence before
 * the loop, and giving it a button would spend the attention it is meant to
 * build.
 *
 * The motion is one number. `useScrollVar` writes the section's scroll progress
 * into `--p`, and every moving part on screen — three lines of type, the drifting
 * grid, the attempt strip, the rule that draws down into the next section — is a
 * `calc()` off that one property. So the whole composition costs one
 * `setProperty` per frame and no React render at all.
 */

/** Length of the answer map. Its visible labels state this number — keep them equal. */
const STRIP_LENGTH = 48;

/**
 * Which cells are misses.
 *
 * Hand-placed rather than generated: evenly spaced misses read as a pattern and
 * random ones clump. These sit unevenly, with the pair at 22/25 close enough to
 * look like a bad patch and the gap after 38 long enough to look like a good
 * one, which is what a real session looks like.
 */
const MISSES = new Set([4, 11, 22, 25, 38, 44]);

export function Manifesto() {
  const { t } = useI18n();
  const scope = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  /*
   * `through`, not `cover`.
   *
   * `cover` measures the range over which an element fills the screen, which is
   * the natural way to think about a reveal — but this section is shorter than a
   * viewport, so that range does not exist and the engine correctly reports 0
   * then 1 with nothing in between. The reveal would snap. `through` measures the
   * whole traversal and works at any height.
   */
  useScrollVar(scope, { range: "through", enabled: !reduced });

  const lines = [t("lp.methodLine1"), t("lp.methodLine2"), t("lp.methodLine3")];

  return (
    <section id="method" ref={scope} className="lp-mf" aria-labelledby="lp-mf-title">
      {/* The 64px grid now belongs to the full landing canvas. This local,
          pointer-transparent wash still moves with the section so Method gets
          a small change in light without laying a second grid over the first. */}
      <div className="lp-mf-field" aria-hidden>
        <span className="lp-mf-wash" />
      </div>

      <p className="t-label lp-mf-eyebrow">{t("lp.methodEyebrow")}</p>

      <h2 id="lp-mf-title" className="lp-mf-statement">
        {lines.map((line, i) => (
          <span key={line} className="lp-mf-line" style={{ ["--i" as string]: i }}>
            {/* The mask is the parent; this span is what moves inside it. Two
                elements per line, because a line that fades without being
                clipped reads as a fade and a line that is clipped reads as
                type being set. */}
            <span className="lp-mf-ink">{line}</span>
          </span>
        ))}
      </h2>

      {/* One paragraph, and nothing beside it. There was a decorative
          "Answer → Explain → Review" line here, which the evidence strip one
          screen above already carries — the same five words twice in a row is
          the page repeating itself before it has said anything new. */}
      <p className="lp-mf-body">{t("lp.methodBody")}</p>

      {/* ---- the answer map ----
          A title, legend and endpoints make the encoding explicit before the
          reader has to interpret it: one block is one answer; purple is a miss. */}
      <figure className="lp-mf-strip-block" aria-labelledby="lp-mf-map-title">
        <figcaption className="lp-mf-strip-head">
          <div>
            <p id="lp-mf-map-title" className="lp-mf-strip-title">
              {t("lp.methodStripTitle")}
            </p>
            <p className="lp-mf-strip-sub">{t("lp.methodStripSub")}</p>
          </div>
          <div className="lp-mf-legend" aria-label={t("lp.methodStripLegend")}>
            <span className="lp-mf-legend-item">
              <span className="lp-mf-key" aria-hidden />
              {t("lp.methodStripCorrect")}
            </span>
            <span className="lp-mf-legend-item">
              <span className="lp-mf-key" data-miss aria-hidden />
              {t("lp.methodStripMissed")}
            </span>
          </div>
        </figcaption>

        <div className="lp-mf-strip" role="img" aria-label={t("lp.methodStripLabel")}>
          {Array.from({ length: STRIP_LENGTH }, (_, i) => (
            <span
              key={i}
              className="lp-mf-cell"
              data-miss={MISSES.has(i) ? "" : undefined}
              style={{ ["--n" as string]: i }}
            />
          ))}
        </div>
        <div className="lp-mf-strip-scale" aria-hidden>
          <span>{t("lp.methodStripStart")}</span>
          <span>{t("lp.methodStripEnd")}</span>
        </div>
        <p className="lp-mf-caption">
          <strong>{t("lp.methodStripCount")}</strong>
          <span className="lp-mf-caption-arrow" aria-hidden>→</span>
          <span>{t("lp.methodStripResult")}</span>
        </p>
      </figure>

      {/* The rule that leaves this section and arrives in the next one. It draws
          itself over the last third of the scroll, so the loop begins on a line
          the reader has already watched being drawn. */}
      <span className="lp-mf-thread" aria-hidden />
    </section>
  );
}
