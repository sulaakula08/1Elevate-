"use client";

import { useEffect, useState } from "react";
import {
  LOOP_MISS_CHOICE,
  LOOP_MISS_QUESTION,
  LOOP_NEXT_QUESTION,
  LOOP_PROGRESS_EXAMPLE,
} from "@/data/landing-sample";
import { getSubject } from "@/data/exams";
import { useI18n } from "@/lib/i18n";
import { ProgressBar } from "../motion";
import { QuestionView } from "../QuestionView";
import { useCountTo } from "./scroll";

/**
 * The product surface the learning loop runs inside. One frame, five states.
 *
 * The important structural decision is that the chrome never changes: the same
 * status bar, the same body box, the same footer strip, from the first step to
 * the last. Everything that moves, moves *inside* it. A section that swapped one
 * card for another at each step would be a slideshow with a scrollbar; holding
 * the frame still is what makes five separate mechanics read as one place a
 * student works.
 *
 * All four layers stay mounted and are moved with transform and opacity — no
 * layer is conditionally rendered, no height is animated, and nothing here
 * triggers layout while scrolling. State transitions therefore run on the
 * compositor, and scrolling back up plays them in reverse for free.
 *
 * Nothing in the frame is interactive. Every choice is `disabled`, so a keyboard
 * user cannot tab into a control that looks live and does nothing; the hero, one
 * screen up, is where a visitor actually answers a question.
 */

/** The five states, in the order the section walks through them. */
export const LOOP_STEPS = [
  { title: "lp.step1Title", text: "lp.step1Text" },
  { title: "lp.step2Title", text: "lp.step2Text" },
  { title: "lp.step3Title", text: "lp.step3Text" },
  { title: "lp.step4Title", text: "lp.step4Text" },
  { title: "lp.step5Title", text: "lp.step5Text" },
] as const;

export const LOOP_STAGE_COUNT = LOOP_STEPS.length;

/** Delay before the frame picks its answer, once the section is on screen. */
const PICK_DELAY = 620;
/** Delay before the harder sibling resolves to correct, on step four. */
const RESOLVE_DELAY = 980;

const pct = (correct: number, total: number) => Math.round((correct / total) * 100);

export function LoopFrame({
  stage,
  active,
  reduced,
}: {
  stage: number;
  /** True once the composition has been scrolled into view. Gates the timers. */
  active: boolean;
  reduced: boolean;
}) {
  const { t, tx } = useI18n();

  /*
   * Two beats the frame performs on its own rather than on scroll position.
   *
   * The answer being *picked* has to be seen happening — a choice that is
   * already selected when the section arrives is a screenshot, and a choice that
   * fills in half a second later is a student. Same argument for the harder
   * question resolving to correct on step four: the green tick is the payoff of
   * the whole section and it has to land after the question, not with it.
   *
   * Both are stored as "has this happened" rather than as booleans reset by
   * stage, so scrolling back up and down again does not replay them.
   */
  const [picked, setPicked] = useState(false);
  const [resolved, setResolved] = useState(false);

  /*
   * `reduced` decides the *delay*, never the rendered output.
   *
   * This is the one place that distinction has teeth. `useReducedMotion()`
   * returns null on the server and the real answer on the client's very first
   * render, so `reduced ? A : B` inside the markup renders two different trees
   * and React reports a hydration mismatch — which is exactly what an earlier
   * version of `answerShown = reduced || picked` did: a reader with reduced
   * motion got a server-rendered unanswered question hydrating against an
   * answered one.
   *
   * Keeping it in the timers means the reduced-motion path skips the wait rather
   * than skipping the render: the choice is filled in on mount instead of after
   * 620ms, and both sides of hydration agree that it starts empty.
   */
  useEffect(() => {
    if (!active || picked) return;
    const id = window.setTimeout(() => setPicked(true), reduced ? 0 : PICK_DELAY);
    return () => window.clearTimeout(id);
  }, [active, picked, reduced]);

  useEffect(() => {
    if (stage < 3 || resolved) return;
    const id = window.setTimeout(() => setResolved(true), reduced ? 0 : RESOLVE_DELAY);
    return () => window.clearTimeout(id);
  }, [stage, resolved, reduced]);

  const answerShown = picked || stage > 0;
  const nextResolved = resolved;

  /* ---- what the chrome says at this stage ---- */
  const mode =
    stage >= 4 ? t("lp.frameModeProgress") : stage >= 3 ? t("lp.frameModeReview") : t("lp.frameMode");
  const level = stage >= 3 ? LOOP_NEXT_QUESTION.difficulty : LOOP_MISS_QUESTION.difficulty;

  /* ---- the worked example, and the numbers it animates ---- */
  const example = LOOP_PROGRESS_EXAMPLE;
  const before = pct(example.before.correct, example.before.total);
  const after = pct(example.after.correct, example.after.total);
  const neighbour = pct(example.neighbour.correct, example.neighbour.total);
  const onProgress = stage >= 4;

  const accuracy = useCountTo(after, onProgress, {
    from: before,
    duration: reduced ? 0 : 900,
  });
  // Weakest first, which is how `weakTopics()` orders the real list. The loop's
  // skill starts below the neighbour and ends above it — that reordering is the
  // whole point of the last step, and it is why the flag moves.
  const flagRow = onProgress && after > neighbour ? 1 : 0;

  const queue =
    stage >= 4 ? example.queueAfter : stage >= 2 ? example.queuePeak : example.queueBefore;

  const foot = [
    { label: t("lp.frameSelected"), text: t("lp.frameFoot0") },
    { label: t("lp.frameSlip"), text: t("lp.frameSlipText") },
    /* Not the queue rule again — the sheet on screen is already stating it, and
       the same sentence twice in one frame reads as a template. */
    { label: t("lp.frameQueued"), text: t("lp.frameFoot2") },
    { label: t("lp.frameModeReview"), text: t("lp.frameFoot3") },
    { label: t("lp.frameMastered"), text: t("lp.frameFoot4") },
  ][stage] ?? { label: "", text: "" };

  const subject = getSubject(LOOP_MISS_QUESTION.subjectId);

  return (
    /*
     * A labelled group rather than an image, and every layer that is not on
     * screen is hidden from the accessibility tree.
     *
     * All five states are in the DOM at once, so without the per-layer
     * `aria-hidden` a screen reader would read two questions, a queue entry and
     * a progress list as one continuous block of text at every step. With it,
     * what is announced is what is drawn.
     */
    <div className="lp-fr" data-stage={stage} role="group" aria-label={t("lp.loopViewport")}>
      {/* ---------------- chrome ---------------- */}
      <header className="lp-fr-bar">
        <span className="lp-fr-context">
          <span className="lp-fr-dot" aria-hidden />
          <span>{subject ? tx(subject.name) : LOOP_MISS_QUESTION.domain}</span>
          <span aria-hidden>·</span>
          {/* Keyed so the label crossfades when the mode changes rather than
              swapping a glyph at a time. */}
          <span key={mode} className="lp-fr-mode">
            {mode}
          </span>
        </span>
        <span className="lp-fr-meta">
          <span>{LOOP_MISS_QUESTION.domain}</span>
          <span aria-hidden>·</span>
          <span key={level} className="lp-fr-level" data-level={level}>
            {t(`diff.${level}`)}
          </span>
        </span>
      </header>

      {/* ---------------- the four layers ---------------- */}
      <div className="lp-fr-body">
        {/* 1 — the miss. Present from the first step and pushed left when its
               replacement arrives, so the two questions read as a sequence in
               one place rather than as two cards. */}
        <div
          className="lp-fr-layer lp-fr-q"
          data-out={stage >= 3 ? "" : undefined}
          aria-hidden={stage >= 2}
        >
          {/* Skill only. The bar above already carries the domain and the
              difficulty, and printing "Algebra" twice in one frame is the kind of
              repetition that makes a product screen look unfinished. */}
          <p className="lp-fr-skill">
            <span>{LOOP_MISS_QUESTION.skill}</span>
          </p>
          <QuestionView
            question={LOOP_MISS_QUESTION}
            selected={answerShown ? LOOP_MISS_CHOICE : null}
            onSelect={() => {}}
            revealed={stage >= 1}
            showExplanation={stage >= 1}
            disabled
            keyboard={false}
            showPassage={false}
          />
        </div>

        {/* 2 — the sibling the queue serves next. */}
        <div
          className="lp-fr-layer lp-fr-q lp-fr-q-next"
          data-in={stage >= 3 ? "" : undefined}
          aria-hidden={stage !== 3}
        >
          <p className="lp-fr-skill">
            <span>{LOOP_NEXT_QUESTION.skill}</span>
            <span className="lp-fr-chip">
              {t("lp.frameSameSkill")} · {t("lp.frameOneUp")}
            </span>
          </p>
          <QuestionView
            question={LOOP_NEXT_QUESTION}
            selected={stage >= 3 && nextResolved ? LOOP_NEXT_QUESTION.answer : null}
            onSelect={() => {}}
            revealed={stage >= 3 && nextResolved}
            showExplanation={false}
            disabled
            keyboard={false}
            showPassage={false}
          />
        </div>

        {/* 3 — the review sheet. Rises over the question it came from, which is
               the literal claim being made: the miss is now a queue entry. */}
        <div
          className="lp-fr-layer lp-fr-review"
          data-on={stage === 2 ? "" : undefined}
          aria-hidden={stage !== 2}
        >
          <div className="lp-fr-review-head">
            <p className="t-label">{t("review.title")}</p>
            <p className="lp-fr-review-skill">{LOOP_MISS_QUESTION.skill}</p>
            <p className="lp-fr-review-tally num">
              <span>1 {t("review.timesWrong")}</span>
              <span aria-hidden>·</span>
              <span>0 {t("review.timesRight")}</span>
              <span className="lp-fr-review-level" data-level={LOOP_MISS_QUESTION.difficulty}>
                {t(`diff.${LOOP_MISS_QUESTION.difficulty}`)}
              </span>
            </p>
          </div>
          <p className="lp-fr-review-rule">{t("lp.frameQueueRule")}</p>
        </div>

        {/* 4 — the progress surface. The only layer that covers the frame
               completely: by the last step the question is history and what is
               left is what the product now knows. */}
        <div
          className="lp-fr-layer lp-fr-progress"
          data-on={stage >= 4 ? "" : undefined}
          aria-hidden={stage < 4}
        >
          <p className="t-label">{t("lp.frameFocusTitle")}</p>
          <p className="lp-fr-hint">{t("lp.frameFocusHint")}</p>

          <div className="lp-fr-focus">
            {/* One flag, moved. Two flags fading in and out of each other would
                say "another thing is also true"; one flag travelling says the
                weakest skill changed, which is what happened. */}
            <span
              className="lp-fr-flag"
              style={{ ["--row" as string]: flagRow }}
              aria-hidden={!onProgress}
            >
              {t("lp.frameNextFlag")}
            </span>

            <ul>
              {/* The loop's own skill. The only row whose numbers move. */}
              <li>
                <span className="lp-fr-focus-name">{example.skill}</span>
                <span className="lp-fr-focus-pct num">{accuracy}%</span>
                <ProgressBar
                  value={(onProgress ? after : before) / 100}
                  tone={(onProgress ? after : before) < 50 ? "danger" : "accent"}
                  className="lp-fr-focus-rule"
                />
                <span className="lp-fr-focus-count num">
                  {onProgress ? example.after.correct : example.before.correct}/
                  {onProgress ? example.after.total : example.before.total}
                </span>
              </li>
              {[example.neighbour, example.third].map((row) => {
                const value = pct(row.correct, row.total);
                return (
                  <li key={row.skill}>
                    <span className="lp-fr-focus-name">{row.skill}</span>
                    <span className="lp-fr-focus-pct num">{value}%</span>
                    <ProgressBar
                      value={value / 100}
                      tone={value < 50 ? "danger" : "accent"}
                      className="lp-fr-focus-rule"
                    />
                    <span className="lp-fr-focus-count num">
                      {row.correct}/{row.total}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* What is below the fold of the frame. `weakTopics()` lists every
              skill under 80%, and this is the rest of them. */}
          <p className="lp-fr-more">
            {example.moreSkills} {t("lp.frameFocusMore")}
          </p>
        </div>
      </div>

      {/* ---------------- footer ----------------
          Interface text, not narration: the step copy beside the frame explains
          what is happening, so this says what the product would say. */}
      <footer className="lp-fr-foot">
        <div className="lp-fr-foot-copy">
          <p className="t-label" key={foot.label}>
            {foot.label}
          </p>
          <p className="lp-fr-foot-text" key={foot.text}>
            {foot.text}
          </p>
        </div>

        {stage === 0 ? (
          /* The real control, drawn rather than rendered: a live button here
             would be a promise the frame cannot keep. */
          <span className="btn btn-primary btn-sm lp-fr-action" aria-hidden>
            {t("lp.frameCheck")}
          </span>
        ) : (
          <span className="lp-fr-queue">
            <span className="lp-fr-queue-value num" key={queue}>
              {queue}
            </span>
            <span className="lp-fr-queue-label">{t("lp.frameQueueCount")}</span>
          </span>
        )}
      </footer>
    </div>
  );
}
