"use client";

import type { QuestionPostData } from "@/data/community";
import { useI18n } from "@/lib/i18n";
import { NOUNS, pluralize } from "@/lib/ru";
import { SubjectTopicTag } from "./SubjectTopicTag";

/** A request for help — the prompt sits in a quoted block so it reads as "someone else's problem", not the poster's own statement. */
export function QuestionPostContent({
  text,
  data,
  topic,
}: {
  text?: string;
  data: QuestionPostData;
  topic?: string;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      <SubjectTopicTag subjectId={data.subjectId} topic={topic} />
      {/* The composer collects one field for both — skip the duplicate line when they match. */}
      {text && text !== data.prompt && <p className="text-[14.5px] leading-relaxed">{text}</p>}
      <blockquote className="cm-quote">{data.prompt}</blockquote>

      {(data.myAnswer || data.correctAnswer) && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px]">
          {data.myAnswer && (
            <span className="text-muted">
              {t("community.myAnswerLabel")}: <strong className="text-foreground">{data.myAnswer}</strong>
            </span>
          )}
          {data.correctAnswer && (
            <span className="text-muted">
              {t("community.correctAnswerLabel")}:{" "}
              <strong style={{ color: "var(--success)" }}>{data.correctAnswer}</strong>
            </span>
          )}
        </div>
      )}

      {data.explanationCount > 0 && (
        <p className="text-[12.5px] text-faint">
          {pluralize(data.explanationCount, NOUNS.explanation)}
        </p>
      )}
    </div>
  );
}
