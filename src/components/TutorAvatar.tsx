"use client";

export type TutorMood = "idle" | "thinking" | "talking";

/**
 * Minimal tutor mark: a ring with two dots. Thinking spins an arc, talking
 * blinks the dots. Line-art only, so it sits quietly next to text.
 */
export function TutorAvatar({ mood, size = 28 }: { mood: TutorMood; size?: number }) {
  return (
    <span className="inline-block shrink-0" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 32 32" width={size} height={size} fill="none">
        <circle cx="16" cy="16" r="14.5" stroke="var(--line-strong)" strokeWidth="1.25" />

        {mood === "thinking" && (
          <g className="tutor-ring" style={{ transformOrigin: "16px 16px" }}>
            <path
              d="M16 1.5A14.5 14.5 0 0130.5 16"
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>
        )}

        {mood === "talking" ? (
          <g fill="var(--foreground)">
            <circle cx="11.5" cy="16" r="1.6" className="tutor-eye" />
            <circle cx="16" cy="16" r="1.6" className="tutor-eye" style={{ animationDelay: "0.15s" }} />
            <circle cx="20.5" cy="16" r="1.6" className="tutor-eye" style={{ animationDelay: "0.3s" }} />
          </g>
        ) : (
          <g fill="var(--foreground)">
            <circle cx="12" cy="14" r="1.6" className="tutor-eye" />
            <circle cx="20" cy="14" r="1.6" className="tutor-eye" />
            <path
              d="M12 20.5c1.2 1.1 2.5 1.6 4 1.6s2.8-.5 4-1.6"
              stroke="var(--line-strong)"
              strokeWidth="1.25"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        )}
      </svg>
    </span>
  );
}
