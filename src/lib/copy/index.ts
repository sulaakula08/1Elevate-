/**
 * Interface copy, split by product area so each area owns its own strings.
 *
 * `i18n.tsx` merges these fragments into the base dictionary; a key defined here
 * is reachable from `t()` exactly like one declared inline. The split exists so
 * work on the hero never has to touch the strings for the question bank.
 */

import { HERO_COPY } from "./hero";
import { SHOWCASE_COPY } from "./showcase";
import { STUDY_COPY } from "./study";
import { PLAN_COPY } from "./plan";

/** English-only, like the rest of the product. */
export type CopyEntry = { en: string };
export type CopyDict = Record<string, CopyEntry>;

export const COPY: CopyDict = {
  ...HERO_COPY,
  ...SHOWCASE_COPY,
  ...STUDY_COPY,
  ...PLAN_COPY,
};
