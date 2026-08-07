"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

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

const NAME = "sat-highlight";

/** Not in TypeScript's DOM lib yet; this is the shape actually used below. */
type HighlightRegistry = Map<string, unknown> & { set(name: string, value: unknown): void };
declare const Highlight: { new (...ranges: Range[]): unknown };

function registry(): HighlightRegistry | null {
  if (typeof CSS === "undefined") return null;
  const css = CSS as unknown as { highlights?: HighlightRegistry };
  return css.highlights ?? null;
}

export function useHighlighter(
  scope: RefObject<HTMLElement | null>,
  enabled: boolean,
  /** Changing this drops the highlights — one question's marks never leak to the next. */
  resetKey: string,
) {
  const ranges = useRef<Range[]>([]);
  const [count, setCount] = useState(0);

  const supported = typeof window !== "undefined" && registry() !== null;

  const paint = useCallback(() => {
    const store = registry();
    if (!store) return;
    if (ranges.current.length === 0) store.delete(NAME);
    else store.set(NAME, new Highlight(...ranges.current));
    setCount(ranges.current.length);
  }, []);

  const clear = useCallback(() => {
    ranges.current = [];
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
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (!scope.current?.contains(range.commonAncestorContainer)) return;
      ranges.current = [...ranges.current, range.cloneRange()];
      paint();
      selection.removeAllRanges();
    };
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, [enabled, supported, scope, paint]);

  return { supported, clear, count };
}
