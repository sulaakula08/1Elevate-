"use client";

import { useLayoutEffect, type RefObject } from "react";
import gsap from "gsap";
import { MOTION } from "@/lib/motion.config";
import { loadSettings } from "@/lib/storage";

/** A restrained, reduced-motion-aware entrance for the above-the-fold content. */
export function useLandingMotion(scope: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = scope.current;
    if (!root) return;

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // The settings provider applies the root attribute in a normal effect.
      // Read the persisted preference here as well so the layout effect cannot
      // start an intro one frame before that attribute is available.
      if (document.documentElement.dataset.motion === "reduce" || loadSettings().reduceMotion) return;
      const q = gsap.utils.selector(root);
      const heroCard = q("[data-motion='hero-card-in']");
      const sectionHeads = q("[data-motion='section-head']");
      const master = gsap.timeline({
        delay: MOTION.introDelay,
        defaults: { overwrite: "auto" },
      });
      master.timeScale(MOTION.rate);

      master
        .from(
          q("[data-motion='headline']"),
          {
            opacity: 0,
            y: MOTION.headline.y,
            duration: MOTION.headline.duration,
            ease: MOTION.headline.ease,
          },
          0,
        )
        .from(
          q("[data-motion='lede']"),
          {
            opacity: 0,
            y: MOTION.lede.y,
            duration: MOTION.lede.duration,
            ease: MOTION.lede.ease,
          },
          `>${MOTION.lede.overlap}`,
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
          `>${MOTION.actions.overlap}`,
        )
        .from(
          q("[data-motion='fine-print']"),
          {
            opacity: 0,
            y: MOTION.finePrint.y,
            duration: MOTION.finePrint.duration,
            ease: MOTION.finePrint.ease,
          },
          `>${MOTION.finePrint.overlap}`,
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

      gsap.set(sectionHeads, { opacity: 0, y: 18 });
      if (typeof IntersectionObserver === "undefined") {
        gsap.set(sectionHeads, { opacity: 1, y: 0 });
        return () => master.kill();
      }
      const observers = sectionHeads.map((element) => {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (!entry?.isIntersecting) return;
            gsap.to(element, {
              opacity: 1,
              y: 0,
              duration: 0.65,
              ease: "power3.out",
              overwrite: "auto",
            });
            observer.disconnect();
          },
          { rootMargin: "0px 0px -12% 0px", threshold: 0.18 },
        );
        observer.observe(element);
        return observer;
      });

      return () => {
        master.kill();
        observers.forEach((observer) => observer.disconnect());
      };
    });

    return () => mm.revert();
  }, [scope]);
}
