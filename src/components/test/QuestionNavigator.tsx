"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useI18n } from "@/lib/i18n";
import { IconFlag } from "./TestIcons";

type Props = {
  total: number;
  current: number;
  selected: boolean[];
  outcomes: ("correct" | "incorrect" | null)[];
  marked: boolean[];
  onGo: (index: number) => void;
  onClose: () => void;
};

/**
 * The "3 of 159" popover: the whole section at a glance, so a student can jump
 * back to anything they flagged instead of remembering where it was.
 */
export function QuestionNavigator({
  total,
  current,
  selected,
  outcomes,
  marked,
  onGo,
  onClose,
}: Props) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-label={t("ptool.navTitle")}
      className="panel absolute bottom-full mb-2 left-0 w-[min(24rem,calc(100vw-2rem))] p-4"
      /* Anchored at the bottom-left, because that is where the button that
         opened it is — a popover that grows from anywhere else reads as an
         unrelated thing appearing. */
      style={{ transformOrigin: "bottom left", boxShadow: "var(--overlay)" }}
      initial={{ opacity: 0, scale: 0.94, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 4 }}
      transition={{ duration: 0.16, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <p className="text-sm font-medium text-center">{t("ptool.navTitle")}</p>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-3 pb-3 border-b text-micro text-muted">
        <span className="flex items-center gap-1.5">
          <span className="nav-key nav-key-current" aria-hidden />
          {t("ptool.navCurrent")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="nav-key nav-key-correct" aria-hidden>✓</span>
          Correct
        </span>
        <span className="flex items-center gap-1.5">
          <span className="nav-key nav-key-incorrect" aria-hidden>×</span>
          Incorrect
        </span>
        <span className="flex items-center gap-1.5">
          <span className="nav-key nav-key-selected" aria-hidden />
          Selected
        </span>
      </div>

      <div className="grid grid-cols-8 gap-1.5 mt-3 max-h-[40vh] overflow-y-auto">
        {Array.from({ length: total }, (_, i) => {
          const outcome = outcomes[i];
          const states = [
            i === current ? "nav-cell-current" : "",
            selected[i] && !outcome ? "nav-cell-selected" : "",
            outcome === "correct" ? "nav-cell-correct" : "",
            outcome === "incorrect" ? "nav-cell-incorrect" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const description = [
            `Question ${i + 1}`,
            i === current ? "current" : "",
            outcome ?? (selected[i] ? "answer selected" : "not answered"),
            marked[i] ? "marked for review" : "",
          ]
            .filter(Boolean)
            .join(", ");
          return (
            <button
              key={i}
              type="button"
              className={`nav-cell ${states}`}
              aria-current={i === current ? "step" : undefined}
              aria-label={description}
              onClick={() => {
                onGo(i);
                onClose();
              }}
            >
              {marked[i] && (
                <IconFlag size={10} filled className="absolute -top-1.5 -right-1 text-[var(--s-orange)]" />
              )}
              <span>{i + 1}</span>
              {outcome && (
                <span className="nav-cell-outcome" aria-hidden>
                  {outcome === "correct" ? "✓" : "×"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
