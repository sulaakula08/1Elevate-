"use client";

import { useEffect } from "react";
import {
  environmentDescription,
  environmentLabel,
  isUnsafeProductionConnection,
  warnOnUnsafeConnection,
} from "@/lib/environment";

/**
 * A small tag beside the wordmark saying which environment this is.
 *
 * It renders nothing at all on production — not hidden with CSS, not gated on a
 * role, simply not returned — so there is no arrangement of circumstances in
 * which a student sees it. That is why it needs no permission check: the only
 * builds that can draw it are ones no student is looking at.
 *
 * A tag and not a banner. The point is to be recognisable in the corner of your
 * eye when you glance at a screenshot and wonder which database you were on, and
 * a bar across the top of every page would be paid for on every screen forever
 * to answer a question that only comes up while testing.
 *
 * The exception is the one state that is actually dangerous — a local or preview
 * build holding the production database — where the same tag turns red and says
 * PROD DATA. Still small, but it is the difference between "this is dev" and
 * "stop typing".
 */
export function EnvironmentBadge() {
  // Runs from the badge because the badge is already mounted in the shell on
  // exactly the builds that need the warning, which saves adding a second
  // effect somewhere in the provider tree to do the same job.
  useEffect(() => {
    warnOnUnsafeConnection();
  }, []);

  const label = environmentLabel();
  if (!label) return null;

  const unsafe = isUnsafeProductionConnection();

  return (
    <span
      className="env-badge"
      data-unsafe={unsafe || undefined}
      title={environmentDescription()}
    >
      {label}
    </span>
  );
}
