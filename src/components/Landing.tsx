"use client";

import { useRef } from "react";
import type { Question } from "@/data/types";
import { Closing } from "./landing/Closing";
import { Features } from "./landing/Features";
import { Hero } from "./landing/Hero";
import { Stats } from "./landing/Stats";
import { Steps } from "./landing/Steps";
import { Subjects } from "./landing/Subjects";
import { useLandingMotion } from "./useLandingMotion";

/**
 * The signed-out marketing page. Each section is its own component; this file
 * is only the running order and the GSAP scope.
 *
 * The scope ref matters: GSAP selectors are resolved inside this subtree, so
 * the landing sequence can never reach the app shell or another route's markup.
 */
export function Landing({ bank }: { bank: Question[] }) {
  const scope = useRef<HTMLDivElement>(null);
  useLandingMotion(scope);

  return (
    <div className="max-w-5xl mx-auto" ref={scope}>
      <Hero />
      <Stats bank={bank} />
      <Features />
      <Steps />
      <Subjects bank={bank} />
      <Closing />
    </div>
  );
}
