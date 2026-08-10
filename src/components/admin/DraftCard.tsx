"use client";

import { useState } from "react";
import { motion, useMotionValue, useTransform, type PanInfo } from "motion/react";

/**
 * A generated draft, reviewable by dragging.
 *
 * The gesture is the point: reviewing AI drafts is a long run of the same
 * binary call — keep this one, bin that one — and a drag says which one you
 * mean with the same movement that dismisses the card. The tick and the cross
 * draw themselves as you pull, so the verdict is legible before you let go and
 * a half-hearted drag springs back with nothing committed.
 *
 * It is an addition, never the only way. The two buttons underneath stay
 * exactly as they were: a drag is unreachable by keyboard, invisible to a
 * screen reader, and undiscoverable until someone tries it.
 */

/** How far the card must travel before letting go commits anything. */
const COMMIT = 96;
/** Where the icons finish drawing — short of COMMIT, so the verdict is readable early. */
const DRAWN = 80;

type Props = {
  children: React.ReactNode;
  /**
   * Resolves false when the save failed. The card then springs back rather than
   * sitting flung-and-invisible on a list it is still a member of — the drag
   * commits an intent, and only the parent knows whether it took.
   */
  onKeep: () => Promise<boolean>;
  onDiscard: () => void;
  /** While saving, the card should not be draggable into a second commit. */
  busy?: boolean;
};

export function DraftCard({ children, onKeep, onDiscard, busy = false }: Props) {
  const x = useMotionValue(0);
  const [flung, setFlung] = useState<"keep" | "discard" | null>(null);

  // A wash of the verdict's colour behind the card, deepening with the pull.
  const background = useTransform(
    x,
    [-COMMIT, 0, COMMIT],
    [
      "color-mix(in srgb, var(--danger) 16%, transparent)",
      "transparent",
      "color-mix(in srgb, var(--success) 16%, transparent)",
    ],
  );
  const border = useTransform(
    x,
    [-COMMIT, 0, COMMIT],
    ["var(--danger)", "var(--line)", "var(--success)"],
  );

  // Each stroke is a path drawn by pathLength, exactly as in the Motion example:
  // the tick to the right, the two strokes of the cross to the left, the second
  // starting after the first so it reads as being written rather than revealed.
  const tick = useTransform(x, [12, DRAWN], [0, 1]);
  const crossA = useTransform(x, [-12, -DRAWN * 0.6], [0, 1]);
  const crossB = useTransform(x, [-DRAWN * 0.55, -DRAWN], [0, 1]);
  const iconColor = useTransform(x, [-20, 0, 20], ["var(--danger)", "var(--faint)", "var(--success)"]);

  async function onDragEnd(_: unknown, info: PanInfo) {
    // Velocity as well as distance: a quick flick is a decision even when the
    // card has not travelled far, which is how every swipe list behaves.
    const thrown = Math.abs(info.velocity.x) > 500;
    const far = Math.abs(info.offset.x) > COMMIT;
    if (!thrown && !far) return;

    if (info.offset.x > 0) {
      setFlung("keep");
      const saved = await onKeep();
      if (!saved) {
        // Put it back where it was and let the error message do the talking.
        setFlung(null);
        x.set(0);
      }
    } else {
      setFlung("discard");
      onDiscard();
    }
  }

  return (
    <motion.div
      className="draft-card-wrap"
      style={{ background }}
      // The exit is owned by the parent's AnimatePresence; this only carries the
      // direction the card was thrown, so it leaves the way it was pushed.
      animate={flung ? { x: flung === "keep" ? 320 : -320, opacity: 0 } : undefined}
      transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <motion.div
        className="draft-card"
        style={{ x, borderColor: border }}
        drag={busy || flung ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.55}
        dragMomentum={false}
        onDragEnd={onDragEnd}
      >
        {children}

        {/* Inside the card, so the verdict travels with what it is judging —
            an icon left behind on the page would be a second thing to look at.
            aria-hidden: the buttons below already say all of this in text. */}
        <svg className="draft-verdict" viewBox="0 0 50 50" aria-hidden>
          <motion.path
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            stroke={iconColor}
            d="M14,26 L22,33 L35,16"
            style={{ pathLength: tick }}
          />
          <motion.path
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            stroke={iconColor}
            d="M17,17 L33,33"
            style={{ pathLength: crossA }}
          />
          <motion.path
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            stroke={iconColor}
            d="M33,17 L17,33"
            style={{ pathLength: crossB }}
          />
        </svg>
      </motion.div>
    </motion.div>
  );
}
