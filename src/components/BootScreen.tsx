"use client";

import { Logo } from "./Logo";

/**
 * What a returning student sees while their session is being restored.
 *
 * It is always in the markup and hidden by default; the boot script in
 * layout.tsx stamps `data-session="restoring"` on the root element before the
 * first paint, and CSS swaps this in for the landing page. Doing it that way
 * rather than with a React branch keeps the server's markup and the client's
 * first render identical — the decision depends on localStorage, which the
 * server cannot read, so any branch taken in React would either hydrate
 * mismatched or arrive a render too late, which is the flash being fixed.
 *
 * Deliberately quiet: a wordmark and a line. It is on screen for under two
 * seconds and anything more energetic would draw the eye to a wait.
 */
type Props = {
  /**
   * Rendered because the app decided to, rather than sitting in the markup
   * waiting for CSS. Sign-in and sign-out happen long after hydration, so a
   * React branch is free of the constraint that shaped the pre-paint path.
   */
  standalone?: boolean;
  label?: string;
};

export function BootScreen({ standalone = false, label = "Signing you in…" }: Props) {
  return (
    <div
      className="boot-screen"
      data-standalone={standalone ? "true" : undefined}
      role="status"
      aria-live="polite"
    >
      <div className="boot-screen-inner">
        <Logo />
        <span className="boot-bar" aria-hidden />
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}
