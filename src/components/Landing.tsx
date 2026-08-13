"use client";

import { useRef } from "react";
import { syntheticOutcomesEnabled } from "@/data/landing-demo";
import type { Question } from "@/data/types";
import { Capabilities } from "./landing/Capabilities";
import { Closing } from "./landing/Closing";
import { ExamAnatomy } from "./landing/ExamAnatomy";
import { Hero } from "./landing/Hero";
import { LearningLoop } from "./landing/LearningLoop";
import { Manifesto } from "./landing/Manifesto";
import { Results } from "./landing/Results";
import { Stats } from "./landing/Stats";
import { useLandingMotion } from "./useLandingMotion";

/**
 * The signed-out page, in the order it argues its case.
 *
 *   Hero          the promise, and a question you can actually answer.
 *   Stats         the evidence strip that closes the first screen.
 *   Manifesto     the turn: a wrong answer is information.
 *   LearningLoop  the proof, and the centre of the page: one mistake, five steps.
 *   Results       where it ends up. Synthetic, and switched off on production —
 *                 see `landing-demo.ts`. The page is complete without it.
 *   Capabilities  the three surfaces the loop actually runs on.
 *   ExamAnatomy   the sitting itself, resolving into its two sections.
 *   Closing       the loop in five words, and one action.
 *
 * Three sections that used to sit between the hero and the closing are gone. A
 * feature grid, a three-step "how it works" and a pair of subject cards were
 * each making a version of the same claim — that the product turns mistakes into
 * a plan — and none of them showed it. The loop shows it once, properly, and the
 * capability surfaces answer "what will I be looking at" rather than "what does
 * the company have".
 *
 * The width is unchanged at `max-w-5xl`. Sections that need the full window take
 * it with a bleed rule in `landing.css` rather than by widening the page — the
 * left edge of the type is the same line from the hero to the footer, and a
 * measure that moves between sections is the fastest way to make a long page
 * feel assembled from parts.
 */
export function Landing({ bank }: { bank: Question[] }) {
  const scope = useRef<HTMLDivElement>(null);
  useLandingMotion(scope);

  return (
    <div className="max-w-5xl mx-auto lp-page" ref={scope}>
      <Hero bank={bank} />
      <Stats />
      <Manifesto />
      <LearningLoop />
      {syntheticOutcomesEnabled() && <Results />}
      <Capabilities />
      <ExamAnatomy />
      <Closing />
    </div>
  );
}
