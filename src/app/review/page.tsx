"use client";

import { useMemo, useState } from "react";
import { getSubject } from "@/data/exams";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { reviewQueue } from "@/lib/stats";
import { PracticeRunner } from "@/components/PracticeRunner";
import { EmptyState, PageTitle, RequireAccount } from "@/components/ui";
import { Reveal } from "@/components/motion";

export default function ReviewPage() {
  return (
    <RequireAccount>
      <ReviewInner />
    </RequireAccount>
  );
}

function ReviewInner() {
  const { t, tx } = useI18n();
  const { data, bank } = useApp();
  const [running, setRunning] = useState(false);

  // Recomputed after the session, so mastered questions drop out of the list.
  const queue = useMemo(() => reviewQueue(data, bank), [data, bank]);

  if (running && queue.length > 0) {
    return (
      <PracticeRunner
        questions={queue.slice(0, 15)}
        mode="review"
        title={t("review.title")}
        onExit={() => setRunning(false)}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageTitle sub={t("review.desc")}>{t("review.title")}</PageTitle>

      {queue.length === 0 ? (
        <EmptyState>{t("review.empty")}</EmptyState>
      ) : (
        <>
          <button className="btn btn-primary" onClick={() => setRunning(true)}>
            {t("review.start")} · {Math.min(queue.length, 15)}
          </button>

          <ul className="mt-10 border-t">
            {queue.map((question, i) => {
              const subject = getSubject(question.subjectId);
              return (
                <Reveal as="li" key={question.id} delay={Math.min(i, 8) * 40}>
                  <div className="py-4 border-b">
                    <div className="flex items-baseline gap-3">
                      <span className="text-[14px]">{question.topic}</span>
                      {subject && (
                        <span className="text-[12px] text-faint">{tx(subject.name)}</span>
                      )}
                      <span className="num ml-auto text-[11px] text-faint uppercase">
                        {question.exam}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[14px] text-muted line-clamp-2 leading-relaxed">
                      {tx(question.prompt)}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
