"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Band } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";

/**
 * The small shared parts of the progress analytics: the motion hooks every
 * chart on the page uses, and the three or four fragments that would otherwise
 * be written five slightly different ways.
 *
 * Nothing here holds data. Everything on this page is derived in
 * lib/analytics.ts and handed down as props, so a component's only job is to
 * draw — which is what keeps the charts cheap to re-render and the numbers
 * impossible to disagree with each other.
 */

/* ----------------------------------------------------------------- motion -- */

/**
 * Whether to animate at all.
 *
 * Two signals, because this product has two: the OS preference, and the app's
 * own "reduce motion" setting, which is applied as `data-motion="reduce"` on the
 * root element (see lib/settings.tsx). CSS already honours both; JS-driven
 * motion — a count-up, a line being drawn — has to ask.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () =>
      setReduced(query.matches || document.documentElement.dataset.motion === "reduce");
    read();
    query.addEventListener("change", read);
    // The in-app setting is written to the root element, so watching the
    // attribute is what makes flipping it in Settings take effect here without
    // a reload.
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-motion"],
    });
    return () => {
      query.removeEventListener("change", read);
      observer.disconnect();
    };
  }, []);

  return reduced;
}

/**
 * True once the element has been seen, and never false again.
 *
 * Sections use it to fade in and charts use it to start drawing, so a chart
 * below the fold animates when it is reached rather than having already
 * finished by the time it is scrolled to. The timeout is a safety net: content
 * must never stay invisible because an observer never fired.
 */
export function useInView<T extends HTMLElement>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      const immediate = window.setTimeout(() => setSeen(true), 0);
      return () => window.clearTimeout(immediate);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.04 },
    );
    observer.observe(node);
    const fallback = window.setTimeout(() => setSeen(true), 1600);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return [ref, seen];
}

/**
 * Counts from zero to `target` once `run` is true.
 *
 * Ease-out, so the last digits settle rather than snapping, and a timeout lands
 * on the exact value in case requestAnimationFrame is throttled in a hidden tab
 * mid-count.
 *
 * Reduced motion is handled by what is returned rather than by writing the
 * final value into state: an effect that sets state synchronously on mount is a
 * cascading render, and there is nothing to animate in that case anyway.
 */
export function useCountUp(target: number, run: boolean, duration = 900): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  /** Where the last run finished, so a changed target resumes rather than replays. */
  const shown = useRef(0);

  useEffect(() => {
    if (!run || reduced || duration <= 0) return;
    const from = shown.current;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const next = Math.round(from + (target - from) * (1 - Math.pow(1 - progress, 3)));
      shown.current = next;
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // requestAnimationFrame is throttled in a hidden tab, which would freeze the
    // number mid-count — land on the real value regardless.
    const settle = window.setTimeout(() => {
      shown.current = target;
      setValue(target);
    }, duration + 350);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
    };
  }, [target, run, reduced, duration]);

  return reduced ? target : value;
}

/**
 * The rendered width of an element.
 *
 * Charts here are drawn in real pixels rather than scaled from a fixed viewBox:
 * a scaled SVG takes its type and its stroke weights with it, so an axis label
 * ends up 9px on a phone and 15px on a desktop. Measuring costs one observer and
 * keeps every chart's typography identical to the page's.
 */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof ResizeObserver === "undefined") {
      setWidth(node.clientWidth);
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const next = Math.round(entries[0]?.contentRect.width ?? 0);
      // Integer widths only: a fractional resize would re-render the whole
      // chart on every subpixel of a window drag.
      setWidth((previous) => (previous === next ? previous : next));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

/**
 * A media query, evaluated after mount.
 *
 * Null until it has been measured, so a caller can render the desktop
 * composition on the first frame rather than guessing and flipping. Nothing on
 * this page renders before its data arrives, which takes longer than that frame.
 */
export function useMediaQuery(query: string): boolean | null {
  const [matches, setMatches] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const read = () => setMatches(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, [query]);

  return matches;
}

/* --------------------------------------------------------------- fragments -- */

/** The band colour, as the CSS custom property the stylesheet defines. */
export function bandColor(band: Band): string {
  switch (band) {
    case "mastered":
      return "var(--pg-mastered)";
    case "strong":
      return "var(--pg-strong)";
    case "developing":
      return "var(--pg-developing)";
    case "needsWork":
      return "var(--pg-needs)";
    case "critical":
      return "var(--pg-critical)";
    default:
      return "var(--pg-unknown)";
  }
}

export const BANDS: Band[] = [
  "mastered",
  "strong",
  "developing",
  "needsWork",
  "critical",
  "unknown",
];

/**
 * A signed change.
 *
 * `good` says which direction is progress, because the answer is not always
 * "up": a falling median answer time is a student getting faster, and colouring
 * it red would be the page telling them off for improving.
 */
export function Delta({
  value,
  good = "up",
  format = "points",
  fallback,
}: {
  value: number | null;
  good?: "up" | "down";
  /** points = percentage points, count = whole numbers, seconds = a pace. */
  format?: "points" | "count" | "seconds";
  fallback?: string;
}) {
  if (value === null || Number.isNaN(value)) {
    return <span className="pg-delta">{fallback ?? "—"}</span>;
  }
  const rising = value > 0;
  /* Under half a percentage point is noise, and drawing it as a red arrow tells
     a student their accuracy fell when it did not move. */
  const flat = Math.abs(value) < (format === "points" ? 0.005 : 0.5);
  const improving = flat ? null : good === "up" ? rising : !rising;
  const magnitude =
    format === "points"
      ? `${Math.abs(value * 100).toFixed(1)}%`
      : format === "seconds"
        ? `${Math.abs(Math.round(value))}s`
        : `${Math.abs(Math.round(value))}`;

  return (
    <span
      className="pg-delta"
      data-good={improving === null ? undefined : String(improving)}
    >
      <span aria-hidden>{flat ? "±" : rising ? "↑" : "↓"}</span>
      {magnitude}
    </span>
  );
}

/**
 * The honest empty state.
 *
 * Deliberately shaped like a panel that is waiting rather than one that failed:
 * it says what is missing and how much of it, because "no data" with no number
 * beside it is the same as no message at all.
 */
export function Void({ title, body }: { title?: string; body?: string }) {
  const { t } = useI18n();
  return (
    <div className="pg-void">
      <p className="pg-void-title">{title ?? t("pg.empty")}</p>
      {body && <p className="pg-void-body">{body}</p>}
    </div>
  );
}

/**
 * The opening of an act — four of them across the page: where you stand, your
 * skills, your habits, your mocks.
 *
 * It exists so the scroll has chapters instead of eleven equal sections, and it
 * is deliberately the quietest type on the page: a short rule and a word. The
 * heading below it does the announcing.
 */
export function Act({ children }: { children: React.ReactNode }) {
  return (
    <p className="pg-act">
      <span className="pg-act-name">{children}</span>
    </p>
  );
}

/**
 * One section, at one of three levels of importance.
 *
 * `tier` is the whole design system of this page in one prop:
 *
 *   1  a stage — contained surface, display heading, the most air. Four of
 *      these, and they are the four things somebody would screenshot.
 *   2  open ground with a sub-heading. Polished, quieter, no box.
 *   3  a compact strip. Label only, small type, minimum height.
 *
 * There is deliberately no `hint` on tier 1: a signature section earns a real
 * heading and, where it needs one, a deck — not a grey sentence in the same
 * size as everything else on the page.
 */
export function Chapter({
  tier = 2,
  title,
  deck,
  tools,
  children,
  id,
  foot,
}: {
  tier?: 1 | 2 | 3;
  title: string;
  deck?: string;
  tools?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
  /** Small print that belongs after the content rather than before it. */
  foot?: React.ReactNode;
}) {
  const [ref, seen] = useInView<HTMLElement>();
  const headingId = id ? `${id}-title` : undefined;

  const head = (
    <div className="pg-head">
      <div className="pg-head-copy">
        <h2
          id={headingId}
          className={tier === 1 ? "pg-title" : tier === 2 ? "pg-title-sm" : "t-label"}
        >
          {title}
        </h2>
        {deck && <p className="pg-deck">{deck}</p>}
      </div>
      {tools && <div className="pg-head-tools">{tools}</div>}
    </div>
  );

  return (
    <section
      ref={ref}
      id={id}
      className="pg-chapter pg-enter"
      data-in={seen ? "true" : undefined}
      data-tier={tier}
      aria-labelledby={headingId}
    >
      {tier === 1 ? (
        <div className="pg-stage">
          {head}
          {children}
        </div>
      ) : (
        <>
          {head}
          {children}
        </>
      )}
      {foot}
    </section>
  );
}

/**
 * The phone's table of contents.
 *
 * On a phone the page was ten thousand pixels of desktop analytics stacked
 * vertically, which is technically responsive and practically unusable. The
 * same four acts become four destinations, one tap apart, with the standing,
 * the trajectory, the insights and the next action all in the first one — so
 * nothing needed to decide what to do next is behind an interaction.
 *
 * Desktop never sees this: there, the acts run continuously, which is what a
 * wide screen is for.
 */
export function ChapterNav<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <nav className="pg-nav" aria-label="Progress sections">
      <div className="pg-nav-track" role="tablist">
        {options.map((option) => {
          const on = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={on}
              className="pg-nav-item"
              data-on={on ? "true" : undefined}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * A segmented control, using the app's own `.seg`.
 *
 * Radio semantics rather than buttons: the options are mutually exclusive, and a
 * screen reader should hear "3 of 4 selected", not four unrelated buttons.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  const onKey = useCallback(
    (event: React.KeyboardEvent) => {
      const index = options.findIndex((option) => option.value === value);
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        onChange(options[(index + 1) % options.length].value);
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        onChange(options[(index - 1 + options.length) % options.length].value);
      }
    },
    [onChange, options, value],
  );

  return (
    <div className="seg" role="radiogroup" aria-label={label} onKeyDown={onKey}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            className={`seg-item${on ? " seg-item-on" : ""}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
