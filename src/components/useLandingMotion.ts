"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MOTION } from "@/lib/motion.config";

gsap.registerPlugin(ScrollTrigger);

/**
 * The landing-page sequence: a staggered character reveal on the h1, a pinned
 * features section, and a slow parallax on the hero card.
 *
 * ── On "one master timeline" ───────────────────────────────────────────────
 * The intro is a single master timeline, and MOTION.rate retimes all of it via
 * timeScale(). The two scroll-driven pieces cannot live on that same timeline:
 * a scrubbed animation's playhead is driven by scroll position, not by elapsed
 * time, so nesting it in a time-based parent means whichever one writes last
 * wins and the tween fights itself. They are therefore their own timelines —
 * but every number they use still comes from MOTION, so retiming the whole page
 * is still a single-file edit.
 *
 * ── On the reduced-motion guard ────────────────────────────────────────────
 * gsap.matchMedia() scopes everything to (prefers-reduced-motion: no-preference).
 * If the user prefers reduced motion, nothing here is ever created, and revert()
 * runs automatically if they change the setting mid-session. The final layout is
 * the un-animated DOM, so the page is complete and readable either way.
 */
export function useLandingMotion(scope: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = scope.current;
    if (!root) return;

    // The bootstrap script pre-hides the animated elements so they cannot flash
    // at full opacity before GSAP takes over. Release that here, in the same
    // synchronous block that creates the tweens: from() applies its start values
    // on creation, so the browser paints once, already in the correct state.
    // Unconditional, so the reduced-motion path below also ends up visible.
    document.documentElement.classList.remove("js-motion");

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const q = gsap.utils.selector(root);

      const chars = q(".ch");
      // Outer wrapper takes the scroll parallax, inner takes the intro rise.
      const heroCard = q("[data-motion='hero-card']");
      const heroCardIn = q("[data-motion='hero-card-in']");
      const featureSection = q("[data-motion='features']")[0];

      /* ---------------- 1. the master intro timeline ---------------- */

      const master = gsap.timeline({
        delay: MOTION.introDelay,
        defaults: { overwrite: "auto" },
      });
      master.timeScale(MOTION.rate);

      if (chars.length) {
        master.from(chars, {
          opacity: 0,
          yPercent: 60,
          rotateX: MOTION.headline.rotateX,
          duration: MOTION.headline.duration,
          stagger: MOTION.headline.stagger,
          ease: MOTION.headline.ease,
        });
      }

      master
        // fromTo, not from: from() takes the element's current state as its
        // destination, and this one is pre-hidden by CSS and re-created when the
        // effect is double-invoked — so it would read 0 as the value to land on
        // and animate 0 → 0. Both ends are stated here so it cannot happen.
        .fromTo(
          q("[data-motion='headline-b']"),
          { opacity: 0, y: MOTION.headlineB.y },
          {
            opacity: 1,
            y: 0,
            duration: MOTION.headlineB.duration,
            ease: MOTION.headlineB.ease,
          },
          MOTION.headlineB.overlap,
        )
        .from(
          q("[data-motion='lede']"),
          {
            opacity: 0,
            y: MOTION.lede.y,
            duration: MOTION.lede.duration,
            ease: MOTION.lede.ease,
          },
          MOTION.lede.overlap,
        )
        .from(
          q("[data-motion='action']"),
          {
            opacity: 0,
            y: MOTION.actions.y,
            duration: MOTION.actions.duration,
            stagger: MOTION.actions.stagger,
            ease: MOTION.actions.ease,
          },
          MOTION.actions.overlap,
        )
        .from(
          q("[data-motion='fine-print']"),
          {
            opacity: 0,
            y: MOTION.finePrint.y,
            duration: MOTION.finePrint.duration,
            ease: MOTION.finePrint.ease,
          },
          MOTION.finePrint.overlap,
        );

      if (heroCardIn.length) {
        // Absolute position: the card rises with the headline, not after it.
        master.from(
          heroCardIn,
          {
            opacity: 0,
            y: MOTION.heroCard.y,
            scale: MOTION.heroCard.scale,
            duration: MOTION.heroCard.duration,
            ease: MOTION.heroCard.ease,
          },
          MOTION.heroCard.startAt,
        );
      }

      /* ---------------- 2. slow parallax on the hero card ---------------- */

      // Triggered on the hero section, not the card. The card sits above the
      // fold, so a card-triggered range would already be part-consumed on load
      // and finish within ~600px — fast and twitchy. Measuring the section's
      // whole exit spreads the same drift over several times that distance,
      // which is what makes it read as slow.
      const hero = q("[data-motion='hero']")[0];
      const parallax =
        heroCard.length && hero
          ? gsap.to(heroCard, {
              y: MOTION.parallax.distance,
              ease: "none",
              scrollTrigger: {
                trigger: hero,
                start: "top top",
                end: "bottom top",
                scrub: MOTION.parallax.scrub,
                invalidateOnRefresh: true,
              },
            })
          : null;

      /* ---------------- 3. pinned features section ---------------- */

      let featuresTl: gsap.core.Timeline | null = null;

      if (featureSection) {
        const cards = q("[data-motion='feature-card']");
        const heading = q("[data-motion='features-heading']");

        featuresTl = gsap.timeline({
          scrollTrigger: {
            trigger: featureSection,
            start: "center center",
            end: () => `+=${window.innerHeight * MOTION.features.pinHold}`,
            pin: true,
            pinSpacing: true,
            scrub: MOTION.features.scrub,
            // Pinning changes document height; recalculate on resize so the
            // trigger points stay correct after an orientation change.
            invalidateOnRefresh: true,
          },
        });

        featuresTl
          .from(heading, {
            opacity: 0,
            y: MOTION.features.heading.y,
            duration: MOTION.features.heading.duration,
            ease: MOTION.features.heading.ease,
          })
          .from(cards, {
            opacity: 0,
            y: MOTION.features.card.y,
            scale: MOTION.features.card.scale,
            duration: MOTION.features.card.duration,
            stagger: MOTION.features.card.stagger,
            ease: MOTION.features.card.ease,
          });
      }

      // The pin is measured from layout, which settles a tick after hydration.
      // One refresh avoids a pin whose start point was computed too early.
      const refresh = requestAnimationFrame(() => ScrollTrigger.refresh());

      return () => {
        cancelAnimationFrame(refresh);
        parallax?.scrollTrigger?.kill();
        parallax?.kill();
        featuresTl?.scrollTrigger?.kill();
        featuresTl?.kill();
        master.kill();
      };
    });

    return () => mm.revert();
  }, [scope]);
}
