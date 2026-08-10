"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useI18n } from "@/lib/i18n";
import { IconFlag } from "./TestIcons";

type Props = {
  total: number;
  current: number;
  answered: boolean[];
  marked: boolean[];
  onGo: (index: number) => void;
  onClose: () => void;
};

/**
 * The "3 of 159" popover: the whole section at a glance, so a student can jump
 * back to anything they flagged instead of remembering where it was.
 */
export function QuestionNavigator({ total, current, answered, marked, onGo, onClose }: Props) {
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

      <div className="flex items-center justify-center gap-4 mt-3 pb-3 border-b text-micro text-muted">
        <span className="flex items-center gap-1.5">
          <span className="nav-key nav-key-current" aria-hidden />
          {t("ptool.navCurrent")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="nav-key nav-key-done" aria-hidden />
          {t("ptool.navAnswered")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="nav-key nav-key-todo" aria-hidden />
          {t("ptool.navUnanswered")}
        </span>
      </div>

      <div className="grid grid-cols-8 gap-1.5 mt-3 max-h-[40vh] overflow-y-auto">
        {Array.from({ length: total }, (_, i) => {
          const state = i === current ? "current" : answered[i] ? "done" : "todo";
          return (
            <button
              key={i}
              type="button"
              className={`nav-cell nav-cell-${state}`}
              aria-current={i === current}
              onClick={() => {
                onGo(i);
                onClose();
              }}
            >
              {marked[i] && (
                <IconFlag size={10} filled className="absolute -top-1.5 -right-1 text-[var(--s-orange)]" />
              )}
              {i + 1}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
