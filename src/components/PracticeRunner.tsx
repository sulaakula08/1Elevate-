"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Calculator } from "./test/Calculator";
import { ReferenceSheet } from "./test/ReferenceSheet";
import { QuestionNavigator } from "./test/QuestionNavigator";
import { useHighlighter } from "./test/useHighlighter";
import {
  IconCalculator,
  IconChevron,
  IconCrossOut,
  IconFlag,
  IconHighlight,
  IconPause,
  IconPlay,
  IconReference,
} from "./test/TestIcons";

type Props = {
  questions: Question[];
  mode: QuizMode;
  title: string;
  onExit: () => void;
  onRestart?: () => void;
};

type Tool = "calculator" | "reference" | null;

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
  const { recordAttempts } = useApp();
  const count = questions.length;

  const [index, setIndex] = useState(0);
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

  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [timerHidden, setTimerHidden] = useState(false);

  const [streak, setStreak] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const question = questions[index];
  const selected = answers[index] ?? null;
  const isRevealed = revealed[index];

  const correctCount = useMemo(
    () => answers.filter((a, i) => revealed[i] && a === questions[i].answer).length,
    [answers, revealed, questions],
  );

  const questionRef = useRef<HTMLDivElement>(null);
  const highlighter = useHighlighter(questionRef, highlightMode, question?.id ?? "");

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

  const goTo = useCallback(
    (next: number) => {
      if (next >= 0 && next < count) setIndex(next);
    },
    [count],
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
        <p className="mt-2 text-[14px] text-muted">
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

  return (
    <div className="test-shell">
      {/* ---------------- tool rail ---------------- */}
      <header className="test-bar">
        <button className="btn btn-ghost btn-sm -ml-2" onClick={onExit}>
          ← {t("ptool.goBack")}
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
                {t("ptool.directionsBody")}
              </p>
              <button className="btn btn-sm mt-3 w-full" onClick={() => setDirectionsOpen(false)}>
                {t("tour.done")}
              </button>
            </div>
          )}
        </div>

        <div className="test-timer">
          {timerHidden ? (
            <button className="btn btn-sm" onClick={() => setTimerHidden(false)}>
              {t("ptool.show")}
            </button>
          ) : (
            <>
              <span className="num text-[22px] font-medium tabular-nums leading-none">
                {clock(elapsed)}
              </span>
              <span className="flex items-center gap-1.5">
                <button
                  className="bar-btn w-7 h-7"
                  onClick={() => setPaused((v) => !v)}
                  aria-label={paused ? t("ptool.resume") : t("ptool.pause")}
                  title={paused ? t("ptool.resume") : t("ptool.pause")}
                >
                  {paused ? <IconPlay /> : <IconPause />}
                </button>
                <button className="btn btn-sm h-7" onClick={() => setTimerHidden(true)}>
                  {t("ptool.hide")}
                </button>
              </span>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          {/* Offered only where the browser can actually draw it — the API this
              uses has no reasonable fallback, and a dead button is worse. */}
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

      <ProgressBar value={count ? index / count : 0} />

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
            <span className="q-number num">{index + 1}</span>
            <button
              className={`btn btn-ghost btn-sm ${marked[index] ? "is-marked" : ""}`}
              aria-pressed={marked[index]}
              onClick={() => setMarked((list) => setAt(list, index, !list[index]))}
            >
              <IconFlag filled={marked[index]} />
              {marked[index] ? t("ptool.marked") : t("ptool.mark")}
            </button>

            <span className="ml-auto flex items-center gap-2">
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

          <div className="flex items-center gap-2.5 mt-2 flex-wrap">
            <span className="label-xs">{question.topic}</span>
            {question.domain && <span className="text-[11px] text-faint">{question.domain}</span>}
            {/* A student is entitled to know which questions a model wrote. */}
            {generatedIds().has(question.id) && (
              <span className="pl-ai-badge" title={t("plan.aiBadgeTitle")}>
                {t("plan.aiBadge")}
              </span>
            )}
            {streak >= 3 && <span className="ml-auto num text-[12px] text-muted">↑ {streak}</span>}
          </div>

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
              selected={selected}
              onSelect={select}
              revealed={isRevealed}
              disabled={isRevealed}
              crossOutMode={crossOutMode}
              crossedOut={crossed[index]}
              onToggleCross={(choice) =>
                setCrossed((list) =>
                  setAt(
                    list,
                    index,
                    list[index].includes(choice)
                      ? list[index].filter((c) => c !== choice)
                      : [...list[index], choice],
                  ),
                )
              }
            />
          </div>

          {isRevealed && (
            <p
              className="fade-in mt-6 text-[14px]"
              style={{ color: selected === question.answer ? "var(--success)" : "var(--danger)" }}
            >
              {selected === question.answer ? t("quiz.correct") : t("quiz.incorrect")}
            </p>
          )}
        </main>
      </div>

      {/* ---------------- footer ---------------- */}
      <footer className="test-foot">
        <span className="hidden sm:block text-[13px] text-muted truncate max-w-[12rem]">
          {title}
        </span>

        <div className="relative mx-auto">
          <button className="btn btn-sm" aria-expanded={navOpen} onClick={() => setNavOpen((v) => !v)}>
            <span className="num">
              {index + 1} {t("quiz.of")} {count}
            </span>
            <IconChevron />
          </button>
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
        </div>

        <div className="flex items-center gap-2">
          <button
            className={`btn btn-sm ${tutorOpen ? "tool-btn-on" : ""}`}
            aria-pressed={tutorOpen}
            onClick={() => setTutorOpen((v) => !v)}
          >
            {t("ptool.askTutor")}
          </button>
          <button className="btn btn-sm" disabled={index === 0} onClick={() => goTo(index - 1)}>
            {t("ptool.previous")}
          </button>
          {!isRevealed ? (
            <button className="btn btn-primary btn-sm" disabled={selected === null} onClick={check}>
              {t("quiz.check")}
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={next}>
              {index + 1 >= count ? t("quiz.finish") : t("ptool.next")}
            </button>
          )}
        </div>
      </footer>

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
