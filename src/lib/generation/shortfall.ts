/**
 * What a full mock test is short of, counted from the real bank.
 *
 * Every number here comes from `bankStats()` and the published blueprint, so the
 * setup screen, the generation request and the modules a student actually sits
 * can never disagree with each other.
 */

import type { ExamBlueprint, Difficulty, Question } from "@/data/types";
import { bankStats, statsFor } from "@/lib/bank-stats";
import { MAX_AVOID, MAX_TOPICS, type GenerateRequest, type LevelRequest } from "./schema";

const LEVELS: Difficulty[] = [1, 2, 3];

export type SubjectShortfall = {
  subjectId: string;
  /** Questions the blueprint calls for across this subject's modules. */
  needed: number;
  /** Questions the bank can actually deal. */
  available: number;
  /** `needed − available`, never negative. */
  missing: number;
};

export type Shortfall = {
  bySubject: SubjectShortfall[];
  needed: number;
  available: number;
  missing: number;
};

export function shortfall(bank: Question[], blueprint: ExamBlueprint): Shortfall {
  const stats = bankStats(bank);
  const subjectIds = [...new Set(blueprint.sections.map((section) => section.subjectId))];

  const bySubject = subjectIds.map((subjectId) => {
    const needed = blueprint.sections
      .filter((section) => section.subjectId === subjectId)
      .reduce((sum, section) => sum + section.count, 0);
    // A subject can hold more questions than one test uses; the surplus is not
    // "available" for this test, so it is clamped rather than carried over.
    const available = Math.min(needed, statsFor(stats, subjectId).total);
    return { subjectId, needed, available, missing: Math.max(0, needed - available) };
  });

  return {
    bySubject,
    needed: bySubject.reduce((sum, s) => sum + s.needed, 0),
    available: bySubject.reduce((sum, s) => sum + s.available, 0),
    missing: bySubject.reduce((sum, s) => sum + s.missing, 0),
  };
}

/**
 * Spreads `missing` across the three levels, filling the thinnest first.
 *
 * A test drawn only from what happens to be in the bank inherits the bank's
 * lopsided difficulty mix, so the deficits are measured against an even split of
 * the blueprint's own question count before anything is asked for.
 */
function levelMix(bank: Question[], subjectId: string, needed: number, missing: number): LevelRequest[] {
  if (missing <= 0) return [];
  const have = statsFor(bankStats(bank), subjectId).byLevel;
  const target = Math.floor(needed / 3);
  const deficits = LEVELS.map((difficulty) => ({
    difficulty,
    deficit: Math.max(0, (difficulty === 3 ? needed - 2 * target : target) - have[difficulty]),
  }));

  const total = deficits.reduce((sum, entry) => sum + entry.deficit, 0);
  // Every level is already at or above its share — ask at medium, the level a
  // shortened module loses most of.
  if (total === 0) return [{ difficulty: 2, count: missing }];

  const shares = deficits.map((entry) => ({
    difficulty: entry.difficulty,
    exact: (entry.deficit / total) * missing,
  }));
  const counts = shares.map((share) => ({ ...share, count: Math.floor(share.exact) }));
  // Largest remainder, so the counts add up to `missing` exactly.
  let remainder = missing - counts.reduce((sum, entry) => sum + entry.count, 0);
  for (const entry of [...counts].sort((a, b) => (b.exact % 1) - (a.exact % 1))) {
    if (remainder <= 0) break;
    entry.count += 1;
    remainder -= 1;
  }

  return counts
    .filter((entry) => entry.count > 0)
    .map(({ difficulty, count }) => ({ difficulty, count }));
}

/** One generation request per subject that is short, or an empty list when the bank is full. */
export function fillRequests(bank: Question[], blueprint: ExamBlueprint): GenerateRequest[] {
  return shortfall(bank, blueprint)
    .bySubject.filter((subject) => subject.missing > 0)
    .map((subject) => {
      const pool = bank.filter((question) => question.subjectId === subject.subjectId);
      return {
        subjectId: subject.subjectId,
        wanted: levelMix(bank, subject.subjectId, subject.needed, subject.missing),
        topics: [...new Set(pool.map((question) => question.topic))].slice(0, MAX_TOPICS),
        domains: [
          ...new Set(
            pool.map((question) => question.domain).filter((domain): domain is string => !!domain),
          ),
        ].slice(0, MAX_TOPICS),
        avoid: pool.map((question) => question.prompt.en).slice(0, MAX_AVOID),
      };
    });
}
