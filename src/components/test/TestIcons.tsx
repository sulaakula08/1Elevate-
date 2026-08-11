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

export function IconClock({ size = 18, className = "" }: Props) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4l2.8 1.8" />
    </svg>
  );
}

export function IconInfo({ size = 18, className = "" }: Props) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 9v4.5M10 6.4v.01" />
    </svg>
  );
}

export function IconExplanation({ size = 18, className = "" }: Props) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M5 4h10v12H5zM8 7h4M8 10h4M8 13h2" />
      <path d="m3 7 .8.8L5.5 6" />
    </svg>
  );
}

export function IconReport({ size = 18, className = "" }: Props) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M5 18V3M5 4h9l-1.8 3L14 10H5" />
    </svg>
  );
}

export function IconFullscreen({ size = 18, className = "" }: Props) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M7 3H3v4M13 3h4v4M17 13v4h-4M7 17H3v-4" />
    </svg>
  );
}

export function IconKeyboard({ size = 18, className = "" }: Props) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <rect x="2.5" y="5" width="15" height="10" rx="1.8" />
      <path d="M5 8h.01M8 8h.01M11 8h.01M14 8h.01M5 11h.01M8 11h.01M11 11h.01M14 11h.01M7 13h6" />
    </svg>
  );
}

export function IconMoon({ size = 18, className = "" }: Props) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M15.8 12.5A6.6 6.6 0 0 1 7.5 4.2 6.7 6.7 0 1 0 15.8 12.5Z" />
    </svg>
  );
}

export function IconSun({ size = 18, className = "" }: Props) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <circle cx="10" cy="10" r="3" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M15.7 4.3l-1.4 1.4M5.7 14.3l-1.4 1.4" />
    </svg>
  );
}

export function IconBug({ size = 18, className = "" }: Props) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <rect x="6" y="6" width="8" height="9" rx="4" />
      <path d="M8 6V4.5M12 6V4.5M3.5 8h2.5M14 8h2.5M3.5 12h2.5M14 12h2.5M10 8.5v4" />
    </svg>
  );
}

export function IconTrash({ size = 18, className = "" }: Props) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M4.5 6h11M8 3.5h4l.7 2.5H7.3L8 3.5ZM6.5 6l.6 11h5.8l.6-11M9 9v5M11.5 9v5" />
    </svg>
  );
}
