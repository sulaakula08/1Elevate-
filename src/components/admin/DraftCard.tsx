"use client";

import { SwipeRow } from "@/components/motion/SwipeRow";

/**
 * A generated draft, reviewable by dragging: right adds it to the bank, left
 * bins it. All the gesture mechanics live in SwipeRow; this only says what the
 * two directions mean here.
 *
 * Reviewing drafts is a long run of the same binary call, which is what makes
 * the gesture worth having: the decision and the dismissal become one movement.
 */

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
  return (
    <SwipeRow
      className="draft-card-wrap"
      disabled={busy}
      hint="Drag right to add to the bank, left to discard"
      onSwipe={async (direction) => {
        if (direction === "left") {
          onDiscard();
          return "commit";
        }
        // A save can fail; the card goes back and the error message speaks.
        return (await onKeep()) ? "commit" : "revert";
      }}
    >
      {children}
    </SwipeRow>
  );
}
