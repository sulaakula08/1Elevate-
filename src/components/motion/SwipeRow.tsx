"use client";

import { useState } from "react";
import {
  motion,
  useDragControls,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "motion/react";

/**
 * A row you decide about by dragging it: right for the affirmative, left for the
 * negative. Used for reviewing AI drafts and for opening and closing sections.
 *
 * ── Only numbers are animated ──────────────────────────────────────────────
 * The obvious way to write this is to interpolate the colour — danger red
 * through neutral to success green — and it does not work. Motion interpolates
 * colours it can parse: hex, rgb(), hsl(). It cannot parse `var(--danger)` or
 * `color-mix(…)`, which is what every colour in this project is, so such a
 * transform emits a literal unparseable string and the feedback silently does
 * nothing. That was the first version's bug, and it is why nothing here
 * interpolates a colour: two tinted layers sit behind the row with their
 * colours declared in CSS, and the drag animates their *opacity*, a number.
 * The tick and the cross are likewise separate paths, each already the right
 * colour, animated through `pathLength`.
 *
 * ── The gesture has a grip ─────────────────────────────────────────────────
 * Dragging the whole row would have Motion set `user-select: none` on it, and a
 * draft card is full of passage text an author needs to select. A grip also
 * makes the gesture discoverable, which an invisible whole-row drag never is.
 *
 * ── It is always the second way ────────────────────────────────────────────
 * A drag is unreachable by keyboard and invisible to a screen reader, so every
 * caller keeps its ordinary buttons and the grip is hidden under reduced motion.
 */

/** What the caller decided should happen to the row it was asked about. */
export type SwipeOutcome =
  /** Take the row away — it flies out the way it was pushed. */
  | "commit"
  /** Put it back. The caller has taken over, e.g. by opening a dialog. */
  | "revert";

/** How far the row must travel before letting go decides anything. */
const COMMIT = 96;
/** Where the strokes finish drawing — short of COMMIT, so the verdict reads early. */
const DRAWN = 78;
/** A flick decides even when it has not travelled far. */
const FLICK = 500;

type Props = {
  children: React.ReactNode;
  /** Right is the affirmative — keep, reopen. Left is the negative. */
  onSwipe: (direction: "left" | "right") => SwipeOutcome | Promise<SwipeOutcome>;
  disabled?: boolean;
  /** Shown on the grip. Say what each direction does. */
  hint?: string;
  className?: string;
};

export function SwipeRow({
  children,
  onSwipe,
  disabled = false,
  hint = "Drag right or left to decide",
  className = "",
}: Props) {
  const x = useMotionValue(0);
  const controls = useDragControls();
  const [flung, setFlung] = useState<"left" | "right" | null>(null);

  const rightTint = useTransform(x, [0, COMMIT], [0, 1]);
  const leftTint = useTransform(x, [0, -COMMIT], [0, 1]);

  // The cross's second stroke starts after the first, so it reads as being
  // written rather than revealed.
  const tick = useTransform(x, [12, DRAWN], [0, 1]);
  const crossA = useTransform(x, [-12, -DRAWN * 0.6], [0, 1]);
  const crossB = useTransform(x, [-DRAWN * 0.55, -DRAWN], [0, 1]);

  async function onDragEnd(_: unknown, info: PanInfo) {
    const decided = Math.abs(info.velocity.x) > FLICK || Math.abs(info.offset.x) > COMMIT;
    if (!decided) return;

    const direction = info.offset.x > 0 ? "right" : "left";
    setFlung(direction);
    const outcome = await onSwipe(direction);
    if (outcome === "revert") {
      setFlung(null);
      x.set(0);
    }
  }

  return (
    <div className={`swipe-wrap ${className}`}>
      {/* The two verdicts, painted in CSS, revealed by opacity alone. */}
      <motion.div className="swipe-tint swipe-tint-yes" style={{ opacity: rightTint }} aria-hidden />
      <motion.div className="swipe-tint swipe-tint-no" style={{ opacity: leftTint }} aria-hidden />

      <motion.div
        className="swipe-row"
        style={{ x }}
        drag="x"
        // Draggable, but only the grip starts a drag.
        dragListener={false}
        dragControls={controls}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.55}
        dragMomentum={false}
        onDragEnd={onDragEnd}
        animate={flung ? { x: flung === "right" ? 340 : -340, opacity: 0 } : undefined}
        transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
      >
        {/* aria-hidden: this is a pointer affordance, and the caller's buttons
            are what assistive tech and the keyboard use. */}
        <div
          className="swipe-grip"
          title={hint}
          aria-hidden
          onPointerDown={(event) => {
            if (disabled || flung) return;
            controls.start(event);
          }}
        >
          <svg viewBox="0 0 20 20" width="16" height="16">
            <path
              d="M7 5.5h.01M7 10h.01M7 14.5h.01M13 5.5h.01M13 10h.01M13 14.5h.01"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>

          <svg className="swipe-verdict" viewBox="0 0 50 50">
            <motion.path
              className="swipe-tick"
              d="M14,26 L22,33 L35,16"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ pathLength: tick, opacity: tick }}
            />
            <motion.path
              className="swipe-cross"
              d="M17,17 L33,33"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ pathLength: crossA, opacity: crossA }}
            />
            <motion.path
              className="swipe-cross"
              d="M33,17 L17,33"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ pathLength: crossB, opacity: crossB }}
            />
          </svg>
        </div>

        {children}
      </motion.div>
    </div>
  );
}
