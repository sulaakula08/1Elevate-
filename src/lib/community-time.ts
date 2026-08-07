import { NOUNS, pluralize } from "./ru";

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

/** "12 мин", "3 ч", "2 дня" — relative to now, Russian noun forms agreed. */
export function timeAgo(at: number, now = Date.now()): string {
  const diff = Math.max(0, now - at);
  if (diff < MINUTE) return "только что";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} мин`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} ч`;
  return pluralize(Math.floor(diff / DAY), NOUNS.day);
}
