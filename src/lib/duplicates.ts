import type { Question } from "@/data/types";

/**
 * Finds questions already in the bank that look like the one being written.
 *
 * Why this exists: the bank is written by several admins pasting from the same
 * sources, so the same item arrives twice — sometimes byte-identical, more often
 * with a renumbered figure, straightened quotes, or a "Which choice…" rephrased.
 * A duplicate is worse than a missing question: it doubles a student's exposure
 * to one item and makes the review queue repeat itself.
 *
 * The comparison is on words, not characters. Character-level similarity scores
 * two unrelated algebra prompts highly, because they share "the value of x" and
 * little else; word-set overlap is what actually distinguishes "the same question
 * reworded" from "another question about the same thing". Numbers are kept — in
 * maths they are most of the meaning, and dropping them made every "what is the
 * area of a square with side N" collapse into one item.
 */

export type DuplicateMatch = {
  question: Question;
  /** 0–1. 1 means the normalised prompts are identical. */
  score: number;
  /** True when the two prompts differ only by punctuation, case or spacing. */
  exact: boolean;
};

/** Words too common to carry meaning; keeping them flattens every score upwards. */
const STOP = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "following", "for", "from",
  "given", "has", "have", "in", "is", "it", "its", "of", "on", "or", "that",
  "the", "then", "there", "these", "this", "to", "was", "were", "what", "when",
  "which", "with",
]);

/**
 * One canonical form for comparison: lower case, curly quotes folded to straight,
 * LaTeX delimiters and punctuation dropped, whitespace collapsed. Two pastes of
 * one question from different sources usually differ by exactly these things.
 */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\[a-z]+\s*/g, " ")
    .replace(/[$\\{}()[\]]/g, " ")
    .replace(/[^a-z0-9'"\s.=+\-*/^<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): Set<string> {
  return new Set(
    normalise(text)
      .split(/[^a-z0-9.\-/^=+*]+/)
      .filter((word) => word.length > 1 && !STOP.has(word)),
  );
}

/**
 * The numbers in a prompt, in order.
 *
 * These decide the question. "A square has a side length of 8 cm" and the same
 * sentence with 12 share every other word, so word overlap alone scores them 0.78
 * and calls them duplicates — which is wrong, and the kind of wrong that teaches
 * an admin to click past the warning. If the numbers differ, the items differ.
 */
function numbers(text: string): string {
  const found = normalise(text).match(/\d+(?:\.\d+)?/g) ?? [];
  return found.sort().join(",");
}

/** Jaccard: shared words over all words. Symmetric, and 1 only for equal sets. */
function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / (a.size + b.size - shared);
}

/** Below this, two questions are about the same topic rather than the same item. */
export const DUPLICATE_THRESHOLD = 0.6;

export function findDuplicates(
  prompt: string,
  bank: Question[],
  options: { ignoreId?: string; limit?: number } = {},
): DuplicateMatch[] {
  const draft = normalise(prompt);
  // Two or three words cannot be judged: "Solve for x" would match half the bank.
  if (draft.length < 12) return [];

  const draftTokens = tokens(prompt);
  const draftNumbers = numbers(prompt);
  const out: DuplicateMatch[] = [];

  for (const question of bank) {
    if (options.ignoreId && question.id === options.ignoreId) continue;
    const other = normalise(question.prompt.en);
    if (other.length < 12) continue;

    // Cheap reject first: prompts of very different lengths are not the same
    // item, and this skips the token work for most of the bank.
    const ratio = draft.length / other.length;
    if (ratio < 0.5 || ratio > 2) continue;

    const exact = draft === other;
    // Same numbers or no numbers at all. A reworded duplicate keeps its
    // quantities; a variant built by changing one is a new question.
    if (!exact && numbers(question.prompt.en) !== draftNumbers) continue;

    const score = exact ? 1 : overlap(draftTokens, tokens(question.prompt.en));
    if (score >= DUPLICATE_THRESHOLD) out.push({ question, score, exact });
  }

  return out
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit ?? 3);
}
