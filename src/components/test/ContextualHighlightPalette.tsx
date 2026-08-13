"use client";

import { useI18n } from "@/lib/i18n";
import type { HighlightColor, useHighlighter } from "./useHighlighter";
import { IconTrash } from "./TestIcons";

/**
 * Swatch faces, one per colour.
 *
 * Pastels rather than the `--s-*` tokens themselves: the token is the ink the
 * highlight is mixed from at 42% over text, and a swatch showing the raw token
 * would promise a much stronger mark than the tool draws. The first three are
 * the values the real test app uses; the rest match their weight.
 */
const SWATCH: Record<HighlightColor, string> = {
  amber: "#ffe784",
  green: "#b7e8bd",
  cyan: "#a7e6f0",
  blue: "#a9def7",
  violet: "#d3c4fb",
  rose: "#f8b8cf",
};

export function ContextualHighlightPalette({
  highlighter,
}: {
  highlighter: ReturnType<typeof useHighlighter>;
}) {
  const { t } = useI18n();

  if (!highlighter.selection) return null;

  const { left, top, placement, canRemove } = highlighter.selection;
  return (
    <div
      className={`test-highlight-palette is-${placement}`}
      data-highlight-palette
      role="toolbar"
      aria-label="Highlight selected text"
      style={{ left, top }}
      onPointerDown={(event) => event.preventDefault()}
    >
      {highlighter.colors.map((color) => (
        <button
          key={color}
          type="button"
          className="test-highlight-color"
          style={{ ["--swatch" as string]: SWATCH[color] }}
          aria-label={t(`ptool.color.${color}`)}
          title={t(`ptool.color.${color}`)}
          onClick={() => highlighter.apply(color)}
        />
      ))}
      <span className="test-highlight-separator" aria-hidden />
      <button
        type="button"
        className="test-highlight-remove"
        disabled={!canRemove}
        aria-label="Remove highlight"
        title="Remove highlight"
        onClick={highlighter.removeSelection}
      >
        <IconTrash size={16} />
      </button>
    </div>
  );
}
