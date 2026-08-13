"use client";

import { useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { useI18n } from "@/lib/i18n";
import { LOOP_STAGE_COUNT, LOOP_STEPS, LoopFrame } from "./LoopFrame";
import { useEntered, useMediaQuery, useScrollStage, useScrollVar } from "./scroll";

/**
 * The centre of the page: one mistake, walked from the answer to the plan.
 *
 * ---- the two modes ----
 *
 * The section renders one set of markup and presents it two ways, chosen by
 * `data-mode` on the root:
 *
 *   scroll — a tall track with a sticky composition inside it. Scrolling moves
 *            the sequence; the step rail on the left names where you are. Used
 *            on wide viewports when motion is allowed.
 *   manual — the same frame and the same five steps, advanced by tapping. Used
 *            on phones, and used on any viewport when the reader has asked for
 *            reduced motion, where content that changes as the page moves under
 *            you is exactly the wrong answer.
 *
 * Both modes tell the identical story with identical copy. The mobile version is
 * not a fallback with the interesting part removed.
 *
 * `manual` is also what the server renders, and that is deliberate. It is the
 * mode that needs no measurement, no scroll listener and no viewport query, so
 * the first paint is correct for everyone; wide viewports upgrade to `scroll`
 * after mount. Both modes start on step one, so nothing on screen changes when
 * the upgrade happens — the track simply becomes tall, below the fold, where
 * there is nothing to push.
 *
 * ---- what drives what ----
 *
 * `useScrollStage` is the only scroll subscription that reaches React, and it
 * changes state four times across the whole section. The rail fill is a CSS
 * property written by `useScrollVar`, so the one genuinely continuous piece of
 * motion never renders a component at all.
 */
export function LearningLoop() {
  const { t } = useI18n();
  const reduced = useReducedMotion();

  const track = useRef<HTMLDivElement>(null);
  const [manualStage, setManualStage] = useState(0);

  /*
   * The one query that decides which mode this is.
   *
   * 64rem is the width at which the two-column composition has room for a step
   * rail and a product frame side by side. Below it the frame would be about
   * 20rem wide and the question inside it would wrap every second word.
   *
   * False on the server, so the server renders `manual` for everyone.
   */
  const wide = useMediaQuery("(min-width: 64rem)");
  const scrollDriven = wide && !reduced;

  const scrollStage = useScrollStage(track, LOOP_STAGE_COUNT, {
    range: "sticky",
    enabled: scrollDriven,
  });
  useScrollVar(track, { range: "sticky", property: "--p", enabled: scrollDriven });

  const entered = useEntered(track, { threshold: 0.05 });
  const stage = scrollDriven ? scrollStage : manualStage;

  const go = (next: number) =>
    setManualStage(Math.max(0, Math.min(LOOP_STAGE_COUNT - 1, next)));

  return (
    <section
      className="lp-loop"
      data-mode={scrollDriven ? "scroll" : "manual"}
      aria-labelledby="lp-loop-title"
    >
      <header className="lp-loop-head">
        <p className="t-label">{t("lp.loopEyebrow")}</p>
        <h2 id="lp-loop-title" className="lp-loop-title">
          {t("lp.loopTitle")}
        </h2>
        <p className="lp-loop-sub">{t("lp.loopSub")}</p>
      </header>

      <div className="lp-loop-track" ref={track} style={{ ["--stages" as string]: LOOP_STAGE_COUNT }}>
        <div className="lp-loop-stick">
          <div className="lp-loop-grid">
            {/* ---------------- left: where you are ---------------- */}
            <div className="lp-loop-aside">
              {/* Tap targets, only ever drawn in manual mode. Plain buttons and
                  `aria-current`, not an ARIA tablist: there is one panel and it
                  is a picture, so borrowing the tab pattern would promise
                  keyboard semantics (arrow-key roving) that the widget does not
                  implement. */}
              <nav className="lp-loop-tabs" aria-label={t("lp.loopTitle")}>
                {LOOP_STEPS.map((step, i) => (
                  <button
                    key={step.title}
                    type="button"
                    className="lp-loop-tab"
                    data-on={i === stage ? "" : undefined}
                    aria-current={i === stage ? "step" : undefined}
                    onClick={() => go(i)}
                  >
                    <span className="num">0{i + 1}</span>
                    <span className="lp-loop-tab-name">{t(step.title)}</span>
                  </button>
                ))}
              </nav>

              <ol className="lp-loop-steps">
                {/* The rail is one element scaled by the scroll property, so the
                    only continuously animating thing in the section is a
                    compositor transform on a 2px line. */}
                <span className="lp-loop-rail" aria-hidden>
                  <span className="lp-loop-rail-fill" />
                </span>

                {LOOP_STEPS.map((step, i) => (
                  <li
                    key={step.title}
                    className="lp-loop-step"
                    data-on={i === stage ? "" : undefined}
                    data-done={i < stage ? "" : undefined}
                    aria-current={i === stage ? "step" : undefined}
                  >
                    <p className="lp-loop-step-index num">0{i + 1}</p>
                    <h3 className="lp-loop-step-title">{t(step.title)}</h3>
                    {/* The span is load-bearing: `grid-template-rows: 0fr` only
                        collapses a real grid item, and a bare text node is an
                        anonymous one. See landing.css. */}
                    <p className="lp-loop-step-text">
                      <span>{t(step.text)}</span>
                    </p>
                  </li>
                ))}
              </ol>

              <div className="lp-loop-nav">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => go(stage - 1)}
                  disabled={stage === 0}
                >
                  {t("lp.loopPrev")}
                </button>
                <span className="lp-loop-count num">
                  {stage + 1} {t("lp.loopOf")} {LOOP_STAGE_COUNT}
                </span>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => go(stage + 1)}
                  disabled={stage === LOOP_STAGE_COUNT - 1}
                >
                  {t("lp.loopNext")}
                </button>
              </div>

              <p className="lp-loop-hint" aria-hidden>
                {t("lp.loopScrollHint")}
                <span className="lp-loop-hint-arrow" />
              </p>
            </div>

            {/* ---------------- right: the product ---------------- */}
            <div className="lp-loop-stage">
              <LoopFrame stage={stage} active={entered} reduced={Boolean(reduced)} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
