"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Question } from "@/data/types";
import { useApp } from "@/lib/app-state";
import { generatedIds } from "@/lib/generation/provenance";
import { useI18n } from "@/lib/i18n";
import type { QuizMode } from "@/lib/storage";
import { difficultyColor, difficultyColorSoft, pct } from "@/lib/stats";
import { QuestionView } from "./QuestionView";
import { AiTutor } from "./AiTutor";
import { ProgressBar, Toast } from "./motion";
import { ProgressMark, SuccessTick } from "./illustrations";

type Props = {
  questions: Question[];
  mode: QuizMode;
  title: string;
  onExit: () => void;
  onRestart?: () => void;
};

/** Question-by-question practice with instant feedback. Used by Practice and Review. */
export function PracticeRunner({ questions, mode, title, onExit, onRestart }: Props) {
  const { t } = useI18n();
  const { recordAttempts } = useApp();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Stamped after render (reading the clock during render isn't pure).
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, [index]);

  const question = questions[index];
  const progress = questions.length ? index / questions.length : 0;

  const check = useCallback(() => {
    if (selected === null || !question) return;
    const isCorrect = selected === question.answer;
    setRevealed(true);
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      setStreak((s) => {
        const next = s + 1;
        // One quiet acknowledgement at the point momentum is real.
        if (next === 3 || next === 6) setToast(`${next} ${t("quiz.correct").toLowerCase()}`);
        return next;
      });
    } else {
      setStreak(0);
    }
    recordAttempts([
      {
        questionId: question.id,
        subjectId: question.subjectId,
        exam: question.exam,
        topic: question.topic,
        difficulty: question.difficulty,
        chosen: selected,
        correct: isCorrect,
        mode,
        at: Date.now(),
        ms: startedAt.current ? Date.now() - startedAt.current : 0,
      },
    ]);
  }, [selected, question, recordAttempts, mode, t]);

  const next = useCallback(() => {
    if (index + 1 >= questions.length) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
  }, [index, questions.length]);

  if (done || !question) {
    const accuracy = questions.length ? correctCount / questions.length : 0;
    const great = accuracy >= 0.8;
    return (
      <div className="max-w-sm mx-auto py-16 text-center fade-in">
        {great ? <SuccessTick className="mx-auto" /> : <ProgressMark className="mx-auto" />}
        <p className="label-xs mt-7">{t("quiz.result")}</p>
        <p className="num mt-3 text-5xl font-medium">
          {correctCount}
          <span className="text-faint">/{questions.length}</span>
        </p>
        <p className="mt-2 text-[14px] text-muted">
          {pct(accuracy)} {t("practice.accuracy")}
        </p>
        <div className="flex gap-2 justify-center mt-8">
          {onRestart && (
            <button className="btn btn-primary" onClick={onRestart}>
              {t("quiz.again")}
            </button>
          )}
          <button className="btn" onClick={onExit}>
            {t("common.back")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pt-6">
      <div className="flex items-center gap-4">
        <button className="btn btn-ghost btn-sm -ml-2" onClick={onExit}>
          ← {t("quiz.exit")}
        </button>
        <span className="text-[14px] text-muted truncate">{title}</span>
        <span className="num ml-auto text-[13px] text-faint tabular-nums">
          {index + 1}/{questions.length}
        </span>
      </div>

      <ProgressBar value={progress} className="mt-4" />

      <div className="mt-8 flex items-center gap-2.5 flex-wrap">
        <span className="label-xs">{question.topic}</span>
        <span
          className="badge"
          style={{
            ["--tone" as string]: difficultyColor(question.difficulty),
            ["--tone-soft" as string]: difficultyColorSoft(question.difficulty),
          }}
          title={t("quiz.difficulty")}
        >
          {t(`diff.${question.difficulty}`)}
        </span>
        {question.domain && <span className="text-[11px] text-faint">{question.domain}</span>}
        {/* A student is entitled to know which questions a model wrote. */}
        {generatedIds().has(question.id) && (
          <span className="pl-ai-badge" title={t("plan.aiBadgeTitle")}>
            {t("plan.aiBadge")}
          </span>
        )}
        {streak >= 3 && <span className="ml-auto num text-[12px] text-muted">↑ {streak}</span>}
      </div>

      <div className="mt-5">
        <QuestionView
          question={question}
          selected={selected}
          onSelect={setSelected}
          revealed={revealed}
          disabled={revealed}
        />
      </div>

      <div className="mt-8 flex items-center gap-4 pb-10">
        {revealed && (
          <span
            className="fade-in text-[14px]"
            style={{
              color: selected === question.answer ? "var(--success)" : "var(--danger)",
            }}
          >
            {selected === question.answer ? t("quiz.correct") : t("quiz.incorrect")}
          </span>
        )}
        <div className="ml-auto">
          {!revealed ? (
            <button className="btn btn-primary" disabled={selected === null} onClick={check}>
              {t("quiz.check")}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={next}>
              {index + 1 >= questions.length ? t("quiz.finish") : t("quiz.next")}
            </button>
          )}
        </div>
      </div>

      {/*
        The tutor only sees what the student has already committed to. Keying on
        the question id remounts it per question, so each one gets a fresh chat.
      */}
      <AiTutor key={question.id} question={question} chosenIndex={revealed ? selected : null} />

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
