"use client";

/**
 * Line-art illustrations: single weight strokes, currentColor, one accent stop.
 * No fills, no gradients — they read as drawings rather than graphics.
 */

type IconProps = { className?: string; size?: number };

const STROKE = 1.25;

/** Hero: a framed rising trend with a dotted baseline and one accent point. */
export function HeroLines({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 440 300"
      className={className}
      fill="none"
      role="img"
      aria-label="A rising score line inside a chart frame"
    >
      {/* frame */}
      <rect
        x="0.5"
        y="0.5"
        width="439"
        height="299"
        rx="11"
        stroke="var(--line)"
        strokeWidth="1"
      />

      {/* horizontal rules */}
      {[74, 148, 222].map((y) => (
        <line key={y} x1="1" y1={y} x2="439" y2={y} stroke="var(--line)" strokeWidth="1" />
      ))}

      {/* dot grid */}
      {Array.from({ length: 7 }, (_, col) =>
        Array.from({ length: 3 }, (_, row) => (
          <circle
            key={`${col}-${row}`}
            cx={56 + col * 55}
            cy={56 + row * 74}
            r="1"
            fill="var(--line-strong)"
          />
        )),
      )}

      {/* the line */}
      <path
        d="M40 236 C 96 232, 118 186, 166 180 S 232 196, 268 138 S 336 96, 400 62"
        stroke="var(--foreground)"
        strokeWidth={STROKE + 0.35}
        strokeLinecap="round"
        pathLength={1}
        className="draw"
      />

      {/* points */}
      {[
        [166, 180],
        [268, 138],
      ].map(([cx, cy]) => (
        <circle
          key={cx}
          cx={cx}
          cy={cy}
          r="3"
          fill="var(--surface)"
          stroke="var(--foreground)"
          strokeWidth={STROKE}
        />
      ))}
      <circle cx="400" cy="62" r="4.5" fill="var(--accent)" />
      <circle
        cx="400"
        cy="62"
        r="11"
        stroke="var(--accent)"
        strokeWidth="1"
        opacity="0.35"
      />

      {/* axis ticks */}
      <line x1="40" y1="264" x2="400" y2="264" stroke="var(--line-strong)" strokeWidth="1" />
      {[40, 130, 220, 310, 400].map((x) => (
        <line key={x} x1={x} y1="264" x2={x} y2="270" stroke="var(--line-strong)" strokeWidth="1" />
      ))}
    </svg>
  );
}

/** A stack of ruled cards — the question bank. */
export function IconRule({ className = "", size = 28 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} fill="none" aria-hidden>
      <rect x="3.5" y="7.5" width="21" height="21" rx="3" stroke="var(--line-strong)" strokeWidth={STROKE} />
      <rect x="7.5" y="3.5" width="21" height="21" rx="3" stroke="currentColor" strokeWidth={STROKE} />
      <line x1="12" y1="10.5" x2="24" y2="10.5" stroke="currentColor" strokeWidth={STROKE} />
      <line x1="12" y1="14.5" x2="21" y2="14.5" stroke="var(--line-strong)" strokeWidth={STROKE} />
      <line x1="12" y1="18.5" x2="18" y2="18.5" stroke="var(--line-strong)" strokeWidth={STROKE} />
    </svg>
  );
}

/** Clock — timed mocks. */
export function IconClock({ className = "", size = 28 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} fill="none" aria-hidden>
      <circle cx="16" cy="17" r="12" stroke="currentColor" strokeWidth={STROKE} />
      <path d="M16 10.5V17l4.5 3" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
      <path d="M12.5 3.5h7" stroke="var(--line-strong)" strokeWidth={STROKE} strokeLinecap="round" />
    </svg>
  );
}

/** Speech bubble — the tutor. */
export function IconChat({ className = "", size = 28 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} fill="none" aria-hidden>
      <path
        d="M5 9a3 3 0 013-3h16a3 3 0 013 3v10a3 3 0 01-3 3h-8l-6 5v-5H8a3 3 0 01-3-3V9z"
        stroke="currentColor"
        strokeWidth={STROKE}
      />
      <circle cx="12" cy="14" r="1.15" fill="var(--accent)" />
      <circle cx="16" cy="14" r="1.15" fill="currentColor" opacity="0.5" />
      <circle cx="20" cy="14" r="1.15" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

/** Small trend line — analytics. */
export function IconTrend({ className = "", size = 28 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} fill="none" aria-hidden>
      <path d="M4 27h24" stroke="var(--line-strong)" strokeWidth={STROKE} strokeLinecap="round" />
      <path
        d="M5 21l7-7 5 4 9-11"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="26" cy="7" r="2.6" fill="var(--accent)" />
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
