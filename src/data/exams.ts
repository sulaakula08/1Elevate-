import type { ExamBlueprint, Subject } from "./types";

/**
 * Subjects carry their own hue so the whole UI can colour-code consistently:
 * `--s-<id>` tokens are declared in globals.css and referenced here by name.
 */
export const SUBJECTS: Subject[] = [
  {
    id: "sat-rw",
    exam: "sat",
    name: { en: "Reading & Writing", ru: "Чтение и письмо", kk: "Оқу және жазу" },
    color: "violet",
    glyph: "RW",
  },
  {
    id: "sat-math",
    exam: "sat",
    name: { en: "Math", ru: "Математика", kk: "Математика" },
    color: "blue",
    glyph: "M",
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
    name: { en: "SAT", ru: "SAT", kk: "SAT" },
    description: {
      en: "98 questions, 2 h 14 min. Reading & Writing and Math, each split into two adaptive modules.",
      ru: "98 вопросов, 2 ч 14 мин. Reading & Writing и Math, каждый — два адаптивных модуля.",
      kk: "98 сұрақ, 2 сағ 14 мин. Reading & Writing және Math, әрқайсысы екі адаптивті модуль.",
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
