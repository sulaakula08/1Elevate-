import type { ExamBlueprint, Subject } from "./types";

/**
 * Subjects carry their own hue so the whole UI can colour-code consistently:
 * `--s-<id>` tokens are declared in globals.css and referenced here by name.
 *
 * `glyph` holds a typographic symbol rather than an initialism: ¶ and ∑ are
 * conventions
 * a reader decodes without being taught — one marks text, the other marks
 * mathematics — and they survive being scaled down to the 10px monogram tile.
 */
export const SUBJECTS: Subject[] = [
  {
    id: "sat-rw",
    exam: "sat",
    name: { en: "Reading & Writing" },
    color: "violet",
    glyph: "¶",
  },
  {
    id: "sat-math",
    exam: "sat",
    name: { en: "Math" },
    color: "blue",
    glyph: "∑",
  },
];

/**
 * The published College Board format: 98 questions in 2 h 14 min — Reading &
 * Writing 54 questions in two 32-minute modules, Math 44 questions in two
 * 35-minute modules, scored 400–1600.
 */
export const EXAMS: ExamBlueprint[] = [
  {
    exam: "sat",
    name: { en: "SAT" },
    description: {
      en: "98 questions, 2 h 14 min. Reading & Writing and Math, each split into two adaptive modules.",
    },
    maxScore: 1600,
    minScore: 400,
    sections: [
      { subjectId: "sat-rw", count: 27, minutes: 32, module: 1 },
      { subjectId: "sat-rw", count: 27, minutes: 32, module: 2 },
      { subjectId: "sat-math", count: 22, minutes: 35, module: 1 },
      { subjectId: "sat-math", count: 22, minutes: 35, module: 2 },
    ],
  },
];

/** The one exam this product prepares for. */
export const SAT = EXAMS[0];

export function getExam(exam: string): ExamBlueprint | undefined {
  return EXAMS.find((e) => e.exam === exam);
}

export function getSubject(subjectId: string): Subject | undefined {
  return SUBJECTS.find((s) => s.id === subjectId);
}

export function subjectsFor(exam: string): Subject[] {
  return SUBJECTS.filter((s) => s.exam === exam);
}

/** CSS colour for a subject, e.g. `var(--s-violet)`. */
export function subjectColor(subjectId: string): string {
  const subject = getSubject(subjectId);
  return `var(--s-${subject?.color ?? "indigo"})`;
}

export function subjectColorSoft(subjectId: string): string {
  const subject = getSubject(subjectId);
  return `var(--s-${subject?.color ?? "indigo"}-soft)`;
}

/**
 * The two custom properties a `.bank-card` gradient is built from.
 *
 * Lives here rather than in a component because two different pages render that
 * card now, and a second copy of the mix ratio is a second place for the two
 * surfaces to drift apart.
 */
export function subjectGradient(subjectId: string): Record<string, string> {
  const tone = subjectColor(subjectId);
  return {
    "--tone": tone,
    // Towards a deep violet-black rather than pure black: mixing to #000 drains
    // the hue and the far corner of the card goes grey.
    "--tone-2": `color-mix(in srgb, ${tone} 62%, #1b1033)`,
  };
}
