"use client";

import { getSubject } from "@/data/exams";
import type { StudyUpdatePostData } from "@/data/community";
import { useI18n } from "@/lib/i18n";
import { NOUNS, pluralize } from "@/lib/ru";
import { pct } from "@/lib/stats";
import { ProgressBar } from "@/components/motion";

/**
 * Auto-summary of a practice session. Deliberately label-led rather than a
 * narrative sentence: a third-person "completed" verb would need gender
 * agreement in Russian ("прошёл"/"прошла") that the data model doesn't carry
 * for a display name — see lib/community-state.tsx `CreatePostInput`.
 */
export function StudyUpdatePostContent({
  data,
  text,
}: {
  data: StudyUpdatePostData;
  text?: string;
}) {
  const { t, tx } = useI18n();
  const subject = getSubject(data.subjectId);

  return (
    <div className="space-y-3">
      <p className="label-xs">{t("community.studySessionResults")}</p>
      <p className="text-[15px]">
        <strong className="num">{pluralize(data.questionsCompleted, NOUNS.question)}</strong>
        {subject && <span className="text-muted"> · {tx(subject.name)}</span>}
      </p>
      {text && <p className="text-[13.5px] text-muted">{text}</p>}
      <div className="max-w-[220px]">
        <div className="flex items-baseline justify-between text-[13px] mb-1.5">
          <span className="text-muted">{t("community.accuracyLabel")}</span>
          <span className="num font-medium">{pct(data.accuracy)}</span>
        </div>
        <ProgressBar value={data.accuracy} tone="accent" />
      </div>
      {data.accuracyDelta !== undefined && data.accuracyDelta !== 0 && (
        <p className="text-[12.5px] text-faint">
          {data.accuracyDelta > 0 ? "+" : ""}
          {Math.round(data.accuracyDelta * 100)}%{" "}
          {data.accuracyDelta > 0 ? "к прошлой сессии" : "от прошлой сессии"}
        </p>
      )}
    </div>
  );
}
