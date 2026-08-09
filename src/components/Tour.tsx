"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { loadTourDone, saveTourDone } from "@/lib/storage";
import { TutorAvatar } from "./TutorAvatar";

/** Fire this to (re)start the tour from anywhere. */
export const TOUR_EVENT = "elevate:tour";

type Step = {
  /** Element to spotlight. Null centres the card with no ring. */
  selector: string | null;
  titleKey: string;
  bodyKey: string;
};

const STEPS: Step[] = [
  { selector: "[data-tour=score]", titleKey: "tour.t1", bodyKey: "tour.d1" },
  { selector: "[data-tour=practice]", titleKey: "tour.t2", bodyKey: "tour.d2" },
  { selector: "[data-tour=mock]", titleKey: "tour.t3", bodyKey: "tour.d3" },
  { selector: null, titleKey: "tour.t4", bodyKey: "tour.d4" },
  { selector: "[data-tour=progress]", titleKey: "tour.t5", bodyKey: "tour.d5" },
];

type Box = { top: number; left: number; width: number; height: number };

export function Tour() {
  const { t } = useI18n();
  const { account, ready } = useApp();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [box, setBox] = useState<Box | null>(null);

  const start = useCallback(() => {
    setStep(0);
    setActive(true);
  }, []);

  // Manual restart, from wherever the event is dispatched.
  useEffect(() => {
    const onEvent = () => start();
    window.addEventListener(TOUR_EVENT, onEvent);
    return () => window.removeEventListener(TOUR_EVENT, onEvent);
  }, [start]);

  // First run: offer the tour once, on the dashboard, after data has loaded.
  useEffect(() => {
    if (!ready || !account || pathname !== "/" || loadTourDone()) return;
    const id = window.setTimeout(() => {
      setStep(0);
      setActive(true);
    }, 700);
    return () => window.clearTimeout(id);
  }, [ready, account, pathname]);

  const finish = useCallback(() => {
    setActive(false);
    saveTourDone(true);
  }, []);

  // Measure the spotlight target, and keep it in place while scrolling/resizing.
  useEffect(() => {
    if (!active) return;
    const selector = STEPS[step].selector;
    // Steps without a target render a centred card; nothing to measure, and the
    // stale box is ignored because rendering derives from the current step.
    if (!selector) return;

    const measure = () => {
      const node = document.querySelector(selector);
      if (!node) {
        setBox(null);
        return;
      }
      const rect = node.getBoundingClientRect();
      setBox({
        top: rect.top - 6,
        left: rect.left - 6,
        width: rect.width + 12,
        height: rect.height + 12,
      });
    };

    const node = document.querySelector(selector);
    node?.scrollIntoView({ block: "center", behavior: "smooth" });
    // Measure after the smooth scroll settles, then track movement.
    const settle = window.setTimeout(measure, 340);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [active, step]);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
      if (event.key === "Enter" || event.key === "ArrowRight") {
        setStep((s) => (s + 1 >= STEPS.length ? (finish(), s) : s + 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, finish]);

  if (!active) return null;

  const current = STEPS[step];
  const isLast = step + 1 >= STEPS.length;
  const target = current.selector ? box : null;

  // Place the card under the target when there's room, otherwise above it.
  const cardStyle: React.CSSProperties = target
    ? (() => {
        const below = target.top + target.height + 14;
        const wantsAbove = below + 190 > window.innerHeight;
        return {
          top: wantsAbove ? Math.max(12, target.top - 200) : below,
          left: Math.min(Math.max(12, target.left), Math.max(12, window.innerWidth - 340)),
        };
      })()
    : {
        top: Math.max(24, window.innerHeight / 2 - 110),
        left: Math.max(12, window.innerWidth / 2 - 160),
      };

  return (
    <>
      {target ? (
        <div
          className="tour-ring"
          style={{ top: target.top, left: target.left, width: target.width, height: target.height }}
        />
      ) : (
        <div
          className="fixed inset-0 z-[60] fade-in"
          style={{ background: "color-mix(in srgb, #0b0b0d 58%, transparent)" }}
          onClick={finish}
        />
      )}

      <div className="tour-card scale-in p-5" style={cardStyle} role="dialog" aria-live="polite">
        <div className="flex items-center gap-2.5">
          {current.selector === null ? (
            <TutorAvatar mood="talking" size={22} />
          ) : (
            <span
              className="num text-2xs px-2 py-0.5 rounded-[var(--radius-pill)]"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            >
              {step + 1}/{STEPS.length}
            </span>
          )}
          <p className="text-body font-semibold">{t(current.titleKey)}</p>
        </div>

        <p className="mt-2.5 text-sm leading-relaxed text-muted">{t(current.bodyKey)}</p>

        <div className="mt-5 flex items-center gap-2">
          <div className="flex gap-1.5 mr-auto">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-[var(--radius-pill)] transition-colors"
                style={{ background: i === step ? "var(--accent)" : "var(--line-strong)" }}
              />
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={finish}>
            {t("tour.skip")}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
          >
            {isLast ? t("tour.done") : t("tour.next")}
          </button>
        </div>
      </div>
    </>
  );
}
