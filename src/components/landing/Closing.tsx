"use client";

import Link from "next/link";
import { useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { LOOP_STEPS } from "./LoopFrame";
import { useEntered } from "./scroll";

/** The last screen turns the page's mechanism into one concrete next session. */
export function Closing() {
  const { t } = useI18n();
  const scope = useRef<HTMLElement>(null);
  const entered = useEntered(scope, { threshold: 0.3 });

  return (
    <section
      id="start"
      ref={scope}
      className="lp-close"
      data-in={entered ? "" : undefined}
      aria-labelledby="lp-close-title"
    >
      <div className="lp-close-grid">
        <div className="lp-close-copy">
          <p className="t-label lp-close-eyebrow">{t("lp.closeEyebrow")}</p>
          <h2 id="lp-close-title" className="lp-close-title display">
            {t("lp.closeTitle")}
          </h2>
          <p className="lp-close-text">{t("lp.closeText")}</p>

          <div className="lp-close-actions">
            <Link href="/signup" className="btn btn-primary btn-lg lp-close-cta">
              {t("landing.start")}
            </Link>
            <a href="#sample-question" className="btn btn-lg lp-close-try">
              {t("hero.tryQuestion")}
            </a>
          </div>
          <p className="lp-close-fine">{t("landing.noCard")}</p>
        </div>

        {/* This is the concrete product decision the page has spent its story
            promising, so the ending echoes the hero's live practice frame. */}
        <div className="lp-close-preview" role="group" aria-label={t("lp.closePreviewLabel")}>
          <header className="lp-close-preview-bar">
            <span className="lp-close-preview-mode">
              <span className="lp-close-preview-dot" aria-hidden />
              {t("lp.closePreviewMode")}
            </span>
            <span>{t("lp.closePreviewSource")}</span>
          </header>

          <ol className="lp-close-route" aria-label={t("lp.closeRouteLabel")}>
            {LOOP_STEPS.map((step, i) => (
              <li key={step.title} className="lp-close-route-step" style={{ ["--n" as string]: i }}>
                <span className="lp-close-route-mark" aria-hidden />
                <span>{t(step.title)}</span>
              </li>
            ))}
          </ol>

          <div className="lp-close-focus">
            <div className="lp-close-focus-head">
              <p className="t-label">{t("lp.closePreviewWeakest")}</p>
              <span className="lp-close-focus-count num">
                8 {t("lp.closePreviewQuestions")}
              </span>
            </div>
            <h3>{t("lp.closePreviewSkill")}</h3>
            <p className="lp-close-focus-meta">{t("lp.closePreviewMeta")}</p>

            <div className="lp-close-meter" aria-label={t("lp.closePreviewAccuracy")}>
              <span className="num">44%</span>
              <span className="lp-close-meter-track" aria-hidden>
                <span className="lp-close-meter-fill" />
                <span className="lp-close-meter-target" />
              </span>
              <span className="num">60%</span>
            </div>
          </div>

          <footer className="lp-close-preview-foot">
            <span>{t("lp.closePreviewReady")}</span>
            <span className="lp-close-preview-arrow" aria-hidden>
              →
            </span>
          </footer>
        </div>
      </div>
    </section>
  );
}
