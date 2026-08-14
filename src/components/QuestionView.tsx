"use client";

import { useCallback, useEffect } from "react";
import type { Question } from "@/data/types";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { RichText } from "@/lib/math/markdown";

/** Choice labels. Exported so anything naming a student's answer — the Ask
 *  Community prefill, for one — uses the same letters the player showed them. */
export const LETTERS = ["A", "B", "C", "D", "E", "F"];

type Props = {
  question: Question;
  selected: number | null;
  onSelect: (index: number) => void;
  /** In practice/review the correct answer is revealed after checking. */
  revealed?: boolean;
  disabled?: boolean;
  /** Number keys pick a choice. Off in the mock report, where nothing is live. */
  keyboard?: boolean;
  /**
   * Answer eliminator, as the real test app has it: the student rules a choice
   * out and it stops being selectable. Only rendered when the tool is on.
   */
  crossOutMode?: boolean;
  crossedOut?: number[];
  onToggleCross?: (index: number) => void;
  /** Passage can live in the runner's reading pane on wide exam layouts. */
  showPassage?: boolean;
  /** Gives the dedicated test surface its reading-focused visual treatment. */
  variant?: "default" | "exam";
  /** Primary practice action, rendered visually inside the selected answer. */
  inlineAction?: "check" | "explain" | null;
  onInlineAction?: () => void;
  /** Lets practice reveal correctness before the explanation is requested. */
  showExplanation?: boolean;
};

/**
 * A question's figure.
 *
 * Zoomable by opening it in a new tab rather than with a lightbox of our own: a
 * student on a small screen needs the browser's pinch and pan, which no modal we
 * write would match, and a figure is the one thing in a question worth leaving
 * the page for.
 */
export function QuestionFigureView({ question }: { question: Question }) {
  const figure = question.figure;
  if (!figure?.src) return null;

  return (
    <figure className="q-figure">
      {/* eslint-disable-next-line @next/next/no-img-element --
          next/image cannot serve these. A figure's URL is whatever an admin
          attached — our storage bucket, or a host they pasted — and next/image
          refuses any remote host not listed in next.config, which would turn a
          pasted figure into a broken question. Nothing is lost: these are already
          shrunk to 1400px on upload and loaded lazily. */}
      <img src={figure.src} alt={figure.alt} loading="lazy" />
      {/* The description is not repeated on screen — it is the alt text, for
          anyone who cannot see the image. Sighted students have the image. */}
    </figure>
  );
}

export function QuestionPassage({
  question,
  labelled = true,
}: {
  question: Question;
  labelled?: boolean;
}) {
  const { tx, t } = useI18n();
  // A figure is a stimulus in its own right: a question can have one with no
  // passage at all, which is most of Problem-Solving and Data Analysis.
  if (!question.passage && !question.figure) return null;

  return (
    <div className="q-passage-wrap">
      {labelled && question.passage && <p className="label-xs mb-2">{t("study.passage")}</p>}
      <QuestionFigureView question={question} />
      {question.passage && (
        <blockquote className="q-passage">
          <RichText text={tx(question.passage)} block />
        </blockquote>
      )}
    </div>
  );
}

/**
 * One question, its choices, and — once checked — its explanation.
 *
 * Every piece of text goes through RichText, so a formula written in the bank
 * renders as a formula rather than as raw notation. The bank is authored in
 * plain prose today, which the renderer passes through untouched; questions
 * that do carry notation get it laid out without anyone re-authoring the rest.
 */
export function QuestionView({
  question,
  selected,
  onSelect,
  revealed,
  disabled,
  keyboard = true,
  crossOutMode = false,
  crossedOut = [],
  onToggleCross,
  showPassage = true,
  variant = "default",
  inlineAction = null,
  onInlineAction,
  showExplanation = revealed,
}: Props) {
  const { tx, t } = useI18n();
  const { settings } = useSettings();

  const live = keyboard && !disabled;
  const count = question.choices.length;

  // 1–4 selects. Ignored while the student is typing, so the tutor's input and
  // any future free-response field keep their digits.
  useEffect(() => {
    if (!live) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < count) {
        event.preventDefault();
        if (!crossedOut.includes(index)) onSelect(index);
      } else if (event.key === "Enter" && inlineAction === "check" && onInlineAction) {
        event.preventDefault();
        onInlineAction();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // Rebinding when the ruled-out set changes is cheap, and it keeps the
    // handler reading current state rather than a stale closure.
  }, [live, count, onSelect, crossedOut, inlineAction, onInlineAction]);

  /** State lives on one class, so a choice can never be two states at once. */
  const choiceClass = useCallback(
    (index: number) => {
      if (!revealed) return selected === index ? "q-choice q-choice-on" : "q-choice";
      if (index === question.answer) return "q-choice q-choice-right";
      if (selected === index) return "q-choice q-choice-wrong";
      return "q-choice q-choice-mute";
    },
    [revealed, selected, question.answer],
  );

  return (
    <div className={`q-view ${variant === "exam" ? "q-view-exam" : "space-y-5"}`}>
      {showPassage && <QuestionPassage question={question} />}

      {/* When the passage pane is showing, it already carries the figure. */}
      {!showPassage && <QuestionFigureView question={question} />}

      <RichText className="q-prompt" text={tx(question.prompt)} block />

      {/* A radiogroup, not a list of buttons: a screen reader announces "2 of 4
          selected" and arrow keys move between options for free. */}
      <div
        role="radiogroup"
        aria-label={t("study.chooseAnswer")}
        className={variant === "exam" ? "q-answer-list" : "space-y-2"}
      >
        {question.choices.map((choice, index) => {
          const isSelected = selected === index;
          const wrongPick = revealed && isSelected && index !== question.answer;
          const struck = crossedOut.includes(index);
          const showCross = crossOutMode && !revealed && Boolean(onToggleCross);
          const showInlineAction = isSelected && Boolean(inlineAction && onInlineAction);
          return (
            <div
              key={index}
              className={`q-choice-row ${showCross ? "has-cross-control" : ""}`}
            >
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={disabled || struck}
                onClick={() => onSelect(index)}
                className={`${choiceClass(index)} ${wrongPick ? "shake" : ""} ${
                  struck ? "q-choice-struck" : ""
                } ${showInlineAction ? "q-choice-has-action" : ""}`}
              >
                <span className="q-mark" aria-hidden>
                  {revealed && index === question.answer
                    ? "✓"
                    : revealed && isSelected
                      ? "✕"
                      : LETTERS[index]}
                </span>
                <RichText className="q-text" text={tx(choice)} />
              </button>

              {showInlineAction && (
                <button
                  type="button"
                  className={`q-inline-action ${inlineAction === "explain" ? "is-explain" : ""}`}
                  onClick={onInlineAction}
                >
                  {inlineAction === "explain" ? "Explain" : "Check"}
                </button>
              )}

              {showCross && (
                <button
                  type="button"
                  onClick={() => onToggleCross?.(index)}
                  aria-pressed={struck}
                  aria-label={`${struck ? t("ptool.undoCross") : t("ptool.crossOut")} ${LETTERS[index]}`}
                  className={struck ? "cross-undo" : "cross-btn"}
                >
                  {struck ? "Undo" : LETTERS[index]}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {live && !revealed && settings.showHints && (
        <p className="text-micro text-faint">{t("study.keyHint")}</p>
      )}

      {revealed && showExplanation && (
        <div className="q-explanation fade-up pt-5 border-t">
          <p className="label-xs">{t("quiz.explanation")}</p>
          <RichText
            className="mt-2.5 text-body text-muted"
            text={tx(question.explanation)}
            block
          />
        </div>
      )}
    </div>
  );
}
