"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { HeroScoreChart } from "../HeroScoreChart";
import { LogoAnimation } from "../LogoAnimation";
import { SplitChars } from "../SplitChars";

/**
 * The one thing a visitor sees first: a single headline, one dominant action,
 * and a live score chart that shows what the product is for.
 *
 * GSAP drives this section (see useLandingMotion), so the animated elements
 * carry `data-motion` hooks and no CSS animation classes — two animation
 * systems on one element fight over its transform.
 */
export function Hero() {
  const { t } = useI18n();

  return (
    <section className="relative pt-10 sm:pt-16 pb-14" data-motion="hero">
      <div className="glow" aria-hidden />
      <div className="relative grid lg:grid-cols-[1fr_0.85fr] gap-12 lg:gap-16 items-center">
        <div>
          {/* aria-label holds the real sentence; the per-character spans in
              SplitChars are aria-hidden. */}
          <h1
            className="display split text-[2.5rem] sm:text-[3.25rem] lg:text-[3.75rem]"
            data-motion="headline"
            aria-label={t("hero.title")}
          >
            <SplitChars text={t("hero.title")} />
          </h1>

          <p className="lede mt-5 max-w-lg" data-motion="lede">
            {t("landing.sub")}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/signup" className="btn btn-primary btn-lg" data-motion="action">
              {t("landing.start")}
            </Link>
            <Link href="/login" className="btn btn-lg" data-motion="action">
              {t("landing.haveAccount")}
            </Link>
          </div>

          <p className="mt-4 text-[13px] text-faint" data-motion="fine-print">
            {t("landing.noCard")}
          </p>

          <div className="fade-in mt-9 pt-7 border-t" style={{ animationDelay: "380ms" }}>
            <LogoAnimation size="clamp(2rem, 5.5vw, 2.75rem)" />
            <p className="text-[12px] text-faint mt-2">{t("landing.markCaption")}</p>
          </div>
        </div>

        {/* Two wrappers, because two animations write y to the card: the intro
            rise (time-based) and the parallax drift (scroll-based). On one
            element they would overwrite each other; nested, each owns its own
            transform and the browser composes them. */}
        <div data-motion="hero-card" style={{ willChange: "transform" }}>
          <div data-motion="hero-card-in">
            <HeroScoreChart className="w-full h-auto" />
          </div>
        </div>
      </div>
    </section>
  );
}
