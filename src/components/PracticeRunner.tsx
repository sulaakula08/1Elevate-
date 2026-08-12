"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Question } from "@/data/types";
import { useApp } from "@/lib/app-state";
import { useExamMode } from "@/lib/exam-mode";
import { useSettings } from "@/lib/settings";
import { apiFetch } from "@/lib/supabase/client";
import { generatedIds } from "@/lib/generation/provenance";
import { useI18n } from "@/lib/i18n";
import type { QuizMode } from "@/lib/storage";
import { pct } from "@/lib/stats";
import { QuestionPassage, QuestionView } from "./QuestionView";
import { AiTutor } from "./AiTutor";
import { ProgressBar, Toast } from "./motion";
import { ProgressMark, SuccessTick } from "./illustrations";
import { CalculatorPanel } from "./test/CalculatorPanel";
import { ReferenceSheet } from "./test/ReferenceSheet";
import { QuestionNavigator } from "./test/QuestionNavigator";
import { useHighlighter } from "./test/useHighlighter";
import { ContextualHighlightPalette } from "./test/ContextualHighlightPalette";
import {
  IconBug,
  IconCalculator,
  IconChevron,
  IconClock,
  IconCrossOut,
  IconExplanation,
  IconFlag,
  IconFullscreen,
  IconHighlight,
  IconInfo,
  IconKeyboard,
  IconMoon,
  IconMore,
  IconPause,
  IconPlay,
  IconReport,
  IconReference,
  IconSun,
} from "./test/TestIcons";

type Props = {
  questions: Question[];
  mode: QuizMode;
  title: string;
  onExit: () => void;
  onRestart?: () => void;
};

type Tool = "calculator" | "reference" | null;

const REPORT_REASONS = [
  "Problem with question",
  "Problem with answer choices",
  "Incorrect answer/explanation",
  "Formatting issue",
  "Technical issue",
  "Other",
] as const;

/**
 * The question slides out the way the student is travelling and the next one
 * arrives from the opposite edge, so moving through a section reads as motion
 * along it rather than as the page blinking.
 *
 * `custom` carries the direction: +1 going forward, -1 going back. CSS cannot
 * express this at all — it has no way to animate an element that is being
 * removed from the DOM, which is exactly what the outgoing question is.
 */
const QUESTION_SLIDE = {
  enter: (direction: number) => ({ opacity: 0, x: direction > 0 ? 28 : -28 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction > 0 ? -28 : 28 }),
};

/** Short enough that a fast reader never waits on it. */
const SLIDE = { duration: 0.18, ease: [0.22, 0.61, 0.36, 1] as const };

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Replace one slot without mutating the array. */
function setAt<T>(list: T[], index: number, value: T): T[] {
  return list.map((item, i) => (i === index ? value : item));
}

/**
 * Older Reading & Writing rows keep the stimulus and question in two prompt
 * paragraphs instead of the optional passage field. Normalize that shape only
 * for display; the original question still goes to scoring, storage and Elevate.
 */
function readingDisplayParts(question: Question) {
  if (question.subjectId === "sat-math") return null;
  if (question.passage) return { passage: question.passage, prompt: question.prompt };

  const blocks = question.prompt.en
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length < 2) return null;
  return {
    passage: { en: blocks.slice(0, -1).join("\n\n") },
    prompt: { en: blocks[blocks.length - 1] },
  };
}

/**
 * Practice, in the shape of the real digital test app: the same tool rail, the
 * same per-question controls (mark for review, cross out a choice) and the same
 * section navigator, so nothing about test day is unfamiliar.
 *
 * What it keeps from practice rather than the exam: an answer can be checked on
 * the spot, the explanation is right there, and the tutor is one click away.
 * Time is measured but never enforced.
 */
export function PracticeRunner({ questions, mode, title, onExit, onRestart }: Props) {
  const { t } = useI18n();
  const { recordAttempts, theme, toggleTheme } = useApp();
  const { settings } = useSettings();
  useExamMode();
  const count = questions.length;

  const [index, setIndex] = useState(0);
  /** Which way the last move went, so the slide points the right way. */
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<(number | null)[]>(() => Array(count).fill(null));
  const [revealed, setRevealed] = useState<boolean[]>(() => Array(count).fill(false));
  const [marked, setMarked] = useState<boolean[]>(() => Array(count).fill(false));
  const [crossed, setCrossed] = useState<number[][]>(() => questions.map(() => []));

  const [tool, setTool] = useState<Tool>(null);
  const [highlightMode, setHighlightMode] = useState(false);
  const [crossOutMode, setCrossOutMode] = useState(false);
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Problem with question");
  const [reportDetails, setReportDetails] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSent, setReportSent] = useState(false);
  const [explanationOpen, setExplanationOpen] = useState<boolean[]>(() =>
    Array(count).fill(false),
  );
  const [splitRatio, setSplitRatio] = useState(50);
  const [resizing, setResizing] = useState(false);

  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  // Seeded from the preference, then owned by the session: a student who
  // hides the clock in Settings can still show it for one module.
  const [timerHidden, setTimerHidden] = useState(settings.hideTimer);

  const [streak, setStreak] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const question = questions[index];
  const selected = answers[index] ?? null;
  const isRevealed = revealed[index];
  const readingParts = question ? readingDisplayParts(question) : null;
  const hasReadingPane = Boolean(readingParts);

  const correctCount = useMemo(
    () => answers.filter((a, i) => revealed[i] && a === questions[i].answer).length,
    [answers, revealed, questions],
  );

  const questionRef = useRef<HTMLDivElement>(null);
  const passageRef = useRef<HTMLElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const highlighter = useHighlighter(
    hasReadingPane ? passageRef : questionRef,
    highlightMode,
    question?.id ?? "",
    { contextual: hasReadingPane },
  );

  /* ---------------- timing ---------------- */

  useEffect(() => {
    if (paused || done) return;
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [paused, done]);

  // Per-question timing for the attempt record, stamped after render.
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, [index]);

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

  useEffect(() => {
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (moreOpen && !moreRef.current?.contains(target)) setMoreOpen(false);
      if (infoOpen && !infoRef.current?.contains(target)) setInfoOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMoreOpen(false);
      setInfoOpen(false);
      setShortcutsOpen(false);
      setReportOpen(false);
    };
    window.addEventListener("pointerdown", closeOnOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [moreOpen, infoOpen]);

  /* ---------------- answering ---------------- */

  const select = useCallback(
    (choice: number) => {
      if (revealed[index]) return;
      setAnswers((list) => setAt(list, index, choice));
    },
    [index, revealed],
  );

  const check = useCallback(() => {
    if (selected === null || isRevealed) return;
    const isCorrect = selected === question.answer;
    setRevealed((list) => setAt(list, index, true));
    if (isCorrect) {
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
  }, [selected, isRevealed, question, index, recordAttempts, mode, t]);

  const openExplanation = useCallback(() => {
    setExplanationOpen((list) => setAt(list, index, true));
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() =>
        questionRef.current
          ?.querySelector<HTMLElement>(".q-explanation")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      ),
    );
  }, [index]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } finally {
      setMoreOpen(false);
    }
  }, []);

  const submitReport = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (reportBusy) return;
      setReportBusy(true);
      setReportError(null);
      try {
        const response = await apiFetch("/api/feedback", {
          method: "POST",
          body: JSON.stringify({
            category: reportReason === "Technical issue" ? "bug" : "content",
            message: [
              "Practice question report",
              `Question: ${question.id}`,
              `Subject: ${question.subjectId}`,
              `Reason: ${reportReason}`,
              reportDetails.trim() ? `Details: ${reportDetails.trim()}` : "",
            ]
              .filter(Boolean)
              .join("\n"),
          }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          setReportError(body.error ?? "The report could not be sent.");
          return;
        }
        setReportSent(true);
      } catch {
        setReportError("The report could not be sent. Check your connection and try again.");
      } finally {
        setReportBusy(false);
      }
    },
    [question, reportBusy, reportDetails, reportReason],
  );

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= count) return;
      setDirection(next > index ? 1 : -1);
      setIndex(next);
    },
    [count, index],
  );

  const next = useCallback(() => {
    if (index + 1 >= count) setDone(true);
    else goTo(index + 1);
  }, [index, count, goTo]);

  /* ---------------- results ---------------- */

  if (done || !question) {
    const attempted = revealed.filter(Boolean).length || count;
    const accuracy = attempted ? correctCount / attempted : 0;
    const great = accuracy >= 0.8;
    return (
      <div className="max-w-sm mx-auto py-16 text-center fade-in">
        {great ? <SuccessTick className="mx-auto" /> : <ProgressMark className="mx-auto" />}
        <p className="label-xs mt-7">{t("quiz.result")}</p>
        <p className="num mt-3 text-5xl font-medium">
          {correctCount}
          <span className="text-faint">/{attempted}</span>
        </p>
        <p className="mt-2 text-sm text-muted">
          {pct(accuracy)} {t("practice.accuracy")} · <span className="num">{clock(elapsed)}</span>
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

  const isMath = question.subjectId === "sat-math";
  const displayQuestion = readingParts
    ? { ...question, passage: undefined, prompt: readingParts.prompt }
    : question;
  const passageQuestion = readingParts
    ? { ...question, passage: readingParts.passage }
    : question;
  const inlineAction: "check" | "explain" | null = hasReadingPane
    ? !isRevealed && selected !== null
      ? "check"
      : isRevealed && selected !== question.answer
        ? "explain"
        : null
    : null;

  const toggleCross = (choice: number) =>
    setCrossed((list) =>
      setAt(
        list,
        index,
        list[index].includes(choice)
          ? list[index].filter((crossedChoice) => crossedChoice !== choice)
          : [...list[index], choice],
      ),
    );

  const questionPanel = (
    <main className="test-question">
      <div className="test-question-status">
        <span className="q-number num">{index + 1}</span>
        <button
          className={`test-mark-btn ${marked[index] ? "is-marked" : ""}`}
          aria-pressed={marked[index]}
          onClick={() => setMarked((list) => setAt(list, index, !list[index]))}
        >
          <IconFlag filled={marked[index]} />
          {marked[index] ? t("ptool.marked") : t("ptool.mark")}
        </button>

        <button
          className="test-report-btn"
          onClick={() => {
            setReportSent(false);
            setReportError(null);
            setReportOpen(true);
          }}
        >
          <IconReport />
          <span>Report</span>
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

      {!hasReadingPane && (
        <div className="test-question-meta">
          <span>{question.domain ?? question.topic}</span>
          {question.domain && <span>{question.topic}</span>}
          <span className="test-difficulty" title={t("quiz.difficulty")}>
            {t(`diff.${question.difficulty}`)}
          </span>
          {generatedIds().has(question.id) && (
            <span className="pl-ai-badge" title={t("plan.aiBadgeTitle")}>
              {t("plan.aiBadge")}
            </span>
          )}
          {streak >= 3 && <span className="ml-auto num">↑ {streak}</span>}
        </div>
      )}

      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={question.id}
          className="test-question-content"
          custom={direction}
          variants={QUESTION_SLIDE}
          initial="enter"
          animate="center"
          exit="exit"
          transition={SLIDE}
        >
          <QuestionView
            question={displayQuestion}
            selected={selected}
            onSelect={select}
            revealed={isRevealed}
            disabled={isRevealed}
            crossOutMode={crossOutMode}
            crossedOut={crossed[index]}
            onToggleCross={toggleCross}
            showPassage={!hasReadingPane}
            variant="exam"
            inlineAction={inlineAction}
            onInlineAction={
              inlineAction === "check"
                ? check
                : inlineAction === "explain"
                  ? openExplanation
                  : undefined
            }
            showExplanation={hasReadingPane ? explanationOpen[index] : isRevealed}
          />
        </motion.div>
      </AnimatePresence>

      {isRevealed && (
        <p
          className="test-result-message fade-in"
          style={{ color: selected === question.answer ? "var(--success)" : "var(--danger)" }}
        >
          {selected === question.answer ? t("quiz.correct") : t("quiz.incorrect")}
        </p>
      )}
    </main>
  );

  return (
    <div className={`test-shell practice-test-shell ${hasReadingPane ? "has-reading-pane" : ""}`}>
      {/* ---------------- tool rail ---------------- */}
      <header className="test-bar">
        <div className="test-bar-left">
          <button className="test-header-btn" onClick={onExit}>
            <span aria-hidden>‹</span> {t("ptool.goBack")}
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
              <div className="panel scale-in test-directions-panel" style={{ boxShadow: "var(--overlay)" }}>
                <p className="text-sm leading-relaxed text-muted">{t("ptool.directionsBody")}</p>
                <button className="btn btn-sm mt-3 w-full" onClick={() => setDirectionsOpen(false)}>
                  {t("tour.done")}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="test-timer">
          <span className="test-clock-slot">
            {timerHidden ? (
              <IconClock className="test-clock-hidden" />
            ) : (
              <span className="test-clock num tabular-nums" role="timer">
                {clock(elapsed)}
              </span>
            )}
          </span>
          <span className="test-timer-actions">
            <button
              className="test-timer-play"
              onClick={() => setPaused((value) => !value)}
              aria-label={paused ? t("ptool.resume") : t("ptool.pause")}
              title={paused ? t("ptool.resume") : t("ptool.pause")}
            >
              {paused ? <IconPlay /> : <IconPause />}
            </button>
            <button className="test-timer-hide" onClick={() => setTimerHidden((value) => !value)}>
              {timerHidden ? t("ptool.show") : t("ptool.hide")}
            </button>
          </span>
        </div>

        <div className="test-bar-right">
          {/* Offered only where the browser can actually draw it — the API this
              uses has no reasonable fallback, and a dead button is worse. */}
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
          <div className="test-more-wrap" ref={moreRef}>
            <button
              className="tool-btn test-more-btn"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              onClick={() => setMoreOpen((value) => !value)}
            >
              <IconMore />
              <span>More</span>
            </button>
            {moreOpen && (
              <div className="test-more-menu scale-in" role="menu">
                <button type="button" role="menuitem" onClick={() => void toggleFullscreen()}>
                  <IconFullscreen />
                  <span>
                    {typeof document !== "undefined" && document.fullscreenElement
                      ? "Exit fullscreen"
                      : "Fullscreen"}
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false);
                    setShortcutsOpen(true);
                  }}
                >
                  <IconKeyboard />
                  <span>Keyboard shortcuts</span>
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
                  <span>Switch to {theme === "dark" ? "light" : "dark"} mode</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false);
                    setReportReason("Technical issue");
                    setReportSent(false);
                    setReportError(null);
                    setReportOpen(true);
                  }}
                >
                  <IconBug />
                  <span>Bug Report</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <ProgressBar value={count ? index / count : 0} className="test-section-progress" />

      {/* ---------------- work area ---------------- */}
      <div
        className={`test-body ${resizing ? "is-resizing" : ""}`}
        ref={questionRef}
        style={{ ["--passage-ratio" as string]: `${splitRatio}%` }}
      >
        <AnimatePresence initial={false}>
          {tool && (
            <motion.aside
              key={tool}
              className="test-pane"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={SLIDE}
            >
            <div className="flex items-center gap-2 px-3 h-11 border-b">
              <p className="text-sm font-medium">
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
                {tool === "calculator" ? <CalculatorPanel /> : <ReferenceSheet />}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {hasReadingPane && (
          <section
            className="test-passage-pane"
            ref={passageRef}
            aria-label={t("study.passage")}
          >
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

        {questionPanel}
      </div>

      {hasReadingPane && <ContextualHighlightPalette highlighter={highlighter} />}

      {/* ---------------- footer ---------------- */}
      <footer className="test-foot">
        <div className="test-foot-progress relative">
          <button
            className="test-progress-btn"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((value) => !value)}
            title={title}
          >
            <span className="num">
              {index + 1} {t("quiz.of")} {count}
            </span>
            <IconChevron />
          </button>
          {/* AnimatePresence keeps the popover mounted long enough to play its
              exit — the reason it is here rather than a CSS class. */}
          <AnimatePresence>
            {navOpen && (
              <QuestionNavigator
                total={count}
                current={index}
                answered={answers.map((a) => a !== null)}
                marked={marked}
                onGo={goTo}
                onClose={() => setNavOpen(false)}
              />
            )}
          </AnimatePresence>
        </div>

        <div className="test-foot-controls">
          <div className="test-foot-help">
            <div className="test-info-wrap" ref={infoRef}>
              <button
                type="button"
                className="test-info-btn"
                aria-label="Question information"
                aria-expanded={infoOpen}
                onClick={() => setInfoOpen((value) => !value)}
              >
                <IconInfo />
              </button>
              {infoOpen && (
                <div className="test-info-popover scale-in">
                  <p className="test-popover-title">Question information</p>
                  <dl>
                    <div><dt>Question</dt><dd>{index + 1} of {count}</dd></div>
                    <div><dt>Subject</dt><dd>{isMath ? "Math" : "Reading & Writing"}</dd></div>
                    {(question.domain || question.topic) && (
                      <div><dt>Domain</dt><dd>{question.domain ?? question.topic}</dd></div>
                    )}
                    {question.skill && <div><dt>Question type</dt><dd>{question.skill}</dd></div>}
                    <div><dt>Difficulty</dt><dd>{t(`diff.${question.difficulty}`)}</dd></div>
                  </dl>
                </div>
              )}
            </div>
            <button
              className={`test-learning-btn test-learning-primary ${tutorOpen ? "tool-btn-on" : ""}`}
              aria-pressed={tutorOpen}
              onClick={() => setTutorOpen((value) => !value)}
            >
              {t("ptool.askTutor")}
            </button>
            <button
              className="test-learning-btn"
              disabled={!isRevealed}
              onClick={openExplanation}
            >
              <IconExplanation />
              {t("quiz.explanation")}
            </button>
          </div>

          <div className="test-foot-actions">
            <button className="test-nav-btn" disabled={index === 0} onClick={() => goTo(index - 1)}>
              {t("ptool.previous")}
            </button>
            {hasReadingPane ? (
              <button className="test-nav-btn test-nav-primary" disabled={!isRevealed} onClick={next}>
                {index + 1 >= count ? t("quiz.finish") : t("ptool.next")}
              </button>
            ) : !isRevealed ? (
              <button className="test-nav-btn test-nav-primary" disabled={selected === null} onClick={check}>
                {t("quiz.check")}
              </button>
            ) : (
              <button className="test-nav-btn test-nav-primary" onClick={next}>
                {index + 1 >= count ? t("quiz.finish") : t("ptool.next")}
              </button>
            )}
          </div>
        </div>
      </footer>

      {shortcutsOpen && (
        <div className="test-modal-backdrop" role="presentation" onMouseDown={() => setShortcutsOpen(false)}>
          <section
            className="test-compact-modal scale-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="practice-shortcuts-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="test-modal-head">
              <h2 id="practice-shortcuts-title">Keyboard shortcuts</h2>
              <button type="button" aria-label="Close" onClick={() => setShortcutsOpen(false)}>×</button>
            </div>
            <dl className="test-shortcut-list">
              <div><dt><kbd>1</kbd>–<kbd>4</kbd></dt><dd>Select an answer</dd></div>
              <div><dt><kbd>Enter</kbd></dt><dd>Check the selected answer</dd></div>
              <div><dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>Resize panes when the divider is focused</dd></div>
              <div><dt><kbd>Esc</kbd></dt><dd>Close an open menu or palette</dd></div>
            </dl>
          </section>
        </div>
      )}

      {reportOpen && (
        <div className="test-modal-backdrop" role="presentation" onMouseDown={() => setReportOpen(false)}>
          <section
            className="test-report-modal scale-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="practice-report-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="test-modal-head">
              <h2 id="practice-report-title">Report this question</h2>
              <button type="button" aria-label="Close" onClick={() => setReportOpen(false)}>×</button>
            </div>
            {reportSent ? (
              <div className="test-report-sent">
                <p>Thanks — your report was sent to the 1Elevate team.</p>
                <button type="button" className="test-modal-primary" onClick={() => setReportOpen(false)}>
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submitReport}>
                <fieldset>
                  <legend>What is the issue?</legend>
                  <div className="test-report-reasons">
                    {REPORT_REASONS.map((reason) => (
                      <label key={reason}>
                        <input
                          type="radio"
                          name="report-reason"
                          value={reason}
                          checked={reportReason === reason}
                          onChange={() => setReportReason(reason)}
                        />
                        <span>{reason}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="test-report-details">
                  <span>Details (optional)</span>
                  <textarea
                    value={reportDetails}
                    maxLength={2000}
                    placeholder="Tell us what looks wrong."
                    onChange={(event) => setReportDetails(event.target.value)}
                  />
                </label>
                {reportError && <p className="test-report-error" role="alert">{reportError}</p>}
                <div className="test-modal-actions">
                  <button type="button" onClick={() => setReportOpen(false)}>Cancel</button>
                  <button type="submit" className="test-modal-primary" disabled={reportBusy}>
                    {reportBusy ? "Sending…" : "Send report"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      {/*
        The tutor only sees what the student has already committed to. Keying on
        the question id remounts it per question, so each one gets a fresh chat.
      */}
      <AiTutor
        key={question.id}
        question={question}
        chosenIndex={isRevealed ? selected : null}
        open={tutorOpen}
        onOpenChange={setTutorOpen}
      />

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
