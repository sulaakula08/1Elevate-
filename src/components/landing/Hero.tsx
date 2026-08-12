"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Question } from "@/data/types";
import { useI18n } from "@/lib/i18n";
import { HeroProductDemo } from "./HeroProductDemo";

/**
 * The first screen explains the product's mechanism and proves it with the
 * same question component students use in practice.
 */
export function Hero({ bank }: { bank: Question[] }) {
  const { t } = useI18n();

  const sampleQuestion = useMemo(() => {
    const candidates = bank
      .filter(
        (question) =>
          question.subjectId === "sat-math" &&
          !question.passage &&
          question.choices.length === 4 &&
          question.prompt.en.trim().length >= 35 &&
          question.prompt.en.trim().length <= 260,
      )
      .sort((a, b) => a.prompt.en.length - b.prompt.en.length || a.id.localeCompare(b.id));

    return candidates[0] ?? bank.find((question) => question.choices.length >= 2);
  }, [bank]);

  return (
    <section className="hero-section relative" data-motion="hero">
      <div className="relative grid lg:grid-cols-[0.78fr_1.22fr] gap-8 lg:gap-12 items-center">
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

          <div className="mt-7 flex flex-wrap items-center gap-3">
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
          <HeroProductDemo key={sampleQuestion?.id ?? "loading"} question={sampleQuestion} />
        </div>
      </div>
    </section>
  );
}
