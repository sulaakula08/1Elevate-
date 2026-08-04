"use client";

/**
 * The mark: a solid numeral 1 cut from a rising wedge. The wedge climbs left to
 * right (elevate) and the counter-space through it reads as the 1's stem, so the
 * shape carries both ideas without a stroke-icon look. One accent step at the
 * top-right marks the next rung.
 */
export function LogoMark({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 28 28" width={size} height={size} className={className} aria-hidden>
      {/* rising wedge */}
      <path
        d="M2 24.4 A1.6 1.6 0 0 1 3.6 22.8h4.2A1.6 1.6 0 0 1 9.4 24.4v0A1.6 1.6 0 0 1 7.8 26H3.6A1.6 1.6 0 0 1 2 24.4Z"
        fill="currentColor"
      />
      {/* the 1: heavy stem with an angled flag, sitting on its own plinth */}
      <path
        d="M12.6 26V9.9L9.1 12 7.7 8.9 14.2 5h3.9v21h-5.5Z"
        fill="currentColor"
      />
      {/* the next step up */}
      <path
        d="M21.2 12.4a1.7 1.7 0 0 1 1.7-1.7h2.4a1.7 1.7 0 0 1 1.7 1.7v11.9a1.7 1.7 0 0 1-1.7 1.7h-2.4a1.7 1.7 0 0 1-1.7-1.7V12.4Z"
        fill="var(--accent)"
      />
    </svg>
  );
}

/** Mark plus wordmark. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark size={24} className="text-foreground shrink-0" />
      {!compact && (
        <span className="text-[16.5px] font-semibold tracking-[-0.035em] leading-none">
          1Elevate
        </span>
      )}
    </span>
  );
}
