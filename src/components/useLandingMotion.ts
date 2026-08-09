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

      // Outer wrapper takes the scroll parallax, inner takes the intro rise.
      const heroCard = q("[data-motion='hero-card']");
      const heroCardIn = q("[data-motion='hero-card-in']");

      /* ---------------- 1. the master intro timeline ---------------- */

      const master = gsap.timeline({
        delay: MOTION.introDelay,
        defaults: { overwrite: "auto" },
      });
      master.timeScale(MOTION.rate);

      /*
       * The headline is not animated at all any more — neither per-character nor
       * as a block. It is the first and most important thing on the page, and
       * anything that fades it in makes it unreadable for as long as the fade
       * lasts. Twice during this work a screenshot caught it mid-tween, which is
       * exactly what a visitor on a slow first paint sees. It now renders at full
       * opacity in the first painted frame, and the intro starts below it.
       */
      master
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

      /* ---------------- 3. (removed) the pinned features section ----------------
       *
       * The features section used to pin for a full viewport height and scrub
       * its cards in one at a time. Two things were wrong with it. A visitor
       * scrolling at any normal speed met a section that held the page still and
       * then revealed four cards of plain text — motion gating content rather
       * than explaining it. And `pinSpacing` added a screen's worth of document
       * height, which is where a good part of the landing page's dead space came
       * from. The section is ordinary flow now, and reads immediately.
       */

      // Layout settles a tick after hydration; one refresh keeps the parallax
      // trigger points honest.
      const refresh = requestAnimationFrame(() => ScrollTrigger.refresh());

      return () => {
        cancelAnimationFrame(refresh);
        parallax?.scrollTrigger?.kill();
        parallax?.kill();
        master.kill();
      };
    });

    return () => mm.revert();
  }, [scope]);
}
