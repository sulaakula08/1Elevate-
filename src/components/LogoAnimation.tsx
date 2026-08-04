"use client";

import { useEffect, useState } from "react";

/**
 * The brand animation: the numeral "1" bounds across the letters of "elevate".
 * Four letters are kicked out of the way; the other three flip into digits, and
 * the 1 lands in front so the wordmark reads 1600 — a perfect SAT score. After a
 * beat it springs back to "1Elevate", so the name is what stays on screen.
 *
 * Fates below map onto e-l-e-v-a-t-e: the 1st, 5th and 7th letters become 6, 0
 * and 0. All motion is CSS; this component only sequences the phases.
 */
const GLYPHS: { letter: string; digit?: string }[] = [
  { letter: "e", digit: "6" },
  { letter: "l" },
  { letter: "e" },
  { letter: "v" },
  { letter: "a", digit: "0" },
  { letter: "t" },
  { letter: "e", digit: "0" },
];

/**
 * Matches the hop keyframes: over a 3.4s run, the 1 reaches its apex above glyph
 * i at 13% + i × 10% of the timeline.
 */
const RUN_S = 3.4;
const HOP_LEAD = RUN_S * 0.13;
const HOP_STEP = RUN_S * 0.1;
/** Forward run, a short beat on 1600, then the leap back to the wordmark. */
const FORWARD_MS = RUN_S * 1000;
const HOLD_MS = 900;
const BACK_MS = 900;

type Phase = "idle" | "forward" | "back";

export function LogoAnimation({
  size = "clamp(2.75rem, 9vw, 5rem)",
  autoPlay = true,
  className = "",
}: {
  /** Font size of the wordmark; everything else is sized in em. */
  size?: string;
  autoPlay?: boolean;
  className?: string;
}) {
  // Starting in the "forward" phase means the CSS runs the moment the element
  // mounts — no start-up timer that a remount could swallow.
  const [phase, setPhase] = useState<Phase>(autoPlay ? "forward" : "idle");
  /** Bumping this changes the element key, which restarts the CSS animations. */
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (phase === "forward") {
      const id = window.setTimeout(() => setPhase("back"), FORWARD_MS + HOLD_MS);
      return () => window.clearTimeout(id);
    }
    if (phase === "back") {
      const id = window.setTimeout(() => setPhase("idle"), BACK_MS);
      return () => window.clearTimeout(id);
    }
  }, [phase, run]);

  return (
    <button
      key={run}
      type="button"
      onClick={() => {
        setRun((n) => n + 1);
        setPhase("forward");
      }}
      aria-label="1Elevate"
      title="1Elevate"
      className={`lg ${className}`}
      data-phase={phase}
      style={{ fontSize: size, ["--slot" as string]: "0.56em" }}
    >
      <span className="lg-shadow" aria-hidden />
      <span className="lg-one" aria-hidden>
        1
      </span>
      <span className="lg-word" aria-hidden>
        {GLYPHS.map((glyph, i) => (
          <span
            key={i}
            className="lg-slot"
            data-fate={glyph.digit ? "keep" : "drop"}
            style={{
              ["--d" as string]: `${HOP_LEAD + i * HOP_STEP}s`,
              // The return runs right-to-left, so it reads as a rewind rather
              // than a repeat of the forward pass.
              ["--db" as string]: `${(GLYPHS.length - 1 - i) * 0.05}s`,
            }}
          >
            <span className="lg-letter">{glyph.letter}</span>
            {glyph.digit && <span className="lg-digit">{glyph.digit}</span>}
          </span>
        ))}
      </span>
    </button>
  );
}
