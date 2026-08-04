import { SAT_QUESTIONS } from "./questions-sat";
import { SAT_QUESTIONS_2 } from "./questions-sat-2";
import { SAT_QUESTIONS_3 } from "./questions-sat-3";
import { SAT_QUESTIONS_4 } from "./questions-sat-4";
import type { Question } from "./types";

/** Built-in question bank shipped with the app (read-only). */
export const SEED_QUESTIONS: Question[] = [
  ...SAT_QUESTIONS,
  ...SAT_QUESTIONS_2,
  ...SAT_QUESTIONS_3,
  ...SAT_QUESTIONS_4,
];

export * from "./types";
export * from "./exams";
