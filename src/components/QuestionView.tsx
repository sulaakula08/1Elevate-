"use client";

import type { Question } from "@/data/types";
import { useI18n } from "@/lib/i18n";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

type Props = {
  question: Question;
  selected: number | null;
  onSelect: (index: number) => void;
  /** In practice/review the correct answer is revealed after checking. */
  revealed?: boolean;
  disabled?: boolean;
};

export function QuestionView({ question, selected, onSelect, revealed, disabled }: Props) {
  const { tx, t } = useI18n();

  /** Border and text carry the state — no fills, no colour blocks. */
  function choiceStyle(index: number): React.CSSProperties {
    const isSelected = selected === index;
    if (!revealed) {
      return isSelected
        ? { borderColor: "var(--foreground)" }
        : { borderColor: "var(--line-strong)" };
    }
    if (index === question.answer) return { borderColor: "var(--success)" };
    if (isSelected) return { borderColor: "var(--danger)" };
    return { borderColor: "var(--line)", opacity: 0.5 };
  }

  function markStyle(index: number): React.CSSProperties {
    const isSelected = selected === index;
    if (revealed && index === question.answer) return { color: "var(--success)" };
    if (revealed && isSelected) return { color: "var(--danger)" };
    if (!revealed && isSelected) return { color: "var(--foreground)" };
    return { color: "var(--faint)" };
  }

  return (
    <div className="space-y-6">
      {question.passage && (
        <blockquote className="pl-4 border-l text-[14px] leading-[1.7] text-muted">
          {tx(question.passage)}
        </blockquote>
      )}

      <p className="text-[17px] leading-[1.6]">{tx(question.prompt)}</p>

      <ul className="space-y-2">
        {question.choices.map((choice, index) => {
          const wrongPick = revealed && selected === index && index !== question.answer;
          return (
            <li key={index}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(index)}
                style={choiceStyle(index)}
                className={`w-full text-left flex gap-3 items-baseline px-4 py-3 rounded-[10px] border transition-colors duration-150 ${
                  disabled ? "cursor-default" : "cursor-pointer hover:border-foreground"
                } ${wrongPick ? "shake" : ""}`}
              >
                <span
                  className="num text-[13px] w-4 shrink-0 transition-colors"
                  style={markStyle(index)}
                >
                  {revealed && index === question.answer
                    ? "✓"
                    : revealed && selected === index
                      ? "✕"
                      : LETTERS[index]}
                </span>
                <span className="text-[15px] leading-relaxed">{tx(choice)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {revealed && (
        <div className="fade-up pt-5 border-t">
          <p className="label-xs">{t("quiz.explanation")}</p>
          <p className="mt-2 text-[15px] leading-[1.7] text-muted">{tx(question.explanation)}</p>
        </div>
      )}
    </div>
  );
}
