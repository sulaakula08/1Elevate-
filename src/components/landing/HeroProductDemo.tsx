"use client";

import { useState } from "react";
import type { Question } from "@/data/types";
import { getSubject } from "@/data/exams";
import { useI18n } from "@/lib/i18n";
import { QuestionView } from "../QuestionView";

const DIFFICULTY = ["", "Easy", "Medium", "Hard"] as const;

/**
 * A controlled slice of the real practice experience. The question, choices,
 * correct answer and explanation all come from the published bank; only the
 * small frame around QuestionView belongs to the landing page.
 */
export function HeroProductDemo({ question }: { question?: Question }) {
  const { t, tx } = useI18n();
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const subject = question ? getSubject(question.subjectId) : undefined;
  const correct = Boolean(question && selected === question.answer);

  return (
    <section id="sample-question" className="hero-demo" aria-label={t("hero.demoLabel")}>
      <header className="hero-demo-bar">
        <div className="hero-demo-context">
          <span className="hero-demo-status" aria-hidden />
          <span>{t("hero.demoMode")}</span>
        </div>
        {question && (
          <div className="hero-demo-meta" aria-label={t("hero.demoQuestionMeta")}>
            <span>{subject ? tx(subject.name) : t("hero.demoFallbackSubject")}</span>
            <span aria-hidden>·</span>
            <span>{DIFFICULTY[question.difficulty]}</span>
          </div>
        )}
      </header>

      {question ? (
        <>
          <div className="hero-demo-topic-row">
            <div>
              <p className="t-label">{question.domain ?? t("hero.demoDomain")}</p>
              <p className="hero-demo-topic">{question.topic}</p>
            </div>
            <span className="hero-demo-published">{t("hero.demoPublished")}</span>
          </div>

          <div className="hero-demo-question">
            <QuestionView
              question={question}
              selected={selected}
              onSelect={(index) => {
                if (!revealed) setSelected(index);
              }}
              revealed={revealed}
              disabled={revealed}
              keyboard={false}
              showPassage={false}
            />
          </div>

          <div className="hero-demo-insight" aria-live="polite">
            <div className="hero-demo-insight-copy">
              <p className="t-label">{t("hero.demoInsightLabel")}</p>
              <p className="text-sm mt-1.5 leading-relaxed">
                {!revealed
                  ? t("hero.demoInsightBefore")
                  : correct
                    ? t("hero.demoInsightCorrect")
                    : t("hero.demoInsightWrong")}
              </p>
            </div>
            {revealed ? (
              <button
                type="button"
                className="btn btn-sm hero-demo-reset"
                onClick={() => {
                  setSelected(null);
                  setRevealed(false);
                }}
              >
                {t("hero.demoReset")}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm hero-demo-reset"
                disabled={selected === null}
                onClick={() => setRevealed(true)}
              >
                {t("hero.demoCheck")}
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="hero-demo-empty" role="status">
          <span className="hero-demo-empty-mark" aria-hidden>¶</span>
          <div>
            <p className="text-body font-medium">{t("hero.demoLoadingTitle")}</p>
            <p className="text-sm text-muted mt-1.5">{t("hero.demoLoadingText")}</p>
          </div>
        </div>
      )}
    </section>
  );
}
