"use client";

/**
 * The mark: three bars climbing left to right, where the tallest one *is* the
 * numeral 1 — so the brand name and the thing the product sells (a score that
 * goes up) are the same shape rather than two ideas stacked on one canvas. The
 * flag of the 1 leans back over the climb, which is what keeps the silhouette
 * from reading as a signal-strength icon.
 *
 * Drawn for 24px: nothing is a stroke, the bars are a full 6 units wide with
 * 1.8 units of air between them, and the smallest detail — the gap under the
 * flag — is still 2.7px at navbar size.
 *
 * One SVG serves both themes. The climb resolves from `--brand`, which each
 * theme redefines, and the numeral takes `currentColor` from whatever it sits
 * in — so switching theme repaints in place with no second asset to swap and
 * nothing to shift. The mark is decorative: `Logo` carries the text label.
 */
export function LogoMark({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 28 28" width={size} height={size} className={className} aria-hidden>
      {/* the climb — faded at the back so it reads as ground already covered */}
      <rect x="3.2" y="19.2" width="6" height="5.3" rx="1" fill="var(--brand)" opacity="0.55" />
      <rect x="11" y="14.2" width="6" height="10.3" rx="1" fill="var(--brand)" />
      {/* the 1, standing on the same baseline as the bars it tops */}
      <path d="M18.8 24.5V8.9L15.6 11 14 7.7 20.6 3.5h4.2v21h-6Z" fill="currentColor" />
    </svg>
  );
}

/** Mark plus wordmark. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark size={24} className="text-foreground shrink-0" />
      {compact ? (
        // The mark alone is not a name. Call sites that wrap it in a labelled
        // link already win the name computation; this is for the ones that don't.
        <span className="sr-only">1Elevate</span>
      ) : (
        <span className="text-body font-semibold tracking-[-0.035em] leading-none">
          1Elevate
        </span>
      )}
    </span>
  );
}
