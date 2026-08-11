"use client";

import type { useHighlighter } from "./useHighlighter";
import { IconTrash } from "./TestIcons";

const LABELS = {
  amber: "Yellow highlight",
  blue: "Light blue highlight",
  rose: "Pink highlight",
} as const;

export function ContextualHighlightPalette({
  highlighter,
}: {
  highlighter: ReturnType<typeof useHighlighter>;
}) {
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
          className={`test-highlight-color is-${color}`}
          aria-label={LABELS[color]}
          title={LABELS[color]}
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
