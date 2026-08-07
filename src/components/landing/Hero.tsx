"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { HeroScoreChart } from "../HeroScoreChart";
import { LogoAnimation } from "../LogoAnimation";
import { SplitChars } from "../SplitChars";

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
    <section className="relative pt-10 sm:pt-14 lg:pt-20 pb-14 sm:pb-20" data-motion="hero">
      <div className="glow" aria-hidden />
      <div className="relative grid lg:grid-cols-[1fr_0.85fr] gap-10 sm:gap-12 lg:gap-16 items-center">
        <div className="min-w-0">
          {/* aria-label holds the real sentence; the per-character spans in
              SplitChars are aria-hidden. */}
          <h1
            className="display split text-[clamp(2.125rem,8.5vw,2.75rem)] sm:text-[3.25rem] lg:text-[3.75rem]"
            data-motion="headline"
            aria-label={`${title} ${accent}`}
          >
            <SplitChars text={title} />
            <br />
            {/* Not split, deliberately. background-clip: text paints in this
                element's background layer, and a transformed child — which every
                .ch becomes once GSAP touches it — gets its own layer above that,
                so a split gradient line renders as invisible glyphs. One
                transform on the span keeps the gradient and still animates. */}
            <span className="hero-title-accent inline-block" data-motion="headline-b">
              {accent}
            </span>
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

          <p className="mt-3.5 text-[13px] text-faint" data-motion="fine-print">
            {t("landing.noCard")}
          </p>

          <div className="fade-in mt-10 pt-7 border-t" style={{ animationDelay: "380ms" }}>
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
            {/* Capped and centred until the two-column grid takes over, so the
                card never blows up to full width on a tablet. */}
            <HeroScoreChart className="mx-auto w-full max-w-[27rem] lg:max-w-none" />
          </div>
        </div>
      </div>
    </section>
  );
}
