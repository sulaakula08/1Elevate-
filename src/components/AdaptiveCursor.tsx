"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

type CursorKind = "default" | "interactive" | "text" | "disabled";

type CursorState = {
  kind: CursorKind;
  height: number;
};

const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "summary",
  "label[for]",
  "[role='button']",
  "[role='link']",
  "[role='menuitem']",
  "[role='tab']",
  "[role='switch']",
  "[role='checkbox']",
  "[role='radio']",
  "[data-cursor='interactive']",
].join(",");

const DISABLED_SELECTOR = [
  "button:disabled",
  "input:disabled",
  "select:disabled",
  "textarea:disabled",
  "[aria-disabled='true']",
  "[data-cursor='disabled']",
].join(",");

const TEXT_SELECTOR = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "li",
  "dt",
  "dd",
  "blockquote",
  "figcaption",
  "small",
  "time",
  "code",
  "pre",
  "[contenteditable='true']",
  "[data-cursor='text']",
].join(",");

const SHAPES: Record<Exclude<CursorKind, "text">, { width: number; height: number }> = {
  default: { width: 17, height: 17 },
  interactive: { width: 31, height: 31 },
  disabled: { width: 13, height: 13 },
};

const SHAPE_SPRING = {
  type: "spring" as const,
  stiffness: 640,
  damping: 38,
  mass: 0.38,
};

/** Landing-only adaptive pointer. Position is direct; shape changes are sprung. */
export function AdaptiveCursor() {
  const x = useMotionValue(-40);
  const y = useMotionValue(-40);
  const opacity = useMotionValue(0);
  const widthTarget = useMotionValue(SHAPES.default.width);
  const heightTarget = useMotionValue(SHAPES.default.height);
  const scaleTarget = useMotionValue(1);
  const width = useSpring(widthTarget, SHAPE_SPRING);
  const height = useSpring(heightTarget, SHAPE_SPRING);
  const scale = useSpring(scaleTarget, SHAPE_SPRING);
  const cursor = useRef<HTMLDivElement>(null);
  const lastTarget = useRef<Element | null>(null);
  const lastPoint = useRef({ x: -40, y: -40 });
  const currentState = useRef<CursorState>({
    kind: "default",
    height: SHAPES.default.height,
  });

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine) and (hover: hover)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let stopTracking = () => {};

    const startTracking = () => {
      document.documentElement.dataset.landingCursor = "";

      let textMetrics = new WeakMap<Element, number>();
      let scrollFrame = 0;

      const textCaretHeight = (element: Element) => {
        const cached = textMetrics.get(element);
        if (cached !== undefined) return cached;

        const styles = window.getComputedStyle(element);
        const fontSize = Number.parseFloat(styles.fontSize) || 16;
        const parsedLineHeight = Number.parseFloat(styles.lineHeight);
        const lineHeight = Number.isFinite(parsedLineHeight) ? parsedLineHeight : fontSize * 1.2;
        const nextHeight = Math.round(Math.min(72, Math.max(12, Math.min(fontSize, lineHeight))));
        textMetrics.set(element, nextHeight);
        return nextHeight;
      };

      const updateTarget = (target: Element | null) => {
        if (target === lastTarget.current) return;
        lastTarget.current = target;

        let next: CursorState = { kind: "default", height: SHAPES.default.height };

        if (target) {
          const disabled = target.closest(DISABLED_SELECTOR);
          const interactive = target.closest(INTERACTIVE_SELECTOR);
          const override = target.closest<HTMLElement>("[data-cursor]")?.dataset.cursor;

          if (disabled) {
            next = { kind: "disabled", height: SHAPES.disabled.height };
          } else if (interactive) {
            next = { kind: "interactive", height: SHAPES.interactive.height };
          } else if (override !== "default") {
            const text = target.closest(TEXT_SELECTOR);
            if (text && window.getComputedStyle(text).userSelect !== "none") {
              next = { kind: "text", height: textCaretHeight(text) };
            }
          }
        }

        if (currentState.current.kind === next.kind && currentState.current.height === next.height) {
          return;
        }

        currentState.current = next;
        const shape = next.kind === "text" ? { width: 4, height: next.height } : SHAPES[next.kind];

        widthTarget.set(shape.width);
        heightTarget.set(shape.height);
        cursor.current?.setAttribute("data-kind", next.kind);

        if (next.kind === "disabled") {
          scaleTarget.set(1);
          cursor.current?.removeAttribute("data-pressed");
        }
      };

      const onPointerMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        lastPoint.current = { x: event.clientX, y: event.clientY };
        x.set(event.clientX);
        y.set(event.clientY);
        opacity.set(1);
        updateTarget(event.target instanceof Element ? event.target : null);
      };

      const onPointerDown = (event: PointerEvent) => {
        if (event.pointerType === "touch" || currentState.current.kind === "disabled") return;
        scaleTarget.set(0.86);
        cursor.current?.setAttribute("data-pressed", "true");
      };
      const onPointerUp = () => {
        scaleTarget.set(1);
        cursor.current?.removeAttribute("data-pressed");
      };
      const onPointerLeave = (event: PointerEvent) => {
        if (event.relatedTarget === null) {
          opacity.set(0);
          onPointerUp();
          lastTarget.current = null;
        }
      };
      const onWindowBlur = () => {
        opacity.set(0);
        onPointerUp();
      };
      const onScroll = () => {
        if (scrollFrame) return;
        scrollFrame = requestAnimationFrame(() => {
          scrollFrame = 0;
          const point = lastPoint.current;
          updateTarget(document.elementFromPoint(point.x, point.y));
        });
      };
      const onResize = () => {
        textMetrics = new WeakMap<Element, number>();
        lastTarget.current = null;
        onScroll();
      };

      document.addEventListener("pointermove", onPointerMove, { passive: true });
      document.addEventListener("pointerdown", onPointerDown, { passive: true });
      document.addEventListener("pointerup", onPointerUp, { passive: true });
      document.addEventListener("pointercancel", onPointerUp, { passive: true });
      document.documentElement.addEventListener("pointerleave", onPointerLeave);
      window.addEventListener("blur", onWindowBlur);
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize, { passive: true });

      return () => {
        if (scrollFrame) cancelAnimationFrame(scrollFrame);
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerdown", onPointerDown);
        document.removeEventListener("pointerup", onPointerUp);
        document.removeEventListener("pointercancel", onPointerUp);
        document.documentElement.removeEventListener("pointerleave", onPointerLeave);
        window.removeEventListener("blur", onWindowBlur);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
        delete document.documentElement.dataset.landingCursor;
        opacity.set(0);
        lastTarget.current = null;
      };
    };

    const syncTracking = () => {
      stopTracking();
      stopTracking = finePointer.matches && !reducedMotion.matches ? startTracking() : () => {};
    };

    syncTracking();
    finePointer.addEventListener("change", syncTracking);
    reducedMotion.addEventListener("change", syncTracking);

    return () => {
      finePointer.removeEventListener("change", syncTracking);
      reducedMotion.removeEventListener("change", syncTracking);
      stopTracking();
    };
  }, [heightTarget, opacity, scaleTarget, widthTarget, x, y]);

  return (
    <motion.div aria-hidden="true" className="adaptive-cursor-shell" style={{ x, y, opacity }}>
      <motion.div
        ref={cursor}
        className="adaptive-cursor"
        data-kind="default"
        style={{ width, height, scale }}
      />
    </motion.div>
  );
}
