"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Fullscreen, with a label that tells the truth.
 *
 * The practice runner used to read `document.fullscreenElement` during render to
 * decide between "Fullscreen" and "Exit fullscreen". That is not reactive — the
 * browser fires an event when fullscreen changes, it does not re-render React —
 * so the menu kept saying "Fullscreen" while already fullscreen, and said the
 * opposite after Escape. Listening to `fullscreenchange` is the only way the
 * label can be right, and it also catches the ways out that are not our button:
 * Escape, F11, and the browser's own control.
 */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  /**
   * Requesting fullscreen can be refused — an iframe without the permission, a
   * gesture the browser did not accept — and a rejected promise here would be an
   * unhandled rejection over a live test. The caller gets the outcome instead.
   */
  const toggle = useCallback(async (): Promise<boolean> => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      return true;
    } catch {
      return false;
    }
  }, []);

  return { isFullscreen, toggle };
}
