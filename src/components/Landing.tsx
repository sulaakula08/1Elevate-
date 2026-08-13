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

/** The signed-out marketing page and the scope for its entrance motion. */
export function Landing({ bank }: { bank: Question[] }) {
  const scope = useRef<HTMLDivElement>(null);
  useLandingMotion(scope);

  return (
    <div className="max-w-5xl mx-auto" ref={scope}>
      <Hero bank={bank} />
      <Stats />
      <Features />
      <Steps />
      <Subjects bank={bank} />
      <Closing />
    </div>
  );
}
