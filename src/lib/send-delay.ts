"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A deliberate pause on the way out.
 *
 * Community writes are optimistic — the post or comment is in the store before
 * the server answers — which meant the composer closed the instant you clicked
 * and left no sign that anything had been sent. This holds a "sending" state for
 * a beat so the action is legible, then performs it.
 *
 * It is an honest lie: the wait is not the network, and the code says so rather
 * than pretending. Kept short enough to read as responsiveness rather than
 * latency, and the work still happens even if the component unmounts mid-wait,
 * because the write must not depend on the animation finishing.
 */
const DELAY_MS = 1100;

export function useSendDelay(delay = DELAY_MS) {
  const [pending, setPending] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  /** Ignores repeat calls while a send is in flight, so one click means one post. */
  const send = useCallback(
    (action: () => void) => {
      if (timer.current !== null) return;
      setPending(true);
      timer.current = window.setTimeout(() => {
        timer.current = null;
        // Run the action before clearing, so nothing can observe "not pending,
        // not done" and offer the button again for a second click.
        action();
        setPending(false);
      }, delay);
    },
    [delay],
  );

  return { pending, send };
}
