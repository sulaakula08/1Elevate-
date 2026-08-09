"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { HeroScoreChart } from "../HeroScoreChart";
import { LogoAnimation } from "../LogoAnimation";

/**
 * The one thing a visitor sees first: a single headline, one dominant action,
 * and a score chart that shows what the product is for.
 *
 * GSAP drives this section (see useLandingMotion), so the animated elements
 * carry `data-motion` hooks and no CSS animation classes — two animation
 * systems on one element fight over its transform.
 */
export function Hero() {
  const { t } = useI18n();

  // Two lines: the promise, then the differentiator in the brand gradient.
  const title = t("hero.title");
  const accent = t("hero.titleB");

  return (
    <section className="relative pt-10 sm:pt-14 lg:pt-16 pb-12 sm:pb-16" data-motion="hero">
      <div className="glow" aria-hidden />
      <div className="relative grid lg:grid-cols-[1fr_0.85fr] gap-10 sm:gap-12 lg:gap-16 items-center">
        <div className="min-w-0">
          {/*
            One block, not fifty-two characters.

            The per-character reveal meant the first line spent its opening
            second as a row of glyphs at different opacities and offsets — the
            first impression of the product was a headline that looked broken.
            The line now fades as a unit, fast, and is legible from the first
            frame it is painted.
          */}
          <h1 className="display t-display" data-motion="headline">
            {title}
            <br />
            <span className="hero-title-accent inline-block">{accent}</span>
          </h1>

          <p className="lede mt-5 max-w-[34rem]" data-motion="lede">
            {t("landing.sub")}
          </p>

          {/* One dominant action. The second link is deliberately quieter: same
              height, no fill, no border, so it never competes for the click. */}
          <div className="mt-7 sm:mt-8 flex flex-wrap items-center gap-x-3 gap-y-2.5">
            <Link href="/signup" className="btn btn-primary btn-lg" data-motion="action">
              {t("landing.start")}
            </Link>
            <Link href="/login" className="btn btn-lg btn-ghost" data-motion="action">
              {t("auth.signIn")}
            </Link>
          </div>

          <p className="mt-3.5 text-sm text-faint" data-motion="fine-print">
            {t("landing.noCard")}
          </p>

          <div className="fade-in mt-9 pt-7 border-t" style={{ animationDelay: "380ms" }}>
            <LogoAnimation size="clamp(2rem, 5.5vw, 2.75rem)" />
            <p className="text-micro text-faint mt-2">{t("landing.markCaption")}</p>
          </div>
        </div>

        {/* Two wrappers, because two animations write y to the card: the intro
            rise (time-based) and the parallax drift (scroll-based). On one
            element they would overwrite each other; nested, each owns its own
            transform and the browser composes them. */}
        <div data-motion="hero-card" style={{ willChange: "transform" }}>
          <div data-motion="hero-card-in">
            {/* Capped and centred until the two-column grid takes over, so the
                card never blows up to full width on a tablet. */}
            <HeroScoreChart className="mx-auto w-full max-w-[27rem] lg:max-w-none" />
          </div>
        </div>
      </div>
    </section>
  );
}
