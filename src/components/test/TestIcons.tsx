"use client";

/** Toolbar glyphs for the test surface: one weight, currentColor, 20px grid. */

type Props = { size?: number; className?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 20 20",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export function IconHighlight({ size = 18, className = "" }: Props) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M4 15.5 3.2 17.8l2.3-.8 8.4-8.4-1.5-1.5L4 15.5Z" />
      <path d="M12.4 7.1 14.6 4.9a1.4 1.4 0 0 1 2 0l.5.5a1.4 1.4 0 0 1 0 2l-2.2 2.2" />
    </svg>
  );
}

export function IconCalculator({ size = 18, className = "" }: Props) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <rect x="4" y="2.5" width="12" height="15" rx="2" />
      <path d="M6.5 6h7M7 10h.01M10 10h.01M13 10h.01M7 13.5h.01M10 13.5h.01M13 13.5h.01" />
    </svg>
  );
}

export function IconReference({ size = 18, className = "" }: Props) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H15v14H5.5A1.5 1.5 0 0 0 4 18.5v-14Z" />
      <path d="M15 3v14M7 7h5M7 10h3" />
    </svg>
  );
}

export function IconFlag({ size = 16, className = "", filled = false }: Props & { filled?: boolean }) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M5 18V3" />
      <path d="M5 3.8h9.5l-2 3.1 2 3.1H5" fill={filled ? "currentColor" : "none"} />
    </svg>
  );
}

export function IconCrossOut({ size = 18, className = "" }: Props) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <circle cx="10" cy="10" r="7" />
      <path d="M5.5 14.5 14.5 5.5" />
    </svg>
  );
}

export function IconMore({ size = 18, className = "" }: Props) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M10 5.2v.01M10 10v.01M10 14.8v.01" strokeWidth={2.4} />
    </svg>
  );
}

export function IconChevron({ size = 14, className = "" }: Props) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="m5.5 8 4.5 4.5L14.5 8" />
    </svg>
  );
}

export function IconPause({ size = 14, className = "" }: Props) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M7.5 5v10M12.5 5v10" />
    </svg>
  );
}

export function IconPlay({ size = 14, className = "" }: Props) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M7 4.8 15 10l-8 5.2V4.8Z" />
    </svg>
  );
}
