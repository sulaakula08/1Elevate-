import type { Question } from "@/data/types";

export type PracticeSubjectId = "sat-rw" | "sat-math";
export type PracticeSubjectSlug = "reading-writing" | "math";

const SUBJECT_SLUGS: Record<PracticeSubjectId, PracticeSubjectSlug> = {
  "sat-rw": "reading-writing",
  "sat-math": "math",
};

export function practiceSubjectSlug(subjectId: string): PracticeSubjectSlug | null {
  return SUBJECT_SLUGS[subjectId as PracticeSubjectId] ?? null;
}

export function practiceQuestionPath(
  question: Pick<Question, "id" | "subjectId">,
): string | null {
  const subject = practiceSubjectSlug(question.subjectId);
  if (!subject) return null;
  return `/practice/${subject}/${encodeURIComponent(question.id)}`;
}
