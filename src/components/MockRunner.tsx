"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Question } from "@/data/types";
import { useExamMode } from "@/lib/exam-mode";
import { generatedIds } from "@/lib/generation/provenance";
import { useI18n } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/ui";
import { QuestionView } from "./QuestionView";
import { BreakScreen } from "./test/BreakScreen";
import { Calculator } from "./test/Calculator";
import { QuestionNavigator } from "./test/QuestionNavigator";
import { ReferenceSheet } from "./test/ReferenceSheet";
import { useHighlighter } from "./test/useHighlighter";
import {
  IconCalculator,
  IconChevron,
  IconCrossOut,
  IconFlag,
  IconHighlight,
  IconReference,
} from "./test/TestIcons";

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

type Tool = "calculator" | "reference" | null;

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * The timed test, in the shape of the real digital test app.
 *
 * It shares its whole toolkit with practice — highlighter, calculator, formula
 * sheet, answer eliminator, mark for review, section navigator — because the
 * point of a mock is that nothing on test day is new. What it does not share is
 * mercy: no answer is checked, no explanation is shown, the clock only runs
 * down, and there is no pause. The one way out is deliberate and confirmed.
 *
 * Between the Reading and Writing modules and Math it hands over to the ten
 * minute break the real test gives, which a student may end early.
 */
export function MockRunner({ sections, onFinish, onExit }: Props) {
  const { t } = useI18n();
  useExamMode();

  const [sectionIndex, setSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<MockAnswers>({});
  const [secondsLeft, setSecondsLeft] = useState(sections[0].minutes * 60);
  const [timedOut, setTimedOut] = useState(false);

  /** Keyed by question id: the runner jumps between modules, indices don't. */
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [crossed, setCrossed] = useState<Record<string, number[]>>({});

  const [tool, setTool] = useState<Tool>(null);
  const [highlightMode, setHighlightMode] = useState(false);
  const [crossOutMode, setCrossOutMode] = useState(false);
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [timerHidden, setTimerHidden] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  /** Index of the module waiting on the other side of the break, if any. */
  const [breakBefore, setBreakBefore] = useState<number | null>(null);

  // Stamped after render (reading the clock during render isn't pure).
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const section = sections[sectionIndex];
  const question = section.questions[questionIndex];
  const isLastSection = sectionIndex + 1 >= sections.length;
  const onBreak = breakBefore !== null;

  const questionRef = useRef<HTMLDivElement>(null);
  const highlighter = useHighlighter(questionRef, highlightMode, question?.id ?? "");

  /** Move into a module: fresh clock, first question, tools reset. */
  const enterSection = useCallback(
    (index: number) => {
      setSectionIndex(index);
      setQuestionIndex(0);
      setSecondsLeft(sections[index].minutes * 60);
      setTimedOut(false);
      setTool(null);
      setNavOpen(false);
    },
    [sections],
  );

  const submitSection = useCallback(() => {
    setConfirmSubmit(false);
    if (isLastSection) {
      onFinish(answers, startedAt.current ? Date.now() - startedAt.current : 0);
      return;
    }
    const nextIndex = sectionIndex + 1;
    // The break falls where the subject changes — after the last Reading and
    // Writing module, exactly as the real test schedules it.
    if (sections[nextIndex].subjectId !== section.subjectId) {
      setBreakBefore(nextIndex);
      return;
    }
    enterSection(nextIndex);
  }, [
    answers,
    enterSection,
    isLastSection,
    onFinish,
    section.subjectId,
    sectionIndex,
    sections,
  ]);

  // Keep the timer callback pointing at the freshest answers/section state.
  const submitRef = useRef(submitSection);
  useEffect(() => {
    submitRef.current = submitSection;
  }, [submitSection]);

  useEffect(() => {
    if (onBreak) return;
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
  }, [sectionIndex, onBreak]);

  const answeredFlags = useMemo(
    () => section.questions.map((q) => answers[q.id] !== undefined),
    [section.questions, answers],
  );
  const markedFlags = useMemo(
    () => section.questions.map((q) => Boolean(marked[q.id])),
    [section.questions, marked],
  );
  const answeredInSection = answeredFlags.filter(Boolean).length;
  const unanswered = section.questions.length - answeredInSection;
  const lowTime = secondsLeft <= 60;
  const isMath = section.subjectId === "sat-math";

  if (onBreak) {
    return (
      <BreakScreen
        nextSectionName={sections[breakBefore].name}
        onDone={() => {
          const next = breakBefore;
          setBreakBefore(null);
          enterSection(next);
        }}
      />
    );
  }

  return (
    <div className="test-shell">
      {/* ---------------- tool rail ---------------- */}
      <header className="test-bar">
        <button className="btn btn-ghost btn-sm -ml-2" onClick={() => setConfirmExit(true)}>
          ✕ {t("mock.cancelTest")}
        </button>

        <div className="relative">
          <button
            className="btn btn-ghost btn-sm"
            aria-expanded={directionsOpen}
            onClick={() => setDirectionsOpen((v) => !v)}
          >
            {t("ptool.directions")}
            <IconChevron />
          </button>
          {directionsOpen && (
            <div
              className="panel scale-in absolute top-full mt-2 left-0 z-30 w-[min(22rem,calc(100vw-2rem))] p-4"
              style={{ boxShadow: "var(--overlay)" }}
            >
              <p className="text-[13.5px] leading-relaxed text-muted">
                {t("mock.directionsBody")}
              </p>
              <button className="btn btn-sm mt-3 w-full" onClick={() => setDirectionsOpen(false)}>
                {t("tour.done")}
              </button>
            </div>
          )}
        </div>

        {/* The clock can be hidden — some students test better without it — but
            never paused and never stopped. */}
        <div className="test-timer">
          {timerHidden ? (
            <button className="btn btn-sm" onClick={() => setTimerHidden(false)}>
              {t("ptool.show")}
            </button>
          ) : (
            <>
              <span
                className="num text-[22px] font-medium tabular-nums leading-none"
                style={{ color: lowTime ? "var(--danger)" : "var(--foreground)" }}
                role="timer"
              >
                {formatClock(secondsLeft)}
              </span>
              <button className="btn btn-sm h-7" onClick={() => setTimerHidden(true)}>
                {t("ptool.hide")}
              </button>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          {highlighter.supported && (
            <button
              className={`tool-btn ${highlightMode ? "tool-btn-on" : ""}`}
              aria-pressed={highlightMode}
              onClick={() => setHighlightMode((v) => !v)}
            >
              <IconHighlight />
              <span className="hidden sm:inline">{t("ptool.highlight")}</span>
            </button>
          )}
          {isMath && (
            <>
              <button
                className={`tool-btn ${tool === "calculator" ? "tool-btn-on" : ""}`}
                aria-pressed={tool === "calculator"}
                onClick={() => setTool((v) => (v === "calculator" ? null : "calculator"))}
              >
                <IconCalculator />
                <span className="hidden sm:inline">{t("ptool.calculator")}</span>
              </button>
              <button
                className={`tool-btn ${tool === "reference" ? "tool-btn-on" : ""}`}
                aria-pressed={tool === "reference"}
                onClick={() => setTool((v) => (v === "reference" ? null : "reference"))}
              >
                <IconReference />
                <span className="hidden sm:inline">{t("ptool.reference")}</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Section clock as a hairline, draining left to right. */}
      <div className="h-[2px] overflow-hidden" style={{ background: "var(--line)" }}>
        <div
          className="h-full transition-[width] duration-1000 ease-linear"
          style={{
            width: `${(secondsLeft / Math.max(1, section.minutes * 60)) * 100}%`,
            background: lowTime ? "var(--danger)" : "var(--foreground)",
          }}
        />
      </div>

      {/* ---------------- work area ---------------- */}
      <div className={`test-body ${tool ? "test-body-split" : ""}`}>
        {tool && (
          <aside className="test-pane fade-in">
            <div className="flex items-center gap-2 px-3 h-11 border-b">
              <p className="text-[13.5px] font-medium">
                {tool === "calculator" ? t("ptool.calcTitle") : t("ptool.refTitle")}
              </p>
              <button
                className="btn btn-ghost btn-sm ml-auto"
                onClick={() => setTool(null)}
                aria-label={t("tutor.close")}
              >
                ✕
              </button>
            </div>
            <div className="flex-1 min-h-0">
              {tool === "calculator" ? <Calculator /> : <ReferenceSheet />}
            </div>
          </aside>
        )}

        <main className="test-question">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="q-number num">{questionIndex + 1}</span>
            <button
              className={`btn btn-ghost btn-sm ${marked[question.id] ? "is-marked" : ""}`}
              aria-pressed={Boolean(marked[question.id])}
              onClick={() =>
                setMarked((prev) => ({ ...prev, [question.id]: !prev[question.id] }))
              }
            >
              <IconFlag filled={Boolean(marked[question.id])} />
              {marked[question.id] ? t("ptool.marked") : t("ptool.mark")}
            </button>

            <span className="ml-auto flex items-center gap-2">
              <span className="text-[12.5px] text-muted truncate">
                <span className="num text-faint mr-1.5">
                  {sectionIndex + 1}/{sections.length}
                </span>
                {section.name}
              </span>
              <button
                className={`bar-btn w-8 h-8 ${crossOutMode ? "tool-btn-on" : ""}`}
                aria-pressed={crossOutMode}
                onClick={() => setCrossOutMode((v) => !v)}
                title={t("ptool.crossOut")}
                aria-label={t("ptool.crossOut")}
              >
                <IconCrossOut />
              </button>
            </span>
          </div>

          {/* No difficulty badge and no explanation here: the real test tells a
              student nothing about the item they are looking at. */}
          {generatedIds().has(question.id) && (
            <p className="mt-2">
              <span className="pl-ai-badge" title={t("plan.aiBadgeTitle")}>
                {t("plan.aiBadge")}
              </span>
            </p>
          )}

          {timedOut && <p className="mt-3 text-[13px] text-warning">{t("mock.timeUp")}</p>}

          {highlightMode && (
            <p className="mt-3 text-[12px] text-faint fade-in">
              {t("ptool.highlightHint")}{" "}
              {highlighter.count > 0 && (
                <button className="underline" onClick={highlighter.clear}>
                  {t("ptool.clearHighlights")}
                </button>
              )}
            </p>
          )}

          <div className="mt-5" ref={questionRef}>
            <QuestionView
              question={question}
              selected={answers[question.id] ?? null}
              onSelect={(choice) => setAnswers((prev) => ({ ...prev, [question.id]: choice }))}
              crossOutMode={crossOutMode}
              crossedOut={crossed[question.id] ?? []}
              onToggleCross={(choice) =>
                setCrossed((prev) => {
                  const current = prev[question.id] ?? [];
                  return {
                    ...prev,
                    [question.id]: current.includes(choice)
                      ? current.filter((c) => c !== choice)
                      : [...current, choice],
                  };
                })
              }
            />
          </div>
        </main>
      </div>

      {/* ---------------- footer ---------------- */}
      <footer className="test-foot">
        <span className="num hidden sm:block text-[13px] text-muted">
          {answeredInSection}/{section.questions.length}
        </span>

        <div className="relative mx-auto">
          <button
            className="btn btn-sm"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((v) => !v)}
          >
            <span className="num">
              {questionIndex + 1} {t("quiz.of")} {section.questions.length}
            </span>
            <IconChevron />
          </button>
          {navOpen && (
            <QuestionNavigator
              total={section.questions.length}
              current={questionIndex}
              answered={answeredFlags}
              marked={markedFlags}
              onGo={setQuestionIndex}
              onClose={() => setNavOpen(false)}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            className="btn btn-sm"
            disabled={questionIndex === 0}
            onClick={() => setQuestionIndex((i) => i - 1)}
          >
            {t("ptool.previous")}
          </button>
          {questionIndex + 1 < section.questions.length ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setQuestionIndex((i) => i + 1)}
            >
              {t("ptool.next")}
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setConfirmSubmit(true)}>
              {isLastSection ? t("quiz.finish") : t("mock.submitSection")}
            </button>
          )}
        </div>
      </footer>

      {confirmSubmit && (
        <ConfirmDialog
          title={isLastSection ? t("mock.confirmFinishTitle") : t("mock.confirmSectionTitle")}
          body={
            unanswered > 0
              ? `${t("mock.confirmUnanswered")}: ${unanswered}. ${t("mock.confirmNoReturn")}`
              : t("mock.confirmNoReturn")
          }
          confirmLabel={isLastSection ? t("quiz.finish") : t("mock.submitSection")}
          cancelLabel={t("mock.keepWorking")}
          onConfirm={submitSection}
          onCancel={() => setConfirmSubmit(false)}
        />
      )}

      {confirmExit && (
        <ConfirmDialog
          title={t("mock.confirmCancelTitle")}
          body={t("mock.confirmCancelBody")}
          confirmLabel={t("mock.cancelTest")}
          cancelLabel={t("mock.keepWorking")}
          danger
          onConfirm={onExit}
          onCancel={() => setConfirmExit(false)}
        />
      )}
    </div>
  );
}
