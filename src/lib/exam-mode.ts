"use client";

import { useEffect } from "react";

/**
 * Strips the app chrome away for the duration of a timed test.
 *
 * The real digital test app gives a student one thing to look at, and a sidebar
 * offering "Practice" beside a live clock is an invitation to lose the section.
 * A body attribute rather than a prop threaded through AppShell: the runner is
 * rendered several levels below the shell, and the shell has no business
 * knowing which page is currently a test.
 */
export function useExamMode(active = true) {
  useEffect(() => {
    if (!active) return;
    document.body.dataset.exam = "on";
    return () => {
      delete document.body.dataset.exam;
    };
  }, [active]);
}
