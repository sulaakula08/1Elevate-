import { NOUNS, pluralize } from "./plural";

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

/** "12m ago", "3h ago", "2 days ago" — relative to now. */
export function timeAgo(at: number, now = Date.now()): string {
  const diff = Math.max(0, now - at);
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  return `${pluralize(Math.floor(diff / DAY), NOUNS.day)} ago`;
}
