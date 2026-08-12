"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Question } from "@/data/types";
import { useApp } from "@/lib/app-state";
import { useExamMode } from "@/lib/exam-mode";
import { useFullscreen } from "@/lib/fullscreen";
import { readingDisplayParts } from "@/lib/reading-parts";
import { useSettings } from "@/lib/settings";
import { generatedIds } from "@/lib/generation/provenance";
import { useI18n } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/ui";
import { QuestionPassage, QuestionView } from "./QuestionView";
import { BreakScreen } from "./test/BreakScreen";
import { CalculatorPanel } from "./test/CalculatorPanel";
import { FloatingTool } from "./test/FloatingTool";
import { QuestionNavigator } from "./test/QuestionNavigator";
import { ReferenceSheet } from "./test/ReferenceSheet";
import { useHighlighter } from "./test/useHighlighter";
import { HighlightControls } from "./test/HighlightControls";
import { ContextualHighlightPalette } from "./test/ContextualHighlightPalette";
import {
  IconCalculator,
  IconChevron,
  IconCrossOut,
  IconClock,
  IconFlag,
  IconFullscreen,
  IconMoon,
  IconMore,
  IconSun,
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
  const { settings } = useSettings();
  const { theme, toggleTheme } = useApp();
  const fullscreen = useFullscreen();
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
  const [moreOpen, setMoreOpen] = useState(false);
  // Seeded from the preference, then owned by the session: a student who
  // hides the clock in Settings can still show it for one module.
  const [timerHidden, setTimerHidden] = useState(settings.hideTimer);
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  /** Index of the module waiting on the other side of the break, if any. */
  const [breakBefore, setBreakBefore] = useState<number | null>(null);
  /** The reading pane's share of the width, and whether it is being dragged. */
  const [splitRatio, setSplitRatio] = useState(50);
  const [resizing, setResizing] = useState(false);

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
  const passageRef = useRef<HTMLElement>(null);

  /**
   * The same two-pane split practice uses, from the same helper — a passage on
   * the left, the question about it on the right.
   */
  const readingParts = question ? readingDisplayParts(question) : null;
  const hasReadingPane = Boolean(readingParts);
  const displayQuestion = readingParts
    ? { ...question, passage: undefined, prompt: readingParts.prompt }
    : question;
  const passageQuestion = readingParts
    ? { ...question, passage: readingParts.passage }
    : question;

  // Highlighting belongs to whichever pane holds the prose, and on a passage the
  // flow is select-then-choose-a-colour rather than draw-immediately.
  const highlighter = useHighlighter(
    hasReadingPane ? passageRef : questionRef,
    highlightMode,
    question?.id ?? "",
    { contextual: hasReadingPane },
  );

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

  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (event: PointerEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, [moreOpen]);

  useEffect(() => {
    if (!resizing) return;
    const move = (event: PointerEvent) => {
      const bounds = questionRef.current?.getBoundingClientRect();
      if (!bounds?.width) return;
      const nextRatio = ((event.clientX - bounds.left) / bounds.width) * 100;
      setSplitRatio(Math.min(65, Math.max(35, nextRatio)));
    };
    const stop = () => setResizing(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
  }, [resizing]);

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
    <div
      className={`test-shell practice-test-shell ${hasReadingPane ? "has-reading-pane" : ""}`}
    >
      {/* ---------------- tool rail ----------------
          The same bar practice uses, so the two surfaces are one interface: exit
          and directions left, the clock in the middle, the tools right. What
          differs is what the clock does — it counts down, and it cannot be
          paused. */}
      <header className="test-bar">
        <div className="test-bar-left">
          <button className="test-header-btn" onClick={() => setConfirmExit(true)}>
            <span aria-hidden>✕</span> {t("mock.cancelTest")}
          </button>

          <div className="relative">
            <button
              className="test-header-btn"
              aria-expanded={directionsOpen}
              onClick={() => setDirectionsOpen((value) => !value)}
            >
              {t("ptool.directions")}
              <IconChevron />
            </button>
            {directionsOpen && (
              <div
                className="panel scale-in test-directions-panel"
                style={{ boxShadow: "var(--overlay)" }}
              >
                <p className="text-sm leading-relaxed text-muted">{t("mock.directionsBody")}</p>
                <button
                  className="btn btn-sm mt-3 w-full"
                  onClick={() => setDirectionsOpen(false)}
                >
                  {t("tour.done")}
                </button>
              </div>
            )}
          </div>

          <span className="test-module-label">
            <span className="num text-faint mr-1.5">
              {sectionIndex + 1}/{sections.length}
            </span>
            {section.name}
          </span>
        </div>

        <div className="test-timer">
          <span className="test-clock-slot">
            {timerHidden ? (
              <IconClock className="test-clock-hidden" />
            ) : (
              <span
                className="test-clock num tabular-nums"
                role="timer"
                style={lowTime ? { color: "var(--danger)" } : undefined}
              >
                {formatClock(secondsLeft)}
              </span>
            )}
          </span>
          <span className="test-timer-actions">
            {/* No pause button, unlike practice: a mock that can be stopped is
                not measuring anything. */}
            <button className="test-timer-hide" onClick={() => setTimerHidden((value) => !value)}>
              {timerHidden ? t("ptool.show") : t("ptool.hide")}
            </button>
          </span>
        </div>

        <div className="test-bar-right">
          {highlighter.supported && (
            <button
              className={`tool-btn ${highlightMode ? "tool-btn-on" : ""}`}
              aria-pressed={highlightMode}
              onClick={() => {
                setHighlightMode((value) => !value);
                highlighter.dismiss();
              }}
            >
              <IconHighlight />
              <span>{t("ptool.highlight")}</span>
            </button>
          )}
          {isMath && (
            <>
              <button
                className={`tool-btn ${tool === "calculator" ? "tool-btn-on" : ""}`}
                aria-pressed={tool === "calculator"}
                onClick={() => setTool((value) => (value === "calculator" ? null : "calculator"))}
              >
                <IconCalculator />
                <span>{t("ptool.calculator")}</span>
              </button>
              <button
                className={`tool-btn ${tool === "reference" ? "tool-btn-on" : ""}`}
                aria-pressed={tool === "reference"}
                onClick={() => setTool((value) => (value === "reference" ? null : "reference"))}
              >
                <IconReference />
                <span>{t("ptool.reference")}</span>
              </button>
            </>
          )}

          {/* Practice's More menu, with the two entries that belong in a timed
              test. Fullscreen is the one a student actually wants here: the real
              test app fills the screen, and a browser's tabs and bookmarks bar
              are the difference between practising and sitting an exam. */}
          <div className="test-more-wrap" ref={moreRef}>
            <button
              className="tool-btn test-more-btn"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              onClick={() => setMoreOpen((value) => !value)}
            >
              <IconMore />
              <span>{t("ptool.more")}</span>
            </button>
            {moreOpen && (
              <div className="test-more-menu scale-in" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void fullscreen.toggle();
                    setMoreOpen(false);
                  }}
                >
                  <IconFullscreen />
                  <span>
                    {t(fullscreen.isFullscreen ? "ptool.exitFullscreen" : "ptool.fullscreen")}
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    toggleTheme();
                    setMoreOpen(false);
                  }}
                >
                  {theme === "dark" ? <IconSun /> : <IconMoon />}
                  <span>{t(theme === "dark" ? "nav.lightMode" : "nav.darkMode")}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Where practice shows how far through the set you are, a mock shows how
          much of the module's clock is left — same hairline, same place. */}
      <div className="test-section-progress" aria-hidden>
        <span
          style={{
            width: `${(secondsLeft / Math.max(1, section.minutes * 60)) * 100}%`,
            background: lowTime ? "var(--danger)" : "var(--brand)",
          }}
        />
      </div>

      {/* The tools are windows now: dragged by their header, resized by the
          browser's grip. A docked column covered the figure on the very Math
          questions the calculator is for. */}
      {tool && (
        <FloatingTool
          id={tool}
          title={tool === "calculator" ? t("ptool.calcTitle") : t("ptool.refTitle")}
          hint={t("ptool.dragHint")}
          closeLabel={t("tutor.close")}
          onClose={() => setTool(null)}
        >
          {tool === "calculator" ? <CalculatorPanel /> : <ReferenceSheet />}
        </FloatingTool>
      )}

      {/* ---------------- work area ---------------- */}
      <div
        className={`test-body ${resizing ? "is-resizing" : ""}`}
        ref={questionRef}
        style={{ ["--passage-ratio" as string]: `${splitRatio}%` }}
      >
        {hasReadingPane && (
          <section className="test-passage-pane" ref={passageRef} aria-label={t("study.passage")}>
            <div className="test-passage-inner">
              <QuestionPassage question={passageQuestion} labelled={false} />
            </div>
          </section>
        )}

        {hasReadingPane && (
          <div
            className="test-split-handle"
            role="separator"
            aria-label="Resize passage and question panes"
            aria-orientation="vertical"
            aria-valuemin={35}
            aria-valuemax={65}
            aria-valuenow={Math.round(splitRatio)}
            tabIndex={0}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              setResizing(true);
            }}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              setSplitRatio((value) =>
                Math.min(65, Math.max(35, value + (event.key === "ArrowLeft" ? -2 : 2))),
              );
            }}
          >
            <span aria-hidden />
          </div>
        )}

        <main className="test-question">
          <div className="test-question-status">
            <span className="q-number num">{questionIndex + 1}</span>
            <button
              className={`test-mark-btn ${marked[question.id] ? "is-marked" : ""}`}
              aria-pressed={Boolean(marked[question.id])}
              onClick={() =>
                setMarked((previous) => ({ ...previous, [question.id]: !previous[question.id] }))
              }
            >
              <IconFlag filled={Boolean(marked[question.id])} />
              {marked[question.id] ? t("ptool.marked") : t("ptool.mark")}
            </button>

            <button
              className={`test-cross-tool ${crossOutMode ? "tool-btn-on" : ""}`}
              aria-pressed={crossOutMode}
              onClick={() => setCrossOutMode((value) => !value)}
              title={t("ptool.crossOut")}
              aria-label={t("ptool.crossOut")}
            >
              <IconCrossOut />
            </button>
          </div>

          {/* No domain, no difficulty and no explanation: the real test tells a
              student nothing about the item in front of them. The only badge is
              the one a student is entitled to — who wrote the question. */}
          {generatedIds().has(question.id) && (
            <div className="test-question-meta">
              <span className="pl-ai-badge" title={t("plan.aiBadgeTitle")}>
                {t("plan.aiBadge")}
              </span>
            </div>
          )}

          {timedOut && <p className="test-result-message text-warning">{t("mock.timeUp")}</p>}

          <div className="test-question-content">
            <QuestionView
              question={displayQuestion}
              selected={answers[question.id] ?? null}
              onSelect={(choice) =>
                setAnswers((previous) => ({ ...previous, [question.id]: choice }))
              }
              crossOutMode={crossOutMode}
              crossedOut={crossed[question.id] ?? []}
              onToggleCross={(choice) =>
                setCrossed((previous) => {
                  const current = previous[question.id] ?? [];
                  return {
                    ...previous,
                    [question.id]: current.includes(choice)
                      ? current.filter((c) => c !== choice)
                      : [...current, choice],
                  };
                })
              }
              showPassage={!hasReadingPane}
              variant="exam"
            />
          </div>
        </main>
      </div>

      {highlightMode && (
        <div className="test-highlight-bar">
          <HighlightControls highlighter={highlighter} />
        </div>
      )}

      {hasReadingPane && <ContextualHighlightPalette highlighter={highlighter} />}

      {/* ---------------- footer ----------------
          Practice's footer, with the module's own buttons: the navigator in the
          middle, how far through you are on the left, and the way forward on the
          right — which at the end of a module is "submit", not "next". */}
      <footer className="test-foot">
        <div className="test-foot-progress relative">
          <button
            className="test-progress-btn"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((value) => !value)}
            title={section.name}
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

        <div className="test-foot-controls">
          <div className="test-foot-help">
            <span className="num text-sm text-muted">
              {answeredInSection}/{section.questions.length}
            </span>
          </div>

          <div className="test-foot-actions">
            <button
              className="btn btn-sm"
              disabled={questionIndex === 0}
              onClick={() => setQuestionIndex((value) => value - 1)}
            >
              {t("ptool.previous")}
            </button>
            {questionIndex + 1 < section.questions.length ? (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setQuestionIndex((value) => value + 1)}
              >
                {t("ptool.next")}
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={() => setConfirmSubmit(true)}>
                {isLastSection ? t("quiz.finish") : t("mock.submitSection")}
              </button>
            )}
          </div>
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
