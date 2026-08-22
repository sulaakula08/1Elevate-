"use client";

/**
 * A faint, tiled session mark over the exam surfaces.
 *
 * It does not stop anything. Its whole job is attribution: if a section's worth of
 * questions turns up in a group chat as screenshots, the mark says which account
 * was looking at them. That changes the incentive for bulk copying, which is the
 * only thing browser-side measures can honestly claim to do.
 *
 * ── What it deliberately does not contain ──────────────────────────────────
 * No name, no email, no full account id. Eight hex characters of the account's
 * uuid, which is enough to find the row in `profiles` and not enough to be
 * personal data on the face of it — a screenshot shared onward should not also
 * leak who the student is to everyone who sees it.
 *
 * ── Why it is invisible ────────────────────────────────────────────────────
 * Four per cent opacity, one weight of small caps, rotated. It survives a
 * screenshot because a screenshot keeps the pixels; it does not survive a glance,
 * which is the requirement. `pointer-events: none` means it cannot take a tap away
 * from an answer choice, and `aria-hidden` means no screen reader ever reads a
 * session id in the middle of a question. See `.wm-layer` in globals.css.
 */

/** Enough tiles to cover a wide pane without laying out a hundred spans. */
const TILES = 24;

/**
 * Eight hex characters of an account id.
 *
 * Hyphens are dropped so the mark reads as one token rather than as a uuid
 * someone might try to paste somewhere, and the length is fixed so the tiling
 * stays even.
 */
export function shortId(accountId: string | null | undefined): string | null {
  if (!accountId) return null;
  const compact = accountId.replace(/-/g, "");
  return compact.length >= 8 ? compact.slice(0, 8).toUpperCase() : null;
}

export function Watermark({ accountId }: { accountId: string | null | undefined }) {
  const mark = shortId(accountId);
  // Nothing to attribute to, nothing to draw. A watermark reading "unknown" is
  // decoration, and decoration over a passage is just noise.
  if (!mark) return null;

  return (
    <div className="wm-layer" aria-hidden>
      {Array.from({ length: TILES }, (_, i) => (
        <span key={i}>{mark}</span>
      ))}
    </div>
  );
}
