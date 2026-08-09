"use client";

import type { ExplanationPostData } from "@/data/community";
import { SubjectTopicTag } from "./SubjectTopicTag";

/** A useful write-up shared with the group — title carries the hook, body stays short by design (see AGENTS Milestone 1 §6D). */
export function ExplanationPostContent({
  data,
  topic,
}: {
  data: ExplanationPostData;
  topic?: string;
}) {
  return (
    <div className="space-y-2.5">
      <SubjectTopicTag subjectId={data.subjectId} topic={topic} />
      {/* The explanation is the whole point of the post, so it is set as
          readable prose rather than as 14px grey supporting text — it was
          previously the least prominent thing in a post whose entire value is
          the writing. */}
      <p className="t-h3">{data.title}</p>
      <p className="text-body leading-relaxed cm-prose">{data.body}</p>
    </div>
  );
}
