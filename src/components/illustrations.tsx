"use client";

/**
 * Line-art illustrations: single weight strokes, currentColor, one accent stop.
 * No fills, no gradients — they read as drawings rather than graphics.
 */

type IconProps = { className?: string; size?: number };

const STROKE = 1.25;

/*
 * Icon set: a solid silhouette in the tone colour carries the shape, with one
 * accent element on top. Duotone rather than hairline outlines, so they hold up
 * at 20px and don't read as stock line icons.
 */

/** Fanned cards — the question bank. */
export function IconRule({ className = "", size = 28 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden>
      <rect
        x="4"
        y="9"
        width="17"
        height="21"
        rx="3"
        fill="currentColor"
        opacity="0.22"
        transform="rotate(-9 12.5 19.5)"
      />
      <rect x="10" y="4" width="18" height="22" rx="3" fill="currentColor" />
      <rect x="14" y="9.5" width="10" height="2.2" rx="1.1" fill="var(--surface)" />
      <rect x="14" y="14" width="7" height="2.2" rx="1.1" fill="var(--surface)" opacity="0.6" />
      <circle cx="16.5" cy="20.8" r="2.4" fill="var(--accent)" />
    </svg>
  );
}

/** Clock with a swept segment — timed mocks. */
export function IconClock({ className = "", size = 28 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden>
      <circle cx="16" cy="18" r="12" fill="currentColor" />
      {/* the elapsed wedge */}
      <path d="M16 18V6a12 12 0 0 1 10.4 6L16 18Z" fill="var(--accent)" />
      <path
        d="M16 11.4V18l4.4 2.9"
        stroke="var(--surface)"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="12.6" y="2" width="6.8" height="2.6" rx="1.3" fill="currentColor" />
    </svg>
  );
}

/** Bubble with a spark — the tutor. */
export function IconChat({ className = "", size = 28 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden>
      <path
        d="M4 9.5A4.5 4.5 0 0 1 8.5 5h15A4.5 4.5 0 0 1 28 9.5v8a4.5 4.5 0 0 1-4.5 4.5H14l-7 5.4V22h1.5A4.5 4.5 0 0 1 4 17.5v-8Z"
        fill="currentColor"
      />
      <circle cx="12.5" cy="13.5" r="1.7" fill="var(--surface)" opacity="0.75" />
      <circle cx="18" cy="13.5" r="1.7" fill="var(--surface)" opacity="0.75" />
      <path
        d="M23.6 9.2l.85 2.15 2.15.85-2.15.85-.85 2.15-.85-2.15-2.15-.85 2.15-.85.85-2.15Z"
        fill="var(--accent)"
      />
    </svg>
  );
}

/** Bars with a break-out arrow — analytics. */
export function IconTrend({ className = "", size = 28 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden>
      <rect x="4" y="19" width="5.4" height="9" rx="2" fill="currentColor" opacity="0.35" />
      <rect x="12.3" y="14" width="5.4" height="14" rx="2" fill="currentColor" opacity="0.6" />
      <rect x="20.6" y="8.5" width="5.4" height="19.5" rx="2" fill="currentColor" />
      <path
        d="M6 13.5 12.5 8l4.2 3.2L24 4"
        stroke="var(--accent)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="24" cy="4" r="2.8" fill="var(--accent)" />
    </svg>
  );
}

/** Circled arrow — "continue". */
export function IconArrow({ className = "", size = 28 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} fill="none" aria-hidden>
      <circle cx="16" cy="16" r="12.5" stroke="currentColor" strokeWidth={STROKE} />
      <path d="M12 16h8m-3.2-3.4L20.2 16l-3.4 3.4" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Drawn tick in a circle — the one celebratory flourish that survived. */
export function SuccessTick({ className = "", size = 56 }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} fill="none" aria-hidden>
      <circle
        cx="24"
        cy="24"
        r="21"
        stroke="var(--success)"
        strokeWidth="1.5"
        pathLength={1}
        className="tick-circle"
      />
      <path
        d="M15 24.5l6 6 12-13"
        stroke="var(--success)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="tick-check"
      />
    </svg>
  );
}

/** Neutral counterpart to SuccessTick, for "keep going" results. */
export function ProgressMark({ className = "", size = 56 }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} fill="none" aria-hidden>
      <circle cx="24" cy="24" r="21" stroke="var(--line-strong)" strokeWidth="1.5" />
      <path
        d="M24 3a21 21 0 0121 21"
        stroke="var(--accent)"
        strokeWidth="1.75"
        strokeLinecap="round"
        pathLength={1}
        className="draw"
      />
      <circle cx="24" cy="24" r="2.5" fill="var(--accent)" />
    </svg>
  );
}

/** Empty state: an open outline with a single accent dot. */
export function EmptyLine({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 90" className={className} fill="none" aria-hidden>
      <rect x="0.5" y="0.5" width="159" height="89" rx="9" stroke="var(--line)" strokeWidth="1" />
      <line x1="24" y1="30" x2="80" y2="30" stroke="var(--line-strong)" strokeWidth={STROKE} />
      <line x1="24" y1="44" x2="62" y2="44" stroke="var(--line)" strokeWidth={STROKE} />
      <line x1="24" y1="58" x2="70" y2="58" stroke="var(--line)" strokeWidth={STROKE} />
      <circle cx="120" cy="44" r="12" stroke="var(--line-strong)" strokeWidth={STROKE} />
      <circle cx="120" cy="44" r="2.5" fill="var(--accent)" />
    </svg>
  );
}
