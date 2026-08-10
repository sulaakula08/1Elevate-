"use client";

import { useMemo, useState } from "react";
import { getSubject } from "@/data/exams";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { reviewQueue } from "@/lib/stats";
import { PracticeRunner } from "@/components/PracticeRunner";
import { EmptyState, PageTitle, RequireAccount } from "@/components/ui";
import { RichText } from "@/lib/math/markdown";
import { Reveal } from "@/components/motion";
import { SectionGate } from "@/components/SectionGate";

export default function ReviewPage() {
  return (
    <RequireAccount>
      <SectionGate section="review">
        <ReviewInner />
      </SectionGate>
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
    <div className="container-app">
      <PageTitle sub={t("review.desc")}>{t("review.title")}</PageTitle>

      {queue.length === 0 ? (
        <EmptyState
          tone="positive"
          title={t("review.emptyTitle")}
          action={{ href: "/practice", label: t("nav.practice") }}
        >
          {t("review.empty")}
        </EmptyState>
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
                      <span className="text-sm">{question.topic}</span>
                      {subject && (
                        <span className="text-micro text-faint">{tx(subject.name)}</span>
                      )}
                      <span className="num ml-auto text-2xs text-faint uppercase">
                        {question.exam}
                      </span>
                    </div>
                    <RichText
                      className="mt-1.5 block text-sm text-muted line-clamp-2 leading-relaxed"
                      text={tx(question.prompt)}
                    />
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
