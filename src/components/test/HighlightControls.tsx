"use client";

import { useI18n } from "@/lib/i18n";
import type { useHighlighter } from "./useHighlighter";

/**
 * The line under the toolbar while the highlighter is on: what the tool does,
 * which colour it draws in, and the way out. Both runners show the same one.
 */
export function HighlightControls({
  highlighter,
}: {
  highlighter: ReturnType<typeof useHighlighter>;
}) {
  const { t } = useI18n();

  return (
    <p className="mt-3 text-micro text-faint fade-in flex flex-wrap items-center gap-x-3 gap-y-2">
      <span>{t("ptool.highlightHint")}</span>

      <span className="hl-swatches" role="radiogroup" aria-label={t("ptool.highlightColor")}>
        {highlighter.colors.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={highlighter.color === c}
            aria-label={t(`ptool.color.${c}`)}
            title={t(`ptool.color.${c}`)}
            className={`hl-swatch ${highlighter.color === c ? "hl-swatch-on" : ""}`}
            style={{ ["--swatch" as string]: `var(--hl-${c})` }}
            onClick={() => highlighter.setColor(c)}
          />
        ))}
      </span>

      {highlighter.count > 0 && (
        <button className="underline" onClick={highlighter.clear}>
          {t("ptool.clearHighlights")}
        </button>
      )}
    </p>
  );
}
