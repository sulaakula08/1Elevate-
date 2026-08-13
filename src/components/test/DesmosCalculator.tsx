"use client";

import { useEffect, useRef } from "react";

type DesmosState = Record<string, unknown>;

type DesmosInstance = {
  destroy: () => void;
  getState: () => DesmosState;
  resize: () => void;
  setState: (state: DesmosState, options?: { allowUndo?: boolean }) => void;
};

type DesmosApi = {
  GraphingCalculator: (
    element: HTMLElement,
    options?: Record<string, unknown>,
  ) => DesmosInstance;
};

declare global {
  interface Window {
    Desmos?: DesmosApi;
  }
}

/** Desmos publishes this key for evaluation. Production must use a licensed key. */
const DEMO_KEY = "dcb31709b452b1cf9dc26972add0fda6";
const API_KEY = process.env.NEXT_PUBLIC_DESMOS_API_KEY || DEMO_KEY;
const VERSION = process.env.NEXT_PUBLIC_DESMOS_VERSION || "v1.11";
const SOURCE = `https://www.desmos.com/api/${VERSION}/calculator.js?apiKey=${API_KEY}`;
const LOAD_TIMEOUT_MS = 10_000;

let loader: Promise<boolean> | null = null;

/** Keeps graph work through a runner remount without creating permanent storage. */
const sessionStates = new Map<string, DesmosState>();

function loadDesmos(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Desmos) return Promise.resolve(true);
  if (loader) return loader;

  loader = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SOURCE}"]`);
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = SOURCE;
      script.async = true;
      script.dataset.desmosApi = "true";
    }

    let settled = false;
    const finish = (loaded: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (!loaded) {
        loader = null;
        script.remove();
      }
      resolve(loaded);
    };

    const timer = window.setTimeout(() => finish(Boolean(window.Desmos)), LOAD_TIMEOUT_MS);
    script.addEventListener("load", () => finish(Boolean(window.Desmos)), { once: true });
    script.addEventListener("error", () => finish(false), { once: true });
    if (!existing) document.head.appendChild(script);
  });

  return loader;
}

type Props = {
  active?: boolean;
  onResolved: (loaded: boolean) => void;
  sessionKey?: string;
};

export function DesmosCalculator({
  active = true,
  onResolved,
  sessionKey = "math-calculator",
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const calculatorRef = useRef<DesmosInstance | null>(null);

  useEffect(() => {
    let cancelled = false;
    let calculator: DesmosInstance | null = null;
    const host = hostRef.current;

    void loadDesmos().then((loaded) => {
      if (cancelled) return;
      if (!loaded || !window.Desmos || !host) {
        onResolved(false);
        return;
      }

      try {
        calculator = window.Desmos.GraphingCalculator(host, {
          expressions: true,
          graphpaper: true,
          keypad: true,
          settingsMenu: true,
          zoomButtons: true,
          images: false,
          folders: false,
          notes: false,
          border: false,
          autosize: false,
          invertedColors: document.documentElement.dataset.theme === "dark",
        });
        calculatorRef.current = calculator;

        const previousState = sessionStates.get(sessionKey);
        if (previousState) calculator.setState(previousState);
        calculator.resize();
        onResolved(true);
      } catch {
        onResolved(false);
      }
    });

    const observer = new ResizeObserver(() => calculatorRef.current?.resize());
    if (host) observer.observe(host);

    return () => {
      cancelled = true;
      observer.disconnect();
      if (calculator) {
        try {
          sessionStates.set(sessionKey, calculator.getState());
        } catch {
          // Desmos teardown must never prevent the runner from closing cleanly.
        }
        calculator.destroy();
      }
      calculatorRef.current = null;
    };
  }, [onResolved, sessionKey]);

  useEffect(() => {
    if (!active) return;
    const frame = window.requestAnimationFrame(() => calculatorRef.current?.resize());
    return () => window.cancelAnimationFrame(frame);
  }, [active]);

  return <div ref={hostRef} className="desmos-host" aria-label="Desmos graphing calculator" />;
}
