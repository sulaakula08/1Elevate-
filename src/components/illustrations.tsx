"use client";

/**
 * Line-art illustrations: single weight strokes, currentColor, one accent stop.
 * No fills, no gradients — they read as drawings rather than graphics.
 */

type IconProps = { className?: string; size?: number };

const STROKE = 1.25;

/**
 * Hero: a score report card. Four mock results climb toward a 1600 flag, with a
 * filled area under the curve, real axis labels and a module breakdown — so it
 * reads as a product screen rather than decoration.
 */
export function HeroScoreCard({ className = "" }: { className?: string }) {
  const points = [
    { x: 62, y: 196, label: "1" },
    { x: 148, y: 168, label: "2" },
    { x: 234, y: 132, label: "3" },
    { x: 320, y: 86, label: "4" },
  ];
  const line = `M${points.map((p) => `${p.x},${p.y}`).join(" L")}`;
  const area = `${line} L320,232 L62,232 Z`;

  return (
    <svg
      viewBox="0 0 400 300"
      className={className}
      role="img"
      aria-label="Four mock scores rising toward 1600"
    >
      <defs>
        <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* card */}
      <rect
        x="0.5"
        y="0.5"
        width="399"
        height="299"
        rx="14"
        fill="var(--surface)"
        stroke="var(--line)"
      />

      {/* header */}
      <text x="24" y="34" fontSize="13" fontWeight="600" fill="var(--foreground)">
        Score trend
      </text>
      <rect x="300" y="20" width="76" height="20" rx="10" fill="var(--accent-soft)" />
      <text
        x="338"
        y="34"
        fontSize="11"
        fontWeight="700"
        textAnchor="middle"
        fill="var(--accent)"
      >
        1600 goal
      </text>

      {/* gridlines + y labels */}
      {[
        { y: 72, label: "1600" },
        { y: 126, label: "1400" },
        { y: 180, label: "1200" },
        { y: 232, label: "1000" },
      ].map((row) => (
        <g key={row.label}>
          <line
            x1="62"
            y1={row.y}
            x2="376"
            y2={row.y}
            stroke="var(--line)"
            strokeDasharray={row.label === "1600" ? "4 4" : undefined}
          />
          <text x="52" y={row.y + 4} fontSize="10" textAnchor="end" fill="var(--faint)">
            {row.label}
          </text>
        </g>
      ))}

      {/* the curve */}
      <path d={area} fill="url(#hero-area)" />
      <path
        d={line}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="draw"
      />

      {/* points + x labels */}
      {points.map((p, i) => (
        <g key={p.label}>
          <circle
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 6 : 4}
            fill={i === points.length - 1 ? "var(--accent)" : "var(--surface)"}
            stroke="var(--accent)"
            strokeWidth="2.2"
          />
          <text x={p.x} y="252" fontSize="10" textAnchor="middle" fill="var(--faint)">
            Mock {p.label}
          </text>
        </g>
      ))}

      {/* latest score callout */}
      <g>
        <rect x="292" y="52" width="58" height="24" rx="6" fill="var(--foreground)" />
        <text
          x="321"
          y="68"
          fontSize="12"
          fontWeight="700"
          textAnchor="middle"
          fill="var(--background)"
        >
          1480
        </text>
      </g>

      {/* module breakdown */}
      <line x1="24" y1="266" x2="376" y2="266" stroke="var(--line)" />
      {[
        { x: 24, name: "Reading & Writing", value: "740", w: 150 },
        { x: 200, name: "Math", value: "740", w: 110 },
      ].map((col) => (
        <g key={col.name}>
          <text x={col.x} y="284" fontSize="10" fill="var(--muted)">
            {col.name}
          </text>
          <text
            x={col.x + col.w}
            y="284"
            fontSize="11"
            fontWeight="700"
            textAnchor="end"
            fill="var(--foreground)"
          >
            {col.value}
          </text>
        </g>
      ))}
    </svg>
  );
}

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
