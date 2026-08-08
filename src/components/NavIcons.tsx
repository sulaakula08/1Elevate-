"use client";

/** 20px line icons for navigation. Stroke follows currentColor. */
const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function NavHome({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d="M3.5 10.5 12 4l8.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-6v6H5A1.5 1.5 0 0 1 3.5 19v-8.5Z" {...S} />
    </svg>
  );
}

export function NavPractice({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect x="4" y="3.5" width="16" height="17" rx="2.5" {...S} />
      <path d="M8 9h8M8 13h6M8 17h4" {...S} />
    </svg>
  );
}

export function NavMock({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="13" r="8" {...S} />
      <path d="M12 9v4l2.5 2M9.5 2.5h5" {...S} />
    </svg>
  );
}

export function NavReview({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" {...S} />
      <path d="M20 3.5V7h-3.5" {...S} />
      <path d="M12 8.5v4l2.5 1.5" {...S} />
    </svg>
  );
}

export function NavProgress({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d="M4 20h16" {...S} />
      <path d="M6.5 20v-6M12 20V8m5.5 12v-9" {...S} />
    </svg>
  );
}

export function NavTutorial({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="12" r="8.5" {...S} />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.3" {...S} />
      <circle cx="12" cy="16.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function NavCommunity({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="9" cy="8.5" r="3" {...S} />
      <path d="M3.75 19c.5-3 2.6-4.7 5.25-4.7s4.75 1.7 5.25 4.7" {...S} />
      <circle cx="16.5" cy="7.5" r="2.35" {...S} />
      <path d="M15 14.6c2.15.15 3.85 1.7 4.25 4.4" {...S} />
    </svg>
  );
}

/** A speech bubble: the section is for saying something, not for reading. */
export function NavFeedback({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d="M20 13.5a2.5 2.5 0 0 1-2.5 2.5H9l-4 3.2V16H6.5A2.5 2.5 0 0 1 4 13.5v-6A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5Z" {...S} />
    </svg>
  );
}

/** Three faders. A circle with radiating lines — the previous icon — is a sun. */
export function NavSettings({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d="M4 7.5h9M17.5 7.5H20M4 16.5h4M12.5 16.5H20" {...S} />
      <circle cx="15" cy="7.5" r="2.1" {...S} />
      <circle cx="10.5" cy="16.5" r="2.1" {...S} />
    </svg>
  );
}

export function NavAdmin({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d="M12 3.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 8.8l5-.7L12 3.5Z" {...S} />
    </svg>
  );
}

export function NavMore({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="5.5" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="18.5" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}
