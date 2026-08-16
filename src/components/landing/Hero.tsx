"use client";

import Link from "next/link";
import { useMemo } from "react";
import { LANDING_SAMPLE_QUESTION } from "@/data/landing-sample";
import type { Question } from "@/data/types";
import { useI18n } from "@/lib/i18n";
import { HeroProductDemo } from "./HeroProductDemo";

/**
 * The first screen explains the product's mechanism and proves it with the
 * same question component students use in practice.
 */
export function Hero({ bank }: { bank: Question[] }) {
  const { t } = useI18n();

  const sampleQuestion = useMemo(
    () => bank.find((question) => question.id === LANDING_SAMPLE_QUESTION.id) ?? LANDING_SAMPLE_QUESTION,
    [bank],
  );

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
