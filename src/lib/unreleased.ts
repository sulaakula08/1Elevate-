"use client";

import { useApp } from "./app-state";
import { UNRELEASED_HREFS } from "./sections";

/**
 * Who may see sections that have not launched, and which doors are hidden.
 *
 * Lives in lib rather than beside the ComingSoon screen because the navigation,
 * the dashboard and the notification builder all need the answer, and a module
 * under lib/ has no business importing a component to get it.
 */

/**
 * Admins and owners.
 *
 * Written against the two roles rather than `!== "student"` so that adding a
 * fourth role later has to make an explicit decision here, instead of silently
 * inheriting access to unfinished work.
 */
export function useCanSeeUnreleased(): boolean {
  const { account } = useApp();
  return account?.role === "admin" || account?.role === "owner";
}

/**
 * The navigation entries that are not public yet.
 *
 * Empty for staff, so their rail is the complete one. For everyone else these
 * hrefs are dropped from navigation entirely — an entry leading only to
 * "coming soon" is a door drawn on a wall.
 */
export function useUnreleasedHrefs(): Set<string> {
  const canSee = useCanSeeUnreleased();
  if (canSee) return new Set();
  return new Set(Object.keys(UNRELEASED_HREFS));
}
