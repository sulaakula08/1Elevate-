"use client";

import type { ResourcePostData } from "@/data/community";
import { useI18n } from "@/lib/i18n";
import { SubjectTopicTag } from "./SubjectTopicTag";

/** A shared note or link. Kept text-only for Milestone 1 — no file/link upload, see AGENTS §16. */
export function ResourcePostContent({
  data,
  topic,
}: {
  data: ResourcePostData;
  topic?: string;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-2.5">
      <p className="label-xs">{t("community.sharedResource")}</p>
      {data.subjectId && <SubjectTopicTag subjectId={data.subjectId} topic={topic} />}
      <p className="text-[15.5px] font-medium tracking-[-0.01em]">{data.title}</p>
      {data.note && <p className="text-[14px] leading-relaxed text-muted">{data.note}</p>}
    </div>
  );
}
