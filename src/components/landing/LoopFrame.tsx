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
 * The product surface the learning loop runs inside. One frame, six states.
 *
 * The important structural decision is that the chrome never changes: the same
 * status bar, the same body box, the same footer strip, from the first step to
 * the last. Everything that moves, moves *inside* it. A section that swapped one
 * card for another at each step would be a slideshow with a scrollbar; holding
 * the frame still is what makes six separate mechanics read as one place a
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

/**
 * The six states, in the order the section walks through them.
 *
 * "Ask" sits third for a reason: it is what a student does *after* reading the
 * explanation and still not seeing it, and before the question goes anywhere
 * near a queue. Putting it at the end would have made the tutor a feature the
 * page mentions; putting it here makes it the move the loop actually contains.
 */
export const LOOP_STEPS = [
  { title: "lp.step1Title", text: "lp.step1Text" },
  { title: "lp.step2Title", text: "lp.step2Text" },
  { title: "lp.stepAskTitle", text: "lp.stepAskText" },
  { title: "lp.step3Title", text: "lp.step3Text" },
  { title: "lp.step4Title", text: "lp.step4Text" },
  { title: "lp.step5Title", text: "lp.step5Text" },
] as const;

/** The stage the tutor exchange plays on. */
const ASK_STAGE = 2;

export const LOOP_STAGE_COUNT = LOOP_STEPS.length;

/** Delay before the frame picks its answer, once the section is on screen. */
const PICK_DELAY = 620;
/** Delay before the harder sibling resolves to correct, on step four. */
const RESOLVE_DELAY = 980;

const pct = (correct: number, total: number) => Math.round((correct / total) * 100);

/**
 * Reveals a string a character at a time while `on` is true.
 *
 * Deliberately a character count in state rather than a string: the text is
 * fixed and only the cursor moves, so there is nothing to build on each tick.
 * `reduced` skips to the end instead of animating — the reader still gets the
 * exchange, just already written.
 *
 * Resetting to zero when `on` goes false is what makes the step replayable: the
 * question is asked again each time the section is scrolled back through, which
 * is the behaviour you want from a demonstration and the wrong one from a log.
 */
function useTyped(text: string, on: boolean, speed: number, reduced: boolean) {
  const [count, setCount] = useState(0);

  /* The rewind happens during render, not in an effect. Resetting the count
     from inside the effect works, but it is a second render triggered by the
     first, and React would rather the state that depends on a prop be adjusted
     while the prop is being read — see "adjusting state when a prop changes".
     A reader with reduced motion lands on the finished text the same way. */
  const [was, setWas] = useState(on);
  if (was !== on) {
    setWas(on);
    setCount(on && reduced ? text.length : 0);
  }

  useEffect(() => {
    if (!on || reduced) return;
    let shown = 0;
    const id = window.setInterval(() => {
      shown += 1;
      setCount(shown);
      if (shown >= text.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [on, text, speed, reduced]);

  return { shown: text.slice(0, count), done: count >= text.length };
}

/** Typing speeds, in ms per character. A person types; a model streams. */
const TYPE_ASK = 42;
const TYPE_REPLY = 12;
/** How long Elevate appears to think before it starts answering. */
const THINK_DELAY = 700;

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
    if (stage < 4 || resolved) return;
    const id = window.setTimeout(() => setResolved(true), reduced ? 0 : RESOLVE_DELAY);
    return () => window.clearTimeout(id);
  }, [stage, resolved, reduced]);

  /* ---- the tutor exchange ---- */
  const askText = t("lp.frameAskText");
  const replyText = t("lp.frameTutorReply");
  const asking = stage === ASK_STAGE && active;
  const ask = useTyped(askText, asking, TYPE_ASK, reduced);

  // The reply waits for the question to finish being typed, then for a beat of
  // thinking. Without the beat the two run together and it reads as one machine
  // writing both halves, which is the opposite of the point.
  const thinking = asking && ask.done;
  const [answering, setAnswering] = useState(false);
  const [wasThinking, setWasThinking] = useState(thinking);
  if (wasThinking !== thinking) {
    setWasThinking(thinking);
    if (!thinking) setAnswering(false);
  }
  useEffect(() => {
    if (!thinking) return;
    const id = window.setTimeout(() => setAnswering(true), reduced ? 0 : THINK_DELAY);
    return () => window.clearTimeout(id);
  }, [thinking, reduced]);
  const reply = useTyped(replyText, answering, TYPE_REPLY, reduced);

  const answerShown = picked || stage > 0;
  const nextResolved = resolved;

  /* ---- what the chrome says at this stage ---- */
  const mode =
    stage >= 5
      ? t("lp.frameModeProgress")
      : stage >= 4
        ? t("lp.frameModeReview")
        : stage === ASK_STAGE
          ? t("lp.frameModeTutor")
          : t("lp.frameMode");
  const level = stage >= 4 ? LOOP_NEXT_QUESTION.difficulty : LOOP_MISS_QUESTION.difficulty;

  /* ---- the worked example, and the numbers it animates ---- */
  const example = LOOP_PROGRESS_EXAMPLE;
  const before = pct(example.before.correct, example.before.total);
  const after = pct(example.after.correct, example.after.total);
  const neighbour = pct(example.neighbour.correct, example.neighbour.total);
  const onProgress = stage >= 5;

  const accuracy = useCountTo(after, onProgress, {
    from: before,
    duration: reduced ? 0 : 900,
  });
  // Weakest first, which is how `weakTopics()` orders the real list. The loop's
  // skill starts below the neighbour and ends above it — that reordering is the
  // whole point of the last step, and it is why the flag moves.
  const flagRow = onProgress && after > neighbour ? 1 : 0;

  const queue =
    stage >= 5 ? example.queueAfter : stage >= 3 ? example.queuePeak : example.queueBefore;

  const foot = [
    { label: t("lp.frameSelected"), text: t("lp.frameFoot0") },
    { label: t("lp.frameSlip"), text: t("lp.frameSlipText") },
    { label: t("lp.frameTutorName"), text: t("lp.frameFootAsk") },
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
     * All six states are in the DOM at once, so without the per-layer
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
        {/*
          Domain and difficulty describe *a question*, and by step five there is
          no longer one on screen — the layer underneath is a multi-skill
          dashboard. Showing "Algebra · Hard" next to it claimed a difficulty for
          a screen that has none, which read as a label nobody updated to match
          what is actually on screen. Rather than invent a replacement fact that
          duplicates the queue count already stated in the footer, the slot is
          simply empty here: "Math · Progress" on the left is enough context for
          a dashboard, the way the real Progress page carries no badge either.
        */}
        {stage < 5 && (
          <span className="lp-fr-meta">
            <span>{LOOP_MISS_QUESTION.domain}</span>
            <span aria-hidden>·</span>
            <span key={level} className="lp-fr-level" data-level={level}>
              {t(`diff.${level}`)}
            </span>
          </span>
        )}
      </header>

      {/* ---------------- the four layers ---------------- */}
      <div className="lp-fr-body">
        {/* 1 — the miss. Present from the first step and pushed left when its
               replacement arrives, so the two questions read as a sequence in
               one place rather than as two cards. */}
        <div
          className="lp-fr-layer lp-fr-q"
          data-out={stage >= 4 ? "" : undefined}
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
          data-in={stage >= 4 ? "" : undefined}
          aria-hidden={stage !== 4}
        >
          <p className="lp-fr-skill">
            <span>{LOOP_NEXT_QUESTION.skill}</span>
            <span className="lp-fr-chip">
              {t("lp.frameSameSkill")} · {t("lp.frameOneUp")}
            </span>
          </p>
          <QuestionView
            question={LOOP_NEXT_QUESTION}
            selected={stage >= 4 && nextResolved ? LOOP_NEXT_QUESTION.answer : null}
            onSelect={() => {}}
            revealed={stage >= 4 && nextResolved}
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
          data-on={stage === 3 ? "" : undefined}
          aria-hidden={stage !== 3}
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

        {/* 4 — the tutor. Slides up over the explained question, because that is
               where the conversation is about: the sheet is anchored to the item
               on screen and says so by covering it rather than replacing it. */}
        <div
          className="lp-fr-ask"
          data-on={stage === ASK_STAGE ? "" : undefined}
          aria-hidden={stage !== ASK_STAGE}
        >
          <div className="lp-fr-ask-head">
            <span className="lp-fr-ask-avatar" aria-hidden>
              ✦
            </span>
            <p>
              <strong>{t("lp.frameTutorName")}</strong>
              <span>{t("lp.frameTutorRole")}</span>
            </p>
          </div>

          <div className="lp-fr-ask-thread">
            {/* The student's message, typed. The caret rides the end of the text
                until the question is finished. */}
            <p className="lp-fr-ask-you" data-typing={!ask.done ? "" : undefined}>
              {ask.shown}
            </p>

            {/* Thinking, then the answer. Three dots for the wait, so the pause
                is legible as the model working rather than as a stall. */}
            {asking && ask.done && !answering && (
              <p className="lp-fr-ask-wait" aria-hidden>
                <span />
                <span />
                <span />
              </p>
            )}
            {answering && (
              <p className="lp-fr-ask-reply" data-typing={!reply.done ? "" : undefined}>
                {reply.shown}
              </p>
            )}
          </div>

          <p className="lp-fr-ask-foot">
            <span className="lp-fr-ask-field">{t("lp.frameAskHint")}</span>
          </p>
        </div>

        {/* 5 — the progress surface. The only layer that covers the frame
               completely: by the last step the question is history and what is
               left is what the product now knows. */}
        <div
          className="lp-fr-layer lp-fr-progress"
          data-on={stage >= 5 ? "" : undefined}
          aria-hidden={stage < 5}
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
