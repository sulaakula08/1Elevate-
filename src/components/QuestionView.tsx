"use client";

import type { Question } from "@/data/types";
import { useI18n } from "@/lib/i18n";
import { HighlightableText, type Range } from "./test/HighlightableText";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export type Highlights = { passage: Range[]; prompt: Range[] };

export const NO_HIGHLIGHTS: Highlights = { passage: [], prompt: [] };

type Props = {
  question: Question;
  selected: number | null;
  onSelect: (index: number) => void;
  /** In practice/review the correct answer is revealed after checking. */
  revealed?: boolean;
  disabled?: boolean;
  /** Test tools. All optional — the tutorial renders the plain view. */
  crossedOut?: number[];
  onToggleCross?: (index: number) => void;
  crossOutMode?: boolean;
  highlightMode?: boolean;
  highlights?: Highlights;
  onHighlights?: (next: Highlights) => void;
};

export function QuestionView({
  question,
  selected,
  onSelect,
  revealed,
  disabled,
  crossedOut = [],
  onToggleCross,
  crossOutMode = false,
  highlightMode = false,
  highlights = NO_HIGHLIGHTS,
  onHighlights,
}: Props) {
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
        <HighlightableText
          as="blockquote"
          className="pl-4 border-l text-[14px] leading-[1.7] text-muted"
          text={tx(question.passage)}
          ranges={highlights.passage}
          enabled={highlightMode && !!onHighlights}
          onChange={(ranges) => onHighlights?.({ ...highlights, passage: ranges })}
        />
      )}

      <HighlightableText
        className="text-[17px] leading-[1.6]"
        text={tx(question.prompt)}
        ranges={highlights.prompt}
        enabled={highlightMode && !!onHighlights}
        onChange={(ranges) => onHighlights?.({ ...highlights, prompt: ranges })}
      />

      <ul className="space-y-2">
        {question.choices.map((choice, index) => {
          const wrongPick = revealed && selected === index && index !== question.answer;
          const struck = crossedOut.includes(index);
          return (
            <li key={index} className="flex items-center gap-2">
              <button
                type="button"
                disabled={disabled || (struck && !revealed)}
                onClick={() => onSelect(index)}
                style={choiceStyle(index)}
                className={`flex-1 min-w-0 text-left flex gap-3 items-baseline px-4 py-3 rounded-[10px] border transition-colors duration-150 ${
                  disabled ? "cursor-default" : "cursor-pointer hover:border-foreground"
                } ${wrongPick ? "shake" : ""} ${struck ? "choice-struck" : ""}`}
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

              {/* The eliminator, shown only while the tool is switched on — the
                  same way the real test app reveals it. */}
              {crossOutMode && onToggleCross && !revealed && (
                <button
                  type="button"
                  onClick={() => onToggleCross(index)}
                  aria-pressed={struck}
                  aria-label={`${struck ? t("ptool.undoCross") : t("ptool.crossOut")} ${LETTERS[index]}`}
                  className={`cross-btn ${struck ? "cross-btn-on" : ""}`}
                >
                  {LETTERS[index]}
                </button>
              )}
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
