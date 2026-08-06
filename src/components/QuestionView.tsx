"use client";

import { useCallback, useEffect } from "react";
import type { Question } from "@/data/types";
import { useI18n } from "@/lib/i18n";
import { RichText } from "@/lib/math/markdown";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

type Props = {
  question: Question;
  selected: number | null;
  onSelect: (index: number) => void;
  /** In practice/review the correct answer is revealed after checking. */
  revealed?: boolean;
  disabled?: boolean;
  /** Number keys pick a choice. Off in the mock report, where nothing is live. */
  keyboard?: boolean;
};

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
}: Props) {
  const { tx, t } = useI18n();

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
        onSelect(index);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [live, count, onSelect]);

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
    <div className="space-y-5">
      {question.passage && (
        <div>
          <p className="label-xs mb-2">{t("study.passage")}</p>
          <blockquote className="q-passage">
            <RichText text={tx(question.passage)} block />
          </blockquote>
        </div>
      )}

      <RichText className="q-prompt" text={tx(question.prompt)} block />

      {/* A radiogroup, not a list of buttons: a screen reader announces "2 of 4
          selected" and arrow keys move between options for free. */}
      <div role="radiogroup" aria-label={t("study.chooseAnswer")} className="space-y-2">
        {question.choices.map((choice, index) => {
          const isSelected = selected === index;
          const wrongPick = revealed && isSelected && index !== question.answer;
          return (
            <button
              key={index}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onSelect(index)}
              className={`${choiceClass(index)} ${wrongPick ? "shake" : ""}`}
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
          );
        })}
      </div>

      {live && !revealed && (
        <p className="text-[12px] text-faint">{t("study.keyHint")}</p>
      )}

      {revealed && (
        <div className="fade-up pt-5 border-t">
          <p className="label-xs">{t("quiz.explanation")}</p>
          <RichText
            className="mt-2.5 text-[15px] text-muted"
            text={tx(question.explanation)}
            block
          />
        </div>
      )}
    </div>
  );
}
