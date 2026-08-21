"use client";

import { useRef } from "react";
import type { Question } from "@/data/types";
import { Capabilities } from "./landing/Capabilities";
import { Closing } from "./landing/Closing";
import { ExamAnatomy } from "./landing/ExamAnatomy";
import { Faq } from "./landing/Faq";
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
 *   LearningLoop  the proof, and the centre of the page: one mistake, six steps.
 *   Results       a visibly labelled future-results concept carousel.
 *   Capabilities  the three surfaces the loop actually runs on.
 *   ExamAnatomy   the sitting itself, resolving into its two sections.
 *   Faq           the objections, cleared out of the way of the last screen.
 *   Closing       the loop in five words, and one action.
 *
 * The FAQ sits second-to-last because it is the only section that answers rather
 * than argues. Before the loop it would be a list of features nobody has a reason
 * to care about yet; after the CTA it is a page nobody reads. Here it takes the
 * last few reasons not to sign up — does it cover my section, what does it cost,
 * will it work on my phone — off the table while the closing panel is still one
 * scroll away.
 *
 * Three sections that used to sit between the hero and the closing are gone. A
 * feature grid, a three-step "how it works" and a pair of subject cards were
 * each making a version of the same claim — that the product turns mistakes into
 * a plan — and none of them showed it. The loop shows it once, properly, and the
 * capability surfaces answer "what will I be looking at" rather than "what does
 * the company have".
 *
 * The width is unchanged at `max-w-5xl`; the marketing shell supplies its
 * responsive viewport gutter. Sections that need the full window take it with
 * a bleed rule in `landing.css` rather than by widening the readable content —
 * the left edge of the type is the same line from the hero to the footer, and a
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
      <Results />
      <Capabilities />
      <ExamAnatomy />
      <Faq />
      <Closing />
    </div>
  );
}
