"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A tool panel the student can move and resize.
 *
 * The calculator was a docked column: resizable, since a graph's useful size
 * depends on what is being graphed, but fixed to the left of the question. On a
 * Reading and Writing layout that is fine; on a Math question with a figure it
 * covers the thing you are calculating about. The real test app floats its
 * calculator for exactly this reason.
 *
 * Dragging is pointer-based rather than HTML5 drag-and-drop: drag-and-drop has a
 * ghost image, fires no event while the pointer is down but still, and does not
 * work with touch. Resizing stays with the browser's own `resize: both` grip —
 * it already handles trackpad, touch and keyboard, and nothing hand-rolled here
 * would do better.
 *
 * Geometry lives in a module-level record rather than in state or storage. Within
 * a session, closing the calculator and opening it again should put it back where
 * you left it — but a position that made sense on yesterday's window is not worth
 * restoring, so it is deliberately not persisted.
 */

type Geometry = { x: number; y: number };

const PLACED: Record<string, Geometry> = {};

/** Keeps the panel's header on screen whatever the window has done since. */
function clamp(next: Geometry, size: { width: number; height: number }): Geometry {
  const margin = 8;
  const maxX = Math.max(margin, window.innerWidth - size.width - margin);
  // Vertically only the header has to stay reachable: a tall panel on a short
  // window may run off the bottom, and forcing it up would fight the resize.
  const maxY = Math.max(margin, window.innerHeight - 48);
  return {
    x: Math.min(maxX, Math.max(margin, next.x)),
    y: Math.min(maxY, Math.max(margin, next.y)),
  };
}

export function FloatingTool({
  id,
  title,
  onClose,
  closeLabel,
  hint,
  children,
}: {
  /** Identifies the panel across open/close, for remembering where it was put. */
  id: string;
  title: string;
  onClose: () => void;
  closeLabel: string;
  /** One line under the title — "drag to move", say. */
  hint?: string;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<Geometry | null>(null);
  const [dragging, setDragging] = useState(false);
  /** Pointer offset inside the header, so the panel does not jump on grab. */
  const grab = useRef<Geometry>({ x: 0, y: 0 });

  useEffect(() => {
    const size = panel.current?.getBoundingClientRect();
    const width = size?.width ?? 380;
    const height = size?.height ?? 520;
    // First open: to the right of the question, below the tool bar. Not centred —
    // the middle of the screen is where the question is.
    const initial =
      PLACED[id] ??
      ({ x: Math.max(8, window.innerWidth - width - 32), y: 96 } satisfies Geometry);
    setAt(clamp(initial, { width, height }));
  }, [id]);

  const onMove = useCallback(
    (event: PointerEvent) => {
      const size = panel.current?.getBoundingClientRect();
      const next = clamp(
        { x: event.clientX - grab.current.x, y: event.clientY - grab.current.y },
        { width: size?.width ?? 380, height: size?.height ?? 520 },
      );
      PLACED[id] = next;
      setAt(next);
    },
    [id],
  );

  useEffect(() => {
    if (!dragging) return;
    const stop = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop, { once: true });
    window.addEventListener("pointercancel", stop, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [dragging, onMove]);

  // A window that shrinks must not leave the panel unreachable.
  useEffect(() => {
    const onResize = () => {
      setAt((previous) => {
        if (!previous) return previous;
        const size = panel.current?.getBoundingClientRect();
        const next = clamp(previous, {
          width: size?.width ?? 380,
          height: size?.height ?? 520,
        });
        PLACED[id] = next;
        return next;
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [id]);

  function startDrag(event: React.PointerEvent) {
    // Left button only, and never from the close button.
    if (event.button !== 0) return;
    const bounds = panel.current?.getBoundingClientRect();
    if (!bounds) return;
    grab.current = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    setDragging(true);
  }

  /** Arrow keys nudge it, so moving the panel does not require a pointer. */
  function onHeaderKey(event: React.KeyboardEvent) {
    const step = event.shiftKey ? 32 : 8;
    const delta: Record<string, Geometry> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const move = delta[event.key];
    if (!move || !at) return;
    event.preventDefault();
    const size = panel.current?.getBoundingClientRect();
    const next = clamp(
      { x: at.x + move.x, y: at.y + move.y },
      { width: size?.width ?? 380, height: size?.height ?? 520 },
    );
    PLACED[id] = next;
    setAt(next);
  }

  return (
    <div
      ref={panel}
      className={`float-tool ${dragging ? "is-dragging" : ""}`}
      style={
        at
          ? { left: at.x, top: at.y }
          : // Off-screen for the one frame before the geometry is measured, rather
            // than flashing in the top-left corner.
            { left: -9999, top: 0 }
      }
      role="dialog"
      aria-label={title}
    >
      <div
        className="float-tool-head"
        onPointerDown={startDrag}
        onKeyDown={onHeaderKey}
        role="toolbar"
        tabIndex={0}
        aria-label={title}
      >
        <span className="float-tool-grip" aria-hidden>
          <span />
          <span />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium truncate">{title}</span>
          {hint && <span className="block text-2xs text-faint">{hint}</span>}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm ml-auto shrink-0"
          onClick={onClose}
          aria-label={closeLabel}
          // The header is a drag surface; without this the close button starts a
          // drag as well as closing.
          onPointerDown={(event) => event.stopPropagation()}
        >
          ✕
        </button>
      </div>
      <div className="float-tool-body">{children}</div>
    </div>
  );
}
