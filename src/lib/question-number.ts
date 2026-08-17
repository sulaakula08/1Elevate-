import type { Question } from "@/data/types";

/**
 * The number an admin already has in their head.
 *
 * Question ids are a running number per section — `sat-math-041` — so the
 * number is not a display invention, it is part of the id and stable for the
 * life of the question. Deleting number 12 does not renumber 13, which is what
 * makes it safe to say out loud and to type into a field.
 *
 * This lives here rather than beside either caller because two of them need it
 * and they must agree: the delete-by-number field and the search box read the
 * same ids, and a number that means one thing in one and something else in the
 * other would be worse than no number at all.
 */

export type QuestionNumber = {
  /** The id's prefix, which is the section: `sat-math`. */
  section: string;
  n: number;
};

export function parseQuestionId(id: string): QuestionNumber | null {
  const match = /^(.+)-(\d+)$/.exec(id);
  if (!match) return null;
  return { section: match[1], n: Number(match[2]) };
}

/** The number, or null for an id that does not carry one — a generated draft. */
export function numberOf(id: string, section?: string): number | null {
  const parsed = parseQuestionId(id);
  if (!parsed) return null;
  if (section !== undefined && parsed.section !== section) return null;
  return parsed.n;
}

/**
 * Short names for the sections, because the number alone is ambiguous.
 *
 * Ids are numbered per section, so `sat-math-238` and `sat-rw-238` both exist
 * and are different questions. A badge reading `#238` therefore names two of
 * them, which is how an admin came to open "question 238" and find something
 * they had not written.
 */
const SECTION_SHORT: Record<string, string> = {
  "sat-math": "M",
  "sat-rw": "RW",
};

/** `M 238` — the number with the section it belongs to, or null if it has none. */
export function questionLabel(question: Question): string | null {
  const parsed = parseQuestionId(question.id);
  if (!parsed) return null;
  const short = SECTION_SHORT[parsed.section] ?? parsed.section.replace(/^sat-/, "");
  return `${short} ${parsed.n}`;
}
