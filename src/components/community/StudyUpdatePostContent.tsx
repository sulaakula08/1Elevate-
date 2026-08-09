"use client";

import { getSubject } from "@/data/exams";
import type { StudyUpdatePostData } from "@/data/community";
import { useI18n } from "@/lib/i18n";
import { pct } from "@/lib/stats";

/**
 * A finished practice session, stated in one line.
 *
 * This used to be a full-height post: an uppercase eyebrow, a bold count, a
 * labelled accuracy bar and a delta caption — the same visual weight as a
 * student asking for help with a problem they are stuck on. Measured, it came
 * out at 249px, identical to an achievement. It is the lightest thing in the
 * feed and now reads as one: subject, count, accuracy and the change since last
 * time, on a single line that scans in about a second.
 *
 * No progress bar. A bar repeats what the percentage already says, and at this
 * weight the row does not need two ways of stating one number.
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
  const delta = data.accuracyDelta;

  return (
    <div>
      <p className="cm-session">
        <span className="num cm-session-n">{data.questionsCompleted}</span>
        <span className="cm-session-unit">{t("community.sessionQuestions")}</span>
        {subject && <span className="cm-session-sep">{tx(subject.name)}</span>}
        <span className="cm-session-sep">
          <span className="num cm-session-acc">{pct(data.accuracy)}</span>{" "}
          {t("community.accuracyLabel").toLowerCase()}
        </span>
        {delta !== undefined && delta !== 0 && (
          <span className={`cm-session-delta ${delta > 0 ? "is-up" : "is-down"}`}>
            {delta > 0 ? "+" : ""}
            {Math.round(delta * 100)}%
          </span>
        )}
      </p>
      {text && <p className="text-sm text-muted mt-1.5">{text}</p>}
    </div>
  );
}
