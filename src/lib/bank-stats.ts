/**
 * The single source of truth for "how big is the question bank".
 *
 * Every count the product shows a student — landing statistics, question-bank
 * cards, mock-test coverage — is derived here from the real bank, so no screen
 * can drift from another or from the data. Nothing in this module invents a
 * number: pass it the bank you actually render and it counts what is there.
 */

import { SEED_QUESTIONS } from "@/data";
import { SAT, subjectsFor } from "@/data/exams";
import type { Difficulty, Question } from "@/data/types";

export type LevelCounts = Record<Difficulty, number>;

export type SubjectStats = {
  subjectId: string;
  total: number;
  byLevel: LevelCounts;
  /** Distinct official content domains represented in this subject. */
  domains: number;
  /** Distinct topics represented in this subject. */
  topics: number;
};

export type BankStats = {
  /** Every question available for the SAT, seed plus admin-created. */
  total: number;
  byLevel: LevelCounts;
  bySubject: SubjectStats[];
  /** Distinct official content domains across the whole bank. */
  domains: number;
  /** Distinct topics across the whole bank. */
  topics: number;
  /** Timed modules a full mock test runs (Reading & Writing ×2, Math ×2). */
  mockModules: number;
  /** Questions a complete mock test calls for, per the published blueprint. */
  mockQuestions: number;
  /** Wall-clock minutes a complete mock test calls for. */
  mockMinutes: number;
};

function emptyLevels(): LevelCounts {
  return { 1: 0, 2: 0, 3: 0 };
}

function countLevels(questions: Question[]): LevelCounts {
  const out = emptyLevels();
  for (const q of questions) out[q.difficulty] += 1;
  return out;
}

/** Stats for one subject within a bank. */
export function subjectStats(bank: Question[], subjectId: string): SubjectStats {
  const pool = bank.filter((q) => q.subjectId === subjectId);
  return {
    subjectId,
    total: pool.length,
    byLevel: countLevels(pool),
    domains: new Set(pool.map((q) => q.domain).filter(Boolean)).size,
    topics: new Set(pool.map((q) => q.topic)).size,
  };
}

/**
 * Everything the UI needs about a bank, counted once.
 *
 * Pass the merged bank from `useApp()` wherever the student's own questions
 * should be included; the default is the built-in bank, which is what the
 * signed-out landing page can safely show.
 */
export function bankStats(bank: Question[] = SEED_QUESTIONS): BankStats {
  const exam = bank.filter((q) => q.exam === SAT.exam);
  return {
    total: exam.length,
    byLevel: countLevels(exam),
    bySubject: subjectsFor(SAT.exam).map((s) => subjectStats(exam, s.id)),
    domains: new Set(exam.map((q) => q.domain).filter(Boolean)).size,
    topics: new Set(exam.map((q) => q.topic)).size,
    mockModules: SAT.sections.length,
    mockQuestions: SAT.sections.reduce((sum, s) => sum + s.count, 0),
    mockMinutes: SAT.sections.reduce((sum, s) => sum + s.minutes, 0),
  };
}

/** Convenience lookup so callers don't re-scan the array per subject. */
export function statsFor(stats: BankStats, subjectId: string): SubjectStats {
  return (
    stats.bySubject.find((s) => s.subjectId === subjectId) ?? {
      subjectId,
      total: 0,
      byLevel: emptyLevels(),
      domains: 0,
      topics: 0,
    }
  );
}
