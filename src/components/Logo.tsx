"use client";

/**
 * The mark: a numeral "1" whose serif foot doubles as a rising baseline, with an
 * accent tick climbing off the top. Single stroke weight, currentColor.
 */
export function LogoMark({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 26 26"
      width={size}
      height={size}
      className={className}
      fill="none"
      aria-hidden
    >
      {/* the 1: flag, stem, foot */}
      <path
        d="M7.4 8.4 12.6 4.6v14.4"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.6 21.8h10.2"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* the climb */}
      <path
        d="M17.4 14.2 21.8 9.4"
        stroke="var(--accent)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Mark plus wordmark. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark size={25} className="text-foreground shrink-0" />
      {!compact && (
        <span className="text-[16px] font-semibold tracking-[-0.03em] leading-none">
          1Elevate
        </span>
      )}
    </span>
  );
}
