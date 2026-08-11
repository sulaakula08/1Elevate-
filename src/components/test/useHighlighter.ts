"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";

/**
 * The test surface's highlighter, built on the CSS Custom Highlight API.
 *
 * The obvious implementations both go wrong here. Wrapping the selection in
 * <mark> puts nodes inside a subtree React owns, and the next render fights over
 * them. Storing character offsets and re-rendering the text in segments avoids
 * that, but the question text goes through RichText — a formula is a tree of
 * elements, not a string — so offsets have nothing stable to count.
 *
 * The Highlight API sidesteps both: the ranges live beside the DOM rather than
 * in it, styled through ::highlight(). React never sees them, and a highlight
 * can span a formula without the renderer knowing it happened.
 */

/** One registry per colour, so each gets its own ::highlight() rule. */
export const HIGHLIGHT_COLORS = ["amber", "green", "blue", "violet"] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

const NAME = (color: HighlightColor) => `sat-hl-${color}`;

/** Not in TypeScript's DOM lib yet; this is the shape actually used below. */
type HighlightRegistry = Map<string, unknown> & { set(name: string, value: unknown): void };
declare const Highlight: { new (...ranges: Range[]): unknown };

function registry(): HighlightRegistry | null {
  if (typeof CSS === "undefined") return null;
  const css = CSS as unknown as { highlights?: HighlightRegistry };
  return css.highlights ?? null;
}

/**
 * ::highlight() rules are injected at runtime rather than written into a
 * stylesheet: the build's CSS parser does not know the pseudo-element and drops
 * the rule on the floor. The CSSOM has no such opinion.
 */
const STYLE_ID = "sat-highlight-style";

function ensureStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = HIGHLIGHT_COLORS.map(
    (c) =>
      `::highlight(${NAME(c)}){background-color:color-mix(in srgb, var(--s-${c}) 42%, transparent);}`,
  ).join("");
  document.head.appendChild(el);
}

type Mark = { range: Range; color: HighlightColor };

/** Does this range cover the caret the click landed on? */
function covers(range: Range, node: Node, offset: number) {
  try {
    return range.isPointInRange(node, offset);
  } catch {
    return false;
  }
}

/** Do these two ranges touch? Ranges in detached trees answer "no" rather than throw. */
function overlaps(a: Range, b: Range) {
  try {
    return (
      a.compareBoundaryPoints(Range.END_TO_START, b) < 0 &&
      a.compareBoundaryPoints(Range.START_TO_END, b) > 0
    );
  } catch {
    return false;
  }
}

export function useHighlighter(
  scope: RefObject<HTMLElement | null>,
  enabled: boolean,
  /** Changing this drops the highlights — one question's marks never leak to the next. */
  resetKey: string,
) {
  const marks = useRef<Mark[]>([]);
  const [count, setCount] = useState(0);
  const [color, setColor] = useState<HighlightColor>("amber");

  const supported = typeof window !== "undefined" && registry() !== null;

  const paint = useCallback(() => {
    const store = registry();
    if (!store) return;
    ensureStyles();
    for (const c of HIGHLIGHT_COLORS) {
      const ranges = marks.current.filter((m) => m.color === c).map((m) => m.range);
      if (ranges.length === 0) store.delete(NAME(c));
      else store.set(NAME(c), new Highlight(...ranges));
    }
    setCount(marks.current.length);
  }, []);

  const clear = useCallback(() => {
    marks.current = [];
    paint();
  }, [paint]);

  // A new question means new text; the old ranges point at nodes that are gone.
  useEffect(() => {
    clear();
    return clear;
  }, [resetKey, clear]);

  useEffect(() => {
    if (!enabled || !supported) return;
    const onUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (!scope.current?.contains(range.commonAncestorContainer)) return;

      // A click inside a mark takes it back off — the same gesture that made it.
      if (selection.isCollapsed) {
        const { startContainer: node, startOffset: offset } = range;
        const hit = marks.current.filter((m) => covers(m.range, node, offset));
        if (hit.length === 0) return;
        marks.current = marks.current.filter((m) => !hit.includes(m));
        paint();
        return;
      }

      // Highlighting over existing marks recolours rather than stacks.
      const next = range.cloneRange();
      marks.current = [...marks.current.filter((m) => !overlaps(m.range, next)), { range: next, color }];
      paint();
      selection.removeAllRanges();
    };
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, [enabled, supported, scope, paint, color]);

  const colors = useMemo(() => HIGHLIGHT_COLORS, []);

  return { supported, clear, count, color, setColor, colors };
}
