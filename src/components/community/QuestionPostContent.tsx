"use client";

import Link from "next/link";
import type { QuestionPostData } from "@/data/community";
import { useI18n } from "@/lib/i18n";
import { practiceQuestionPath } from "@/lib/practice-routes";
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
  /*
   * The way back to Practice, when the question came from there.
   *
   * Built from the stored id rather than a stored URL, so a route change moves
   * every existing post with it. Null for a question typed into the composer, and
   * null for a subject with no practice route — which is also what makes this
   * safe: nothing here asserts the item still exists in the bank, and a link that
   * 404s lands on Practice's own "question unavailable" screen rather than
   * breaking the card.
   */
  const practicePath = data.questionId
    ? practiceQuestionPath({ id: data.questionId, subjectId: data.subjectId })
    : null;

  return (
    <div className="space-y-3">
      <SubjectTopicTag subjectId={data.subjectId} topic={topic} />
      {/* The composer collects one field for both — skip the duplicate line when they match. */}
      {text && text !== data.prompt && <p className="text-sm leading-relaxed">{text}</p>}
      <blockquote className="cm-quote">{data.prompt}</blockquote>

      {(data.myAnswer || data.correctAnswer) && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
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

      {/* One quiet line, not a button: answering the question is what this card
          is for, and trying it yourself is the secondary path. */}
      {practicePath && (
        <Link href={practicePath} className="cm-practice-link">
          {t("community.tryInPractice")}
        </Link>
      )}
    </div>
  );
}
