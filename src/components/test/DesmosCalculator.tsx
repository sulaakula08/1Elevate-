"use client";

import { useEffect, useRef } from "react";

/**
 * The Desmos graphing calculator, as the real digital SAT provides it.
 *
 * Desmos ships as a script from their own servers, so this is the one thing in
 * the app that needs the network at runtime. That is why it is never the only
 * calculator: CalculatorPanel falls back to the built-in one when the script
 * cannot be had, which is what the student would otherwise be left staring at
 * — a panel that says "Loading calculator…" forever.
 */

/** Minimal surface of the API actually used here; Desmos ships no types. */
type DesmosInstance = { destroy: () => void; resize?: () => void };
type DesmosApi = {
  GraphingCalculator: (element: HTMLElement, options?: Record<string, unknown>) => DesmosInstance;
};

declare global {
  interface Window {
    Desmos?: DesmosApi;
  }
}

/**
 * The key Desmos publishes for trying the API out. It works, and it is not a
 * licence — see the note in DESMOS.md before this reaches real students.
 */
const DEMO_KEY = "dcb31709b452b1cf9dc26972add0fda6";

const API_KEY = process.env.NEXT_PUBLIC_DESMOS_API_KEY || DEMO_KEY;
const VERSION = process.env.NEXT_PUBLIC_DESMOS_VERSION || "v1.11";
const SRC = `https://www.desmos.com/api/${VERSION}/calculator.js?apiKey=${API_KEY}`;

/** How long to wait before deciding the script is not coming. */
const TIMEOUT_MS = 8000;

let loader: Promise<boolean> | null = null;

/**
 * Loads the script once per page, whatever the number of calculators.
 *
 * A failed load clears the cached promise, so a student who opens the panel
 * again after their connection comes back gets a fresh attempt rather than the
 * fallback for the rest of the session.
 */
function loadDesmos(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Desmos) return Promise.resolve(true);
  if (loader) return loader;

  loader = new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = SRC;
    script.async = true;

    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (!ok) loader = null;
      resolve(ok);
    };

    const timer = window.setTimeout(() => finish(false), TIMEOUT_MS);
    script.onload = () => finish(Boolean(window.Desmos));
    script.onerror = () => finish(false);
    document.head.appendChild(script);
  });

  return loader;
}

type Props = {
  /** Told whether the calculator actually appeared, so the caller can fall back. */
  onResolved: (ok: boolean) => void;
};

export function DesmosCalculator({ onResolved }: Props) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let instance: DesmosInstance | null = null;

    void loadDesmos().then((ok) => {
      // The panel can be closed while the script is still in flight; building a
      // calculator into a detached node leaks it.
      if (cancelled) return;
      if (!ok || !window.Desmos || !host.current) {
        onResolved(false);
        return;
      }
      try {
        instance = window.Desmos.GraphingCalculator(host.current, {
          // Close to what the exam offers: the graph and its keypad, without
          // the account and sharing chrome that has nowhere to go here.
          expressions: true,
          keypad: true,
          settingsMenu: false,
          zoomButtons: true,
          border: false,
          images: false,
          folders: false,
          notes: false,
          // The app's own theme, so the panel does not glare in a dark room.
          invertedColors: document.documentElement.dataset.theme === "dark",
        });
        onResolved(true);
      } catch {
        onResolved(false);
      }
    });

    return () => {
      cancelled = true;
      // Desmos attaches listeners and a render loop of its own; without this
      // they outlive the panel and keep running for the rest of the session.
      instance?.destroy();
    };
  }, [onResolved]);

  return <div ref={host} className="desmos-host" />;
}
