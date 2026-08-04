"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Question } from "@/data/types";
import { useI18n } from "@/lib/i18n";
import { QuestionView } from "./QuestionView";

export type MockSection = {
  subjectId: string;
  name: string;
  minutes: number;
  questions: Question[];
  /** SAT runs two modules per subject, so subjectId alone isn't unique. */
  module?: number;
};

export type MockAnswers = Record<string, number>;

type Props = {
  sections: MockSection[];
  onFinish: (answers: MockAnswers, msSpent: number) => void;
  onExit: () => void;
};

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Timed, section-by-section exam simulation. No feedback until the report. */
export function MockRunner({ sections, onFinish, onExit }: Props) {
  const { t } = useI18n();
  const [sectionIndex, setSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<MockAnswers>({});
  const [secondsLeft, setSecondsLeft] = useState(sections[0].minutes * 60);
  const [timedOut, setTimedOut] = useState(false);

  // Stamped after render (reading the clock during render isn't pure).
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const section = sections[sectionIndex];
  const question = section.questions[questionIndex];
  const isLastSection = sectionIndex + 1 >= sections.length;

  const submitSection = useCallback(() => {
    if (isLastSection) {
      onFinish(answers, startedAt.current ? Date.now() - startedAt.current : 0);
      return;
    }
    const nextIndex = sectionIndex + 1;
    setSectionIndex(nextIndex);
    setQuestionIndex(0);
    setSecondsLeft(sections[nextIndex].minutes * 60);
    setTimedOut(false);
  }, [answers, isLastSection, onFinish, sectionIndex, sections]);

  // Keep the timer callback pointing at the freshest answers/section state.
  const submitRef = useRef(submitSection);
  useEffect(() => {
    submitRef.current = submitSection;
  }, [submitSection]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          setTimedOut(true);
          submitRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [sectionIndex]);

  const answeredInSection = section.questions.filter((q) => answers[q.id] !== undefined).length;
  const lowTime = secondsLeft <= 60;

  return (
    <div className="max-w-2xl mx-auto pt-6">
      <div className="flex items-center gap-4">
        <button className="btn btn-ghost btn-sm -ml-2" onClick={onExit}>
          ← {t("quiz.exit")}
        </button>
        <span className="text-[14px] truncate">
          <span className="num text-faint mr-2">
            {sectionIndex + 1}/{sections.length}
          </span>
          {section.name}
        </span>
        <span
          className="num ml-auto text-[15px] tabular-nums"
          style={{ color: lowTime ? "var(--danger)" : "var(--foreground)" }}
        >
          {formatClock(secondsLeft)}
        </span>
      </div>

      {/* section clock as a hairline, draining left to right */}
      <div className="mt-3 h-[2px] overflow-hidden" style={{ background: "var(--line)" }}>
        <div
          className="h-full transition-[width] duration-1000 ease-linear"
          style={{
            width: `${(secondsLeft / Math.max(1, section.minutes * 60)) * 100}%`,
            background: lowTime ? "var(--danger)" : "var(--foreground)",
          }}
        />
      </div>

      {timedOut && <p className="mt-3 text-[13px] text-warning">{t("mock.timeUp")}</p>}

      <div className="mt-6 flex items-center gap-2 flex-wrap">
        {section.questions.map((q, i) => {
          const isCurrent = i === questionIndex;
          const isAnswered = answers[q.id] !== undefined;
          return (
            <button
              key={q.id}
              onClick={() => setQuestionIndex(i)}
              aria-current={isCurrent}
              className="num w-7 h-7 rounded-md text-[12px] border transition-colors"
              style={
                isCurrent
                  ? { background: "var(--ink)", borderColor: "var(--ink)", color: "var(--ink-contrast)" }
                  : isAnswered
                    ? { borderColor: "var(--foreground)", color: "var(--foreground)" }
                    : { borderColor: "var(--line)", color: "var(--faint)" }
              }
            >
              {i + 1}
            </button>
          );
        })}
        <span className="num ml-auto text-[12px] text-faint">
          {answeredInSection}/{section.questions.length}
        </span>
      </div>

      <div className="mt-8">
        <QuestionView
          question={question}
          selected={answers[question.id] ?? null}
          onSelect={(choice) => setAnswers((prev) => ({ ...prev, [question.id]: choice }))}
        />
      </div>

      <div className="mt-10 pb-10 flex items-center gap-2">
        <button
          className="btn btn-sm"
          disabled={questionIndex === 0}
          onClick={() => setQuestionIndex((i) => i - 1)}
        >
          ←
        </button>
        <div className="ml-auto">
          {questionIndex + 1 < section.questions.length ? (
            <button className="btn btn-primary" onClick={() => setQuestionIndex((i) => i + 1)}>
              {t("quiz.next")}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={submitSection}>
              {isLastSection ? t("quiz.finish") : t("mock.submitSection")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
