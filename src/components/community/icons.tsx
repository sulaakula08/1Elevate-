"use client";

/** Community action icons — same 1.6px stroke language as components/NavIcons.tsx. */
const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconComment({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H10l-4 3.2V16H6.5A2.5 2.5 0 0 1 4 13.5v-7Z" {...S} />
    </svg>
  );
}

export function IconSave({ size = 16, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        d="M6.5 4.5h11a.5.5 0 0 1 .5.5v14.3a.4.4 0 0 1-.63.33L12 15.6l-5.37 4.03a.4.4 0 0 1-.63-.33V5a.5.5 0 0 1 .5-.5Z"
        {...S}
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}
