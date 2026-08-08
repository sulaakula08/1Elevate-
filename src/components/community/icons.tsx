"use client";

/**
 * Community action icons.
 *
 * Each one has an outline state and a filled state, because these are toggles
 * and a toggle needs to read as on or off at a glance — a stroke-weight change
 * alone does not carry across a 16px icon. The filled variants are solid
 * silhouettes rather than the same outline with a fill dropped in, so the shape
 * stays legible once it is one block of colour.
 *
 * Geometry is drawn on a 24px grid at a 1.7px stroke, matching NavIcons.
 */

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

type IconProps = { size?: number; filled?: boolean };

function Svg({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden focusable="false">
      {children}
    </svg>
  );
}

/** Speech bubble with a tail — comments. */
export function IconComment({ size = 16, filled = false }: IconProps) {
  return (
    <Svg size={size}>
      {filled ? (
        <path
          d="M12 3.2c-4.8 0-8.7 3.1-8.7 7 0 2.2 1.2 4.1 3.1 5.4-.15 1.2-.66 2.3-1.4 3.2-.24.3-.02.75.36.7 1.9-.24 3.5-.98 4.6-1.8.66.12 1.34.18 2.04.18 4.8 0 8.7-3.1 8.7-7s-3.9-7-8.7-7Z"
          fill="currentColor"
        />
      ) : (
        <path
          d="M12 3.9c-4.4 0-8 2.8-8 6.3 0 2 1.16 3.8 2.97 5-.16 1.2-.64 2.25-1.35 3.1 1.75-.2 3.24-.88 4.3-1.66.66.12 1.36.19 2.08.19 4.4 0 8-2.8 8-6.3s-3.6-6.3-8-6.3Z"
          {...STROKE}
        />
      )}
    </Svg>
  );
}

/** Bookmark — saved posts. */
export function IconSave({ size = 16, filled = false }: IconProps) {
  return (
    <Svg size={size}>
      <path
        d="M6.75 4h10.5c.41 0 .75.34.75.75v14.9c0 .6-.68.95-1.17.6L12 16.6l-4.83 3.65c-.49.35-1.17 0-1.17-.6V4.75c0-.41.34-.75.75-.75Z"
        {...STROKE}
        fill={filled ? "currentColor" : "none"}
        stroke={filled ? "none" : "currentColor"}
      />
    </Svg>
  );
}

/**
 * A hand raised in acknowledgement — "helpful".
 *
 * A thumbs-up was the obvious choice and the wrong one: it is a like, and this
 * reaction means "this answered my question". A raised hand reads as the
 * classroom gesture the feed is actually modelling.
 */
export function IconHelpful({ size = 16, filled = false }: IconProps) {
  return (
    <Svg size={size}>
      <path
        d="M9.2 11.4V5.6a1.35 1.35 0 0 1 2.7 0v4.3m0 0V4.4a1.35 1.35 0 0 1 2.7 0v5.5m0 0V6.3a1.35 1.35 0 0 1 2.7 0v6.9c0 3.6-2.3 6.4-5.9 6.4-2.4 0-4-1-5.1-2.9l-2.1-3.6a1.4 1.4 0 0 1 2.2-1.7l1.5 1.7"
        {...STROKE}
        fill={filled ? "currentColor" : "none"}
      />
    </Svg>
  );
}

/** A rosette — "congrats", for score and milestone posts. */
export function IconCongrats({ size = 16, filled = false }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="9" r="5.2" {...STROKE} fill={filled ? "currentColor" : "none"} />
      <path d="M8.6 13.6 7.4 20.2l4.6-2.3 4.6 2.3-1.2-6.6" {...STROKE} />
    </Svg>
  );
}

/** Share / copy a link to a post. */
export function IconShare({ size = 16 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 15.2V4.6m0 0L8.4 8.2M12 4.6l3.6 3.6" {...STROKE} />
      <path d="M5.2 13.4v4.6c0 .9.7 1.6 1.6 1.6h10.4c.9 0 1.6-.7 1.6-1.6v-4.6" {...STROKE} />
    </Svg>
  );
}

/* ---------------- post types ----------------
   The composer used emoji for these. Emoji are a typeface, not an icon set:
   they arrive at the platform's own weight, colour and optical size, so six of
   them in a grid read as six different illustrations rather than one family —
   and they cannot take the accent colour when a type is selected.

   These share the geometry above. Each has a filled variant so the chosen type
   is unmistakable without relying on the card border alone. */

/** Ask a question — a speech bubble carrying a query. */
export function IconAsk({ size = 20, filled = false }: IconProps) {
  return (
    <Svg size={size}>
      <path
        d="M12 3.9c-4.4 0-8 2.8-8 6.3 0 2 1.16 3.8 2.97 5-.16 1.2-.64 2.25-1.35 3.1 1.75-.2 3.24-.88 4.3-1.66.66.12 1.36.19 2.08.19 4.4 0 8-2.8 8-6.3s-3.6-6.3-8-6.3Z"
        {...STROKE}
        fill={filled ? "currentColor" : "none"}
      />
      <path
        d="M10.4 8.5a1.7 1.7 0 0 1 3.3.55c0 1.13-1.7 1.45-1.7 2.55"
        {...STROKE}
        stroke={filled ? "var(--surface)" : "currentColor"}
      />
      <circle cx="12" cy="14.1" r="0.85" fill={filled ? "var(--surface)" : "currentColor"} />
    </Svg>
  );
}

/** Share progress — a score line stepping up. */
export function IconProgress({ size = 20, filled = false }: IconProps) {
  return (
    <Svg size={size}>
      {filled && <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="3.4" fill="currentColor" />}
      <path
        d="M5.5 15.6 9.6 11.4l3 2.6 5.4-5.6"
        {...STROKE}
        stroke={filled ? "var(--surface)" : "currentColor"}
      />
      <path
        d="M14.6 8.4H18v3.4"
        {...STROKE}
        stroke={filled ? "var(--surface)" : "currentColor"}
      />
    </Svg>
  );
}

/** Explain something — a lamp, drawn rather than the emoji bulb. */
export function IconExplain({ size = 20, filled = false }: IconProps) {
  return (
    <Svg size={size}>
      <path
        d="M12 3.6a5.7 5.7 0 0 0-3.4 10.28c.5.37.8.94.8 1.55v.37h5.2v-.37c0-.61.3-1.18.8-1.55A5.7 5.7 0 0 0 12 3.6Z"
        {...STROKE}
        fill={filled ? "currentColor" : "none"}
      />
      <path d="M10.1 18.4h3.8M10.8 20.6h2.4" {...STROKE} />
    </Svg>
  );
}

/** Study update — a checklist, the shape of a finished session. */
export function IconStudyUpdate({ size = 20, filled = false }: IconProps) {
  return (
    <Svg size={size}>
      <path
        d="M6.4 3.9h11.2c.5 0 .9.4.9.9v14.4c0 .5-.4.9-.9.9H6.4a.9.9 0 0 1-.9-.9V4.8c0-.5.4-.9.9-.9Z"
        {...STROKE}
        fill={filled ? "currentColor" : "none"}
      />
      <path
        d="m8.6 9 1.3 1.3 2.3-2.3M8.6 15l1.3 1.3 2.3-2.3M14.6 9.3h2.2M14.6 15.3h2.2"
        {...STROKE}
        stroke={filled ? "var(--surface)" : "currentColor"}
      />
    </Svg>
  );
}

/** Achievement — a trophy. */
export function IconAchievement({ size = 20, filled = false }: IconProps) {
  return (
    <Svg size={size}>
      <path
        d="M7.6 4.2h8.8v4.3a4.4 4.4 0 0 1-8.8 0V4.2Z"
        {...STROKE}
        fill={filled ? "currentColor" : "none"}
      />
      <path d="M7.6 5.6H5.3a2.4 2.4 0 0 0 2.4 2.4M16.4 5.6h2.3a2.4 2.4 0 0 1-2.4 2.4" {...STROKE} />
      <path d="M12 12.9v3.5M9 19.8h6M9.9 16.4h4.2l.7 3.4H9.2l.7-3.4Z" {...STROKE} />
    </Svg>
  );
}

/** Share a resource — a document with a corner fold. */
export function IconResource({ size = 20, filled = false }: IconProps) {
  return (
    <Svg size={size}>
      <path
        d="M13.4 3.6H7.3a1 1 0 0 0-1 1v14.8a1 1 0 0 0 1 1h9.4a1 1 0 0 0 1-1V7.8l-4.3-4.2Z"
        {...STROKE}
        fill={filled ? "currentColor" : "none"}
      />
      <path d="M13.3 3.7v4.2h4.3" {...STROKE} stroke={filled ? "var(--surface)" : "currentColor"} />
      <path
        d="M9.1 12.6h5.8M9.1 16h4"
        {...STROKE}
        stroke={filled ? "var(--surface)" : "currentColor"}
      />
    </Svg>
  );
}

/** Every post type, keyed the way CommunityPostType is. */
export const POST_TYPE_ICON = {
  question: IconAsk,
  progress: IconProgress,
  explanation: IconExplain,
  "study-update": IconStudyUpdate,
  achievement: IconAchievement,
  resource: IconResource,
} as const;
