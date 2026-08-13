import type { Question } from "./types";

/**
 * Deterministic snapshot of custom_questions.sat-math-dev-001 from the verified
 * development project. Keeping it in the bundle makes the public preview
 * immediate; Hero uses the current bank row when the same id is available.
 */
export const LANDING_SAMPLE_QUESTION: Question = {
  id: "sat-math-dev-001",
  exam: "sat",
  subjectId: "sat-math",
  topic: "Linear equations in one variable",
  domain: "Algebra",
  difficulty: 1,
  prompt: { en: "If $3x + 6 = 21$, what is the value of $x$?" },
  choices: [{ en: "3" }, { en: "4" }, { en: "5" }, { en: "9" }],
  answer: 2,
  explanation: {
    en: "Subtract 6 from both sides to get $3x = 15$, then divide by 3.",
  },
  custom: true,
  createdAt: Date.parse("2026-08-12T20:29:12.938421+00:00"),
};
