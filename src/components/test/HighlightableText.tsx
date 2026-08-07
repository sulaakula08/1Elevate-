"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

/**
 * Text a student can highlight, the way the real test app allows.
 *
 * Highlights are stored as character offsets rather than as DOM nodes: the
 * browser's own Range API is only used to *read* the selection, and the marks
 * themselves are ordinary React output. Injecting <mark> elements into the DOM
 * directly would put nodes inside a subtree React owns, and the next render
 * would fight over them.
 */

export type Range = { start: number; end: number };

type Props = {
  text: string;
  ranges: Range[];
  /** Off in "read" mode; selecting then only does what a browser normally does. */
  enabled: boolean;
  onChange: (ranges: Range[]) => void;
  className?: string;
  as?: "p" | "div" | "blockquote";
};

/** Sorted, non-overlapping, with touching ranges merged. */
function normalize(ranges: Range[]): Range[] {
  const sorted = [...ranges].filter((r) => r.end > r.start).sort((a, b) => a.start - b.start);
  const out: Range[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
    else out.push({ ...r });
  }
  return out;
}

/** A highlight that covers an existing one toggles it off instead of stacking. */
function toggle(ranges: Range[], next: Range): Range[] {
  const covered = ranges.find((r) => next.start >= r.start && next.end <= r.end);
  if (covered) {
    const rest = ranges.filter((r) => r !== covered);
    if (covered.start < next.start) rest.push({ start: covered.start, end: next.start });
    if (next.end < covered.end) rest.push({ start: next.end, end: covered.end });
    return normalize(rest);
  }
  return normalize([...ranges, next]);
}

/** Walk up to the segment span that knows its own start offset. */
function offsetOf(node: Node | null, offset: number): number | null {
  let el: HTMLElement | null =
    node?.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement | null);
  while (el && el.dataset.off === undefined) el = el.parentElement;
  if (!el) return null;
  return Number(el.dataset.off) + offset;
}

export function HighlightableText({
  text,
  ranges,
  enabled,
  onChange,
  className = "",
  as: Tag = "p",
}: Props) {
  const segments = useMemo(() => {
    const parts: { start: number; end: number; on: boolean }[] = [];
    let cursor = 0;
    for (const r of normalize(ranges)) {
      const start = Math.max(0, Math.min(r.start, text.length));
      const end = Math.max(0, Math.min(r.end, text.length));
      if (start > cursor) parts.push({ start: cursor, end: start, on: false });
      if (end > start) parts.push({ start, end, on: true });
      cursor = Math.max(cursor, end);
    }
    if (cursor < text.length) parts.push({ start: cursor, end: text.length, on: false });
    return parts.length ? parts : [{ start: 0, end: text.length, on: false }];
  }, [text, ranges]);

  const capture = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const start = offsetOf(range.startContainer, range.startOffset);
    const end = offsetOf(range.endContainer, range.endOffset);
    if (start === null || end === null || start === end) return;
    onChange(toggle(ranges, { start: Math.min(start, end), end: Math.max(start, end) }));
    selection.removeAllRanges();
  }, [onChange, ranges]);

  // The listener lives on the window rather than the element: a drag that ends
  // just outside the paragraph still selected text inside it, and the student
  // means for that to be highlighted. The containment check below keeps it from
  // reacting to selections elsewhere on the page.
  const host = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!enabled) return;
    const onUp = () => {
      const selection = window.getSelection();
      const node = selection?.anchorNode;
      if (!node || !host.current?.contains(node)) return;
      capture();
    };
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, [enabled, capture]);

  return (
    <Tag
      ref={host as React.RefObject<never>}
      className={`${className} ${enabled ? "cursor-text select-text" : ""}`}
    >
      {segments.map((seg) =>
        seg.on ? (
          <mark key={seg.start} data-off={seg.start} className="hl">
            {text.slice(seg.start, seg.end)}
          </mark>
        ) : (
          <span key={seg.start} data-off={seg.start}>
            {text.slice(seg.start, seg.end)}
          </span>
        ),
      )}
    </Tag>
  );
}
