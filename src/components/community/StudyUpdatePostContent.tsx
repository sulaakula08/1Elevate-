"use client";

import { getSubject } from "@/data/exams";
import type { StudyUpdatePostData } from "@/data/community";
import { useI18n } from "@/lib/i18n";
import { NOUNS, pluralize } from "@/lib/plural";
import { pct } from "@/lib/stats";
import { ProgressBar } from "@/components/motion";

/**
 * Auto-summary of a practice session. Deliberately label-led rather than a
 * narrative sentence ("completed 25 questions") — it reads faster and matches
 * the data-first caption style the rest of the app uses for stats.
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
      <p className="text-body">
        <strong className="num">{pluralize(data.questionsCompleted, NOUNS.question)}</strong>
        {subject && <span className="text-muted"> · {tx(subject.name)}</span>}
      </p>
      {text && <p className="text-sm text-muted">{text}</p>}
      <div className="max-w-[220px]">
        <div className="flex items-baseline justify-between text-sm mb-1.5">
          <span className="text-muted">{t("community.accuracyLabel")}</span>
          <span className="num font-medium">{pct(data.accuracy)}</span>
        </div>
        <ProgressBar value={data.accuracy} tone="accent" />
      </div>
      {data.accuracyDelta !== undefined && data.accuracyDelta !== 0 && (
        <p className="text-micro text-faint">
          {data.accuracyDelta > 0 ? "+" : ""}
          {Math.round(data.accuracyDelta * 100)}% vs last session
        </p>
      )}
    </div>
  );
}
