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
      <p className="text-[16px] font-medium tracking-[-0.01em]">{data.title}</p>
      <p className="text-[14px] leading-relaxed text-muted">{data.body}</p>
    </div>
  );
}
