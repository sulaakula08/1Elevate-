"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";

/**
 * Highlights live beside the React tree through the CSS Custom Highlight API.
 * The practice runner can request a contextual workflow; the mock runner keeps
 * the original immediate-highlight behaviour.
 */

export const HIGHLIGHT_COLORS = ["amber", "blue", "rose"] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export type HighlightSelection = {
  left: number;
  top: number;
  placement: "above" | "below";
  canRemove: boolean;
};

const NAME = (color: HighlightColor) => `sat-hl-${color}`;

type HighlightRegistry = Map<string, unknown> & { set(name: string, value: unknown): void };
declare const Highlight: { new (...ranges: Range[]): unknown };

function registry(): HighlightRegistry | null {
  if (typeof CSS === "undefined") return null;
  const css = CSS as unknown as { highlights?: HighlightRegistry };
  return css.highlights ?? null;
}

const STYLE_ID = "sat-highlight-style";

function ensureStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = HIGHLIGHT_COLORS.map(
    (color) =>
      `::highlight(${NAME(color)}){background-color:color-mix(in srgb, var(--s-${color}) 42%, transparent);}`,
  ).join("");
  document.head.appendChild(el);
}

type Mark = { range: Range; color: HighlightColor };

function covers(range: Range, node: Node, offset: number) {
  try {
    return range.isPointInRange(node, offset);
  } catch {
    return false;
  }
}

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
  resetKey: string,
  options: { contextual?: boolean } = {},
) {
  const marks = useRef<Mark[]>([]);
  const pendingRange = useRef<Range | null>(null);
  const [count, setCount] = useState(0);
  const [color, setColor] = useState<HighlightColor>("amber");
  const [selection, setSelection] = useState<HighlightSelection | null>(null);

  const supported = typeof window !== "undefined" && registry() !== null;

  const paint = useCallback(() => {
    const store = registry();
    if (!store) return;
    ensureStyles();
    for (const nextColor of HIGHLIGHT_COLORS) {
      const ranges = marks.current
        .filter((mark) => mark.color === nextColor)
        .map((mark) => mark.range);
      if (ranges.length === 0) store.delete(NAME(nextColor));
      else store.set(NAME(nextColor), new Highlight(...ranges));
    }
    setCount(marks.current.length);
  }, []);

  const dismiss = useCallback(() => {
    pendingRange.current = null;
    setSelection(null);
  }, []);

  const clear = useCallback(() => {
    marks.current = [];
    dismiss();
    paint();
  }, [dismiss, paint]);

  const apply = useCallback(
    (nextColor: HighlightColor) => {
      const range = pendingRange.current;
      if (!range) return;
      marks.current = [
        ...marks.current.filter((mark) => !overlaps(mark.range, range)),
        { range: range.cloneRange(), color: nextColor },
      ];
      setColor(nextColor);
      paint();
      window.getSelection()?.removeAllRanges();
      dismiss();
    },
    [dismiss, paint],
  );

  const removeSelection = useCallback(() => {
    const range = pendingRange.current;
    if (!range) return;
    marks.current = marks.current.filter((mark) => !overlaps(mark.range, range));
    paint();
    window.getSelection()?.removeAllRanges();
    dismiss();
  }, [dismiss, paint]);

  /* The DOM ranges become invalid when the rendered question changes. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    clear();
    return clear;
  }, [resetKey, clear]);

  useEffect(() => {
    if (!enabled) dismiss();
  }, [enabled, dismiss]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!enabled || !supported) return;

    const onPointerDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement | null)?.closest("[data-highlight-palette]")) return;
      if (!scope.current?.contains(event.target as Node)) dismiss();
    };

    const onPointerUp = (event: PointerEvent) => {
      if ((event.target as HTMLElement | null)?.closest("[data-highlight-palette]")) return;
      const browserSelection = window.getSelection();
      if (!browserSelection || browserSelection.rangeCount === 0) {
        dismiss();
        return;
      }

      const range = browserSelection.getRangeAt(0);
      if (!scope.current?.contains(range.commonAncestorContainer)) {
        dismiss();
        return;
      }

      if (browserSelection.isCollapsed) {
        if (options.contextual) {
          dismiss();
          return;
        }
        const hit = marks.current.filter((mark) =>
          covers(mark.range, range.startContainer, range.startOffset),
        );
        if (hit.length === 0) return;
        marks.current = marks.current.filter((mark) => !hit.includes(mark));
        paint();
        return;
      }

      const next = range.cloneRange();
      if (!options.contextual) {
        marks.current = [
          ...marks.current.filter((mark) => !overlaps(mark.range, next)),
          { range: next, color },
        ];
        paint();
        browserSelection.removeAllRanges();
        return;
      }

      const rect = next.getBoundingClientRect();
      if (!rect.width && !rect.height) {
        dismiss();
        return;
      }
      const paletteWidth = 176;
      const above = rect.top >= 58;
      pendingRange.current = next;
      setSelection({
        left: Math.min(
          window.innerWidth - paletteWidth / 2 - 8,
          Math.max(paletteWidth / 2 + 8, rect.left + rect.width / 2),
        ),
        top: above ? rect.top - 8 : rect.bottom + 8,
        placement: above ? "above" : "below",
        canRemove: marks.current.some((mark) => overlaps(mark.range, next)),
      });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      window.getSelection()?.removeAllRanges();
      dismiss();
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled, supported, scope, paint, color, dismiss, options.contextual]);

  const colors = useMemo(() => HIGHLIGHT_COLORS, []);

  return {
    supported,
    clear,
    count,
    color,
    setColor,
    colors,
    selection,
    apply,
    removeSelection,
    dismiss,
  };
}
