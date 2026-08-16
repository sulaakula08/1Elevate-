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

/** Length of the attempt strip. The caption states this number — keep them equal. */
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
      {/* Two ambient layers, both full-bleed and both pointer-transparent: a
          hairline grid that drifts against the scroll, and a single brand wash
          held at an alpha where it reads as light in the room rather than as a
          gradient someone added. */}
      <div className="lp-mf-field" aria-hidden>
        <span className="lp-mf-grid" />
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

      {/* ---- the attempt strip ----
          48 answers, six of them wrong. The misses rise, take the brand colour
          and keep their height as the section resolves, so the graphic performs
          the sentence beside it instead of illustrating it. */}
      <figure className="lp-mf-strip-block">
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
        <figcaption className="lp-mf-caption">
          <span>{t("lp.methodStripA")}</span>{" "}
          <strong>{t("lp.methodStripB")}</strong>
        </figcaption>
      </figure>

      {/* The rule that leaves this section and arrives in the next one. It draws
          itself over the last third of the scroll, so the loop begins on a line
          the reader has already watched being drawn. */}
      <span className="lp-mf-thread" aria-hidden />
    </section>
  );
}
