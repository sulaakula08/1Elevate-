"use client";

/**
 * The scroll engine the phase-two landing sections are built on.
 *
 * Written here rather than pulled from GSAP's ScrollTrigger, for three reasons
 * that all matter on this particular page:
 *
 * 1. One listener, one read pass. Every subscriber is measured inside a single
 *    rAF callback, so a page with six scroll-linked sections still forces one
 *    layout per frame instead of six. A scroll handler per component is how a
 *    landing page ends up janky on a laptop.
 * 2. No pinning. The sticky compositions use `position: sticky`, which the
 *    compositor handles on its own; nothing here writes a height, inserts a
 *    spacer or moves an element between parents, so the page cannot shift as a
 *    section activates.
 * 3. Nothing lands in React state unless a discrete stage actually changes.
 *    Continuous values are written straight to a CSS custom property, which the
 *    style system consumes without a re-render — see `useScrollVar`.
 *
 * Reduced motion is not handled in here. The engine only reports where the page
 * is; whether that should move anything is the caller's decision, and each
 * section makes it differently (the loop keeps its steps and drops the
 * transitions; the parallax layers switch off entirely).
 */

import { useCallback, useEffect, useState, useSyncExternalStore, type RefObject } from "react";

/**
 * How an element's scroll range is measured.
 *
 * `through` — 0 when the top edge reaches the bottom of the viewport, 1 when the
 * bottom edge reaches the top. The whole time any part of the element is on
 * screen. For entrances and parallax.
 *
 * `sticky` — 0 when the top edge reaches the top of the viewport, 1 when the
 * bottom edge reaches the bottom. Exactly the range over which a `sticky` child
 * is held in place, which is what a scroll-driven sequence has to be timed to.
 *
 * `cover` — 0 when the element's bottom reaches the bottom of the viewport, 1
 * when its top reaches the top. The range over which it fills the screen, used
 * for reveals that should finish while the element is still fully visible.
 */
export type ScrollRange = "through" | "sticky" | "cover";

type Subscriber = {
  el: HTMLElement;
  range: ScrollRange;
  emit: (progress: number) => void;
};

const subscribers = new Set<Subscriber>();
let frame = 0;
let listening = false;

function rangeFor(el: HTMLElement, range: ScrollRange): [number, number] {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || 1;
  // Distances are expressed as "how far the page still has to scroll", so the
  // maths below works entirely in viewport coordinates and never has to read
  // scrollY — which avoids disagreeing with the rect it was measured against.
  switch (range) {
    case "sticky":
      // Travel available to a sticky child: the element's height minus one
      // screen. A section shorter than the viewport has none, so it reports 0.
      return [rect.top, rect.height - vh];
    case "cover":
      return [vh - rect.bottom, rect.height - vh];
    case "through":
    default:
      return [rect.top - vh, rect.height + vh];
  }
}

function measure() {
  frame = 0;
  for (const sub of subscribers) {
    const [offset, span] = rangeFor(sub.el, sub.range);
    // A span of zero means the element cannot produce a range — a section
    // shorter than the viewport in `sticky` mode, or a hidden element. Report
    // the end state rather than dividing by zero: an element that cannot scroll
    // is an element whose sequence has nothing left to play.
    const progress = span <= 0 ? (offset <= 0 ? 1 : 0) : -offset / span;
    sub.emit(progress < 0 ? 0 : progress > 1 ? 1 : progress);
  }
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(measure);
}

function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
}

function unlisten() {
  if (!listening || subscribers.size > 0) return;
  listening = false;
  window.removeEventListener("scroll", schedule);
  window.removeEventListener("resize", schedule);
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
}

function subscribe(sub: Subscriber): () => void {
  subscribers.add(sub);
  listen();
  // Measured once, synchronously, for this subscriber only. Waiting for the next
  // frame would leave a section showing its resting state for a paint, and the
  // resting state is deliberately the *finished* one (see `useScrollVar`), so
  // that paint would be a flash of the end of the animation.
  const [offset, span] = rangeFor(sub.el, sub.range);
  const initial = span <= 0 ? (offset <= 0 ? 1 : 0) : -offset / span;
  sub.emit(initial < 0 ? 0 : initial > 1 ? 1 : initial);
  return () => {
    subscribers.delete(sub);
    unlisten();
  };
}

/**
 * Writes the element's scroll progress (0–1) into a CSS custom property on that
 * same element, and returns nothing.
 *
 * This is the primitive most of the motion on the page runs through: the value
 * changes every frame while scrolling, so putting it in React state would
 * re-render a subtree sixty times a second to produce a number that only CSS
 * ever reads. Written as a property instead, the whole section animates from one
 * `style.setProperty` call.
 *
 * `enabled` is a parameter rather than an early return so a section can switch
 * the binding off for reduced motion — and when it does, the property is
 * *removed* rather than pinned. That is the whole reduced-motion and no-script
 * story for the scroll-driven CSS on this page, and it only works because of a
 * convention every consumer has to keep:
 *
 *   a reveal reads `var(--p, 1)` — no property means finished, visible, done.
 *   a parallax reads `var(--p, 0.5)` — no property means centred, no offset.
 *
 * So a section whose binding never runs, or is torn down when the reduced-motion
 * query resolves after hydration, settles into its end state instead of freezing
 * half-revealed. Nothing needs `!important`, and a visitor with JavaScript
 * disabled reads the whole page.
 */
export function useScrollVar(
  ref: RefObject<HTMLElement | null>,
  {
    range = "through",
    property = "--p",
    enabled = true,
    /** Rounded to this many decimals before writing, to skip no-op paints. */
    precision = 3,
  }: {
    range?: ScrollRange;
    property?: string;
    enabled?: boolean;
    precision?: number;
  } = {},
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const factor = 10 ** precision;
    let last = -1;
    const stop = subscribe({
      el,
      range,
      emit: (progress) => {
        const value = Math.round(progress * factor) / factor;
        if (value === last) return;
        last = value;
        el.style.setProperty(property, String(value));
      },
    });
    return () => {
      stop();
      el.style.removeProperty(property);
    };
  }, [ref, range, property, enabled, precision]);
}

/**
 * A media query as a value, without an effect.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect` because the server
 * has no viewport: the server snapshot is always false, React hydrates against
 * that, and only then does the real query result arrive. Which is precisely the
 * progressive enhancement the loop section wants — it renders its tap-driven
 * mode for everyone, and wide viewports upgrade after hydration. Doing this with
 * an effect means setting state in the effect body, which React 19 correctly
 * complains about, and means one extra render for every consumer.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * Splits the element's scroll range into `count` stages and returns the active
 * one, from 0.
 *
 * State changes at most `count - 1` times across the whole range, so the product
 * surface inside a sticky viewport re-renders four times over five screens of
 * scrolling rather than continuously.
 *
 * Measure the *track* — the element whose height creates the scroll distance —
 * and not the section around it. A section that opens with a heading spends its
 * first tenth of scroll travel moving that heading past, and a sequence timed to
 * the section would burn its first stage on copy the reader has not reached yet.
 *
 * `lead` shifts every boundary earlier by that fraction of a stage. Zero divides
 * the range evenly, which is what a sticky composition wants: the frame is
 * already in place, so each stage should get the same amount of scroll.
 */
export function useScrollStage(
  ref: RefObject<HTMLElement | null>,
  count: number,
  {
    range = "sticky",
    enabled = true,
    lead = 0,
  }: { range?: ScrollRange; enabled?: boolean; lead?: number } = {},
): number {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    return subscribe({
      el,
      range,
      emit: (progress) => {
        const next = Math.max(0, Math.min(count - 1, Math.floor(progress * count - lead)));
        setStage((current) => (current === next ? current : next));
      },
    });
  }, [ref, range, enabled, count, lead]);

  return stage;
}

/**
 * True once the element has been on screen. One-shot, and it never goes back to
 * false — an entrance that replays every time a card scrolls past is the single
 * most common way a landing page starts to feel cheap.
 */
export function useEntered(
  ref: RefObject<HTMLElement | null>,
  { margin = "0px 0px -12% 0px", threshold = 0.12 }: { margin?: string; threshold?: number } = {},
): boolean {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || entered) return;
    if (typeof IntersectionObserver === "undefined") {
      const immediate = window.setTimeout(() => setEntered(true), 0);
      return () => window.clearTimeout(immediate);
    }

    // Whether the observer has ever spoken. The timeout below is a safety net for
    // an environment where it never does — not a deadline on the animation.
    //
    // `Reveal` in components/motion.tsx fires its fallback unconditionally after
    // 1.5s, which is fine for a fade but wrong here: a counter whose fallback
    // fires while the section is still four screens away has finished counting
    // before anyone can see it, and arrives looking static. Cancelling the net as
    // soon as the observer reports *anything*, intersecting or not, keeps both
    // properties — nothing stays hidden, and nothing plays off screen.
    let heard = false;

    const observer = new IntersectionObserver(
      (entries) => {
        heard = true;
        if (!entries[0]?.isIntersecting) return;
        setEntered(true);
        observer.disconnect();
      },
      { rootMargin: margin, threshold },
    );
    observer.observe(el);

    const fallback = window.setTimeout(() => {
      if (heard) return;
      setEntered(true);
      observer.disconnect();
    }, 1800);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, [ref, entered, margin, threshold]);

  return entered;
}

/**
 * Pointer position within the element, as two CSS properties in the −1…1 range.
 *
 * Only bound on devices with a real pointer, and only while the pointer is
 * inside: a touch device gets nothing, and a mouse that leaves eases the layers
 * back to centre through the same CSS transition that carries them.
 */
export function usePointerVars(
  ref: RefObject<HTMLElement | null>,
  { enabled = true }: { enabled?: boolean } = {},
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let queued = 0;
    let x = 0;
    let y = 0;

    const write = () => {
      queued = 0;
      el.style.setProperty("--mx", x.toFixed(3));
      el.style.setProperty("--my", y.toFixed(3));
    };

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      if (!queued) queued = requestAnimationFrame(write);
    };

    const onLeave = () => {
      x = 0;
      y = 0;
      if (!queued) queued = requestAnimationFrame(write);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (queued) cancelAnimationFrame(queued);
    };
  }, [ref, enabled]);
}

/**
 * Counts from `from` to `to` once `run` turns true, and stays there.
 *
 * `motion`'s animate() would do this, but it would also mean a motion value and
 * a subscription per number, and this page has more than a dozen of them. The
 * ease is the same cubic-out the CSS transitions use, so a counter and the bar
 * beside it arrive together.
 *
 * `from` defaults to 0 for a plain count-up, and is set for the numbers that
 * describe a change rather than a total — an accuracy going 33 to 60 has to
 * start at 33, because starting at 0 tells the reader something untrue about
 * where the student was.
 *
 * `duration: 0` is the reduced-motion path: the number is simply its final value,
 * with no effect and no frames. Note where that branch is — in the returned
 * expression, not in the state — so a caller passing `reduced ? 0 : 900` cannot
 * change what the first render produces. Before `run` flips, both `duration`
 * values return `from`, which is what keeps this safe to hydrate.
 */
export function useCountTo(
  to: number,
  run: boolean,
  { from = 0, duration = 1100 }: { from?: number; duration?: number } = {},
): number {
  const [shown, setShown] = useState(from);

  useEffect(() => {
    if (!run || duration <= 0) return;

    let frameId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(Math.round(from + (to - from) * (1 - (1 - t) ** 3)));
      if (t < 1) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    // rAF is throttled in a hidden tab, which would freeze a number mid-count.
    const settle = window.setTimeout(() => setShown(to), duration + 400);
    return () => {
      cancelAnimationFrame(frameId);
      window.clearTimeout(settle);
    };
  }, [to, from, run, duration]);

  if (!run) return from;
  return duration <= 0 ? to : shown;
}
