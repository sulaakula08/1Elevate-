"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { MOTION } from "@/lib/motion.config";

/** A restrained, reduced-motion-aware entrance for the above-the-fold content. */
export function useLandingMotion(scope: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = scope.current;
    if (!root) return;

    document.documentElement.classList.remove("js-motion");
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const q = gsap.utils.selector(root);
      const heroCard = q("[data-motion='hero-card-in']");
      const master = gsap.timeline({
        delay: MOTION.introDelay,
        defaults: { overwrite: "auto" },
      });
      master.timeScale(MOTION.rate);

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

      if (heroCard.length) {
        master.from(
          heroCard,
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

      return () => master.kill();
    });

    return () => mm.revert();
  }, [scope]);
}
