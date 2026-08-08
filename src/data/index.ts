import type { Question } from "./types";

/**
 * Built-in question bank shipped with the app.
 *
 * Empty on purpose. The four batches of seed questions that used to live here
 * were removed so the bank starts clean and every item in it is one an admin
 * wrote: a student practising against a shipped sample set, and an admin unable
 * to tell their own questions from ours, were both worse than an empty bank with
 * an honest empty state.
 *
 * The shape stays, so nothing that reads the bank has to change and a future
 * shipped set — a diagnostic, say — has somewhere to go. Everything a student
 * sees today comes from `custom_questions` in Supabase, written in the admin
 * editor and shared by every account.
 */
export const SEED_QUESTIONS: Question[] = [];

export * from "./types";
export * from "./exams";
