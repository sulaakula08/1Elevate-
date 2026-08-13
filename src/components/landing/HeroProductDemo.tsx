"use client";

import { useState } from "react";
import type { Question } from "@/data/types";
import { getSubject } from "@/data/exams";
import { useI18n } from "@/lib/i18n";
import { QuestionView } from "../QuestionView";

const DIFFICULTY = ["", "Easy", "Medium", "Hard"] as const;

/** A controlled slice of the same question experience used in practice. */
export function HeroProductDemo({ question }: { question: Question }) {
  const { t, tx } = useI18n();
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const subject = getSubject(question.subjectId);
  const correct = selected === question.answer;

  return (
    <section id="sample-question" className="hero-demo" aria-label={t("hero.demoLabel")}>
      <header className="hero-demo-bar">
        <div className="hero-demo-context">
          <span className="hero-demo-status" aria-hidden />
          <span>{subject ? tx(subject.name) : t("hero.demoFallbackSubject")}</span>
          <span aria-hidden>·</span>
          <span>{t("hero.demoMode")}</span>
        </div>
        <div className="hero-demo-meta" aria-label={t("hero.demoQuestionMeta")}>
          <span>{question.domain ?? t("hero.demoDomain")}</span>
          <span aria-hidden>·</span>
          <span>{DIFFICULTY[question.difficulty]}</span>
        </div>
      </header>

      <div className="hero-demo-topic-row">
        <div>
          <p className="t-label">{question.domain ?? t("hero.demoDomain")}</p>
          <p className="hero-demo-topic">{question.topic}</p>
        </div>
      </div>

      <div className={`hero-demo-question${revealed ? " is-revealed" : ""}`}>
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
    </section>
  );
}
