"use client";

import { getSubject, subjectColor, subjectColorSoft } from "@/data/exams";
import { useI18n } from "@/lib/i18n";

/** "Math · Systems of equations" — subject in the app's own palette, topic in the bank's own vocabulary. */
export function SubjectTopicTag({ subjectId, topic }: { subjectId: string; topic?: string }) {
  const { tx } = useI18n();
  const subject = getSubject(subjectId);
  if (!subject) return null;

  return (
    <span
      className="badge"
      style={{
        ["--tone" as string]: subjectColor(subjectId),
        ["--tone-soft" as string]: subjectColorSoft(subjectId),
      }}
    >
      {tx(subject.name)}
      {topic && <span className="opacity-70"> · {topic}</span>}
    </span>
  );
}
