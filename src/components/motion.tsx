"use client";

import React, { useEffect, useRef, useState } from "react";

/** Fades + lifts children 12px the first time they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  /** Stagger, in ms. */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      // No observer support: show immediately, on a task rather than inline so
      // this stays out of the render-effect path.
      const immediate = window.setTimeout(() => setShown(true), 0);
      return () => window.clearTimeout(immediate);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    observer.observe(node);
    // Safety net: content must never stay invisible because an observer never
    // fired (background tab, hidden container, odd embedding).
    const fallback = window.setTimeout(() => setShown(true), 1500);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return React.createElement(
    Tag,
    {
      ref,
      className: `reveal ${shown ? "in" : ""} ${className}`,
      style: { transitionDelay: `${delay}ms` },
    },
    children,
  );
}

/** Counts up to `value` once visible. */
export function CountUp({
  value,
  duration = 900,
  suffix = "",
  className = "",
}: {
  value: number;
  duration?: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let frame = 0;
    let settle = 0;
    let started = false;
    const run = () => {
      if (started) return;
      started = true;
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        // Ease-out so the last digits settle rather than snapping.
        setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      // requestAnimationFrame is throttled in hidden tabs, which would freeze the
      // number mid-count — land on the real value regardless.
      settle = window.setTimeout(() => setShown(value), duration + 400);
    };

    if (typeof IntersectionObserver === "undefined") {
      run();
      return () => {
        cancelAnimationFrame(frame);
        window.clearTimeout(settle);
      };
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      observer.disconnect();
      run();
    });
    observer.observe(node);
    const fallback = window.setTimeout(() => {
      observer.disconnect();
      run();
    }, 1500);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
      window.clearTimeout(settle);
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {shown}
      {suffix}
    </span>
  );
}

/** Centre-screen dialog: backdrop fade, panel scales in 2%. */
export function Modal({
  open,
  onClose,
  children,
  labelledBy,
}: {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  labelledBy?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 fade-in"
      style={{ background: "color-mix(in srgb, #131316 45%, transparent)" }}
      onClick={() => onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div className="scale-in w-full max-w-sm" onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

/** Bottom-right toast. Auto-dismisses after 3s. */
export function Toast({
  message,
  onDone,
}: {
  message: string;
  onDone?: () => void;
}) {
  useEffect(() => {
    const id = window.setTimeout(() => onDone?.(), 3000);
    return () => window.clearTimeout(id);
  }, [onDone]);

  return (
    <div
      className="fade-up fixed bottom-24 right-5 z-40 panel px-3.5 py-2.5 text-sm"
      style={{ boxShadow: "var(--overlay)" }}
      role="status"
    >
      {message}
    </div>
  );
}

/** 2px progress rule. */
export function ProgressBar({
  value,
  className = "",
  tone = "ink",
}: {
  value: number;
  className?: string;
  tone?: "ink" | "accent" | "danger";
}) {
  const color =
    tone === "accent" ? "var(--accent)" : tone === "danger" ? "var(--danger)" : "var(--foreground)";
  return (
    <div
      className={`h-[3px] rounded-[var(--radius-pill)] overflow-hidden ${className}`}
      style={{ background: "var(--line)" }}
    >
      <div
        className="h-full rounded-[var(--radius-pill)] transition-[width] duration-500 ease-out"
        style={{ width: `${Math.max(1, Math.min(100, value * 100))}%`, background: color }}
      />
    </div>
  );
}
