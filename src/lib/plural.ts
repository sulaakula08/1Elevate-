/**
 * English plurals for the counts the interface shows: 1 question, 2 questions.
 *
 * This replaces the Russian three-form helper the interface used before it went
 * English-only. The call sites are unchanged — they still pass a noun from
 * NOUNS — so the shape stayed the same even though English needs one fewer form.
 */

/** `[one, many]` — the forms for 1 and for everything else. */
export type Forms = [string, string];

export function plural(n: number, forms: Forms): string {
  return Math.abs(n) === 1 ? forms[0] : forms[1];
}

/** `12 questions` — the number and its noun, already agreed. */
export function pluralize(n: number, forms: Forms): string {
  return `${n} ${plural(n, forms)}`;
}

export const NOUNS = {
  question: ["question", "questions"] as Forms,
  module: ["module", "modules"] as Forms,
  minute: ["minute", "minutes"] as Forms,
  day: ["day", "days"] as Forms,
  hour: ["hour", "hours"] as Forms,
  topic: ["topic", "topics"] as Forms,
  format: ["format", "formats"] as Forms,
  test: ["test", "tests"] as Forms,
};
