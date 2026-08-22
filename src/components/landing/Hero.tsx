"use client";

import Link from "next/link";
import { LANDING_SAMPLE_QUESTION } from "@/data/landing-sample";
import { useI18n } from "@/lib/i18n";
import { HeroProductDemo } from "./HeroProductDemo";

/**
 * The first screen explains the product's mechanism and proves it with the
 * same question component students use in practice.
 */
export function Hero() {
  const { t } = useI18n();

  /*
   * The authored sample, always — this used to prefer a live bank row with the
   * same id and fall back to the sample.
   *
   * That lookup cannot succeed any more and should not: the visitor reading this
   * is signed out, the bank is no longer delivered to the browser in full, and
   * the marketing page has no business holding a real question. One sample that
   * ships with the page is also the honest thing to show a stranger — it is the
   * same `QuestionView` students use, running content written to be shown.
   */
  const sampleQuestion = LANDING_SAMPLE_QUESTION;

  return (
    <section className="hero-section relative" data-motion="hero">
      <div className="hero-grid relative">
        <div className="min-w-0">
          <p className="t-label hero-kicker">{t("hero.kicker")}</p>
          <h1 className="display t-display mt-4" data-motion="headline">
            {t("hero.title")}
            <br />
            <span className="hero-title-accent">{t("hero.titleB")}</span>
          </h1>

          <p className="lede mt-5 max-w-[32rem]" data-motion="lede">
            {t("landing.sub")}
          </p>

          <div className="hero-actions mt-7 flex flex-wrap items-center gap-3">
            <Link href="/signup" className="btn btn-primary btn-lg" data-motion="action">
              {t("landing.start")}
            </Link>
            <a href="#sample-question" className="btn btn-lg" data-motion="action">
              {t("hero.tryQuestion")}
            </a>
          </div>

          <p className="mt-3.5 text-sm text-faint" data-motion="fine-print">
            {t("landing.noCard")}
          </p>
        </div>

        <div data-motion="hero-card-in" className="min-w-0">
          <HeroProductDemo key={sampleQuestion.id} question={sampleQuestion} />
        </div>
      </div>
    </section>
  );
}
