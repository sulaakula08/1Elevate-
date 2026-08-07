/**
 * Russian grammar helpers. The interface is Russian-only, so the counts the UI
 * shows have to agree with their noun: 1 вопрос, 2 вопроса, 5 вопросов.
 */

/**
 * Picks the form Russian requires for `n`.
 *
 * @param forms `[one, few, many]` — the forms for 1, 2–4 and 5–20.
 */
export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}

/** `12 вопросов` — the number and its noun, already agreed. */
export function pluralize(n: number, forms: [string, string, string]): string {
  return `${n} ${plural(n, forms)}`;
}

export const NOUNS = {
  question: ["вопрос", "вопроса", "вопросов"] as [string, string, string],
  module: ["модуль", "модуля", "модулей"] as [string, string, string],
  minute: ["минута", "минуты", "минут"] as [string, string, string],
  day: ["день", "дня", "дней"] as [string, string, string],
  hour: ["час", "часа", "часов"] as [string, string, string],
  topic: ["тема", "темы", "тем"] as [string, string, string],
  format: ["формат", "формата", "форматов"] as [string, string, string],
  test: ["тест", "теста", "тестов"] as [string, string, string],
  comment: ["комментарий", "комментария", "комментариев"] as [string, string, string],
  explanation: ["объяснение", "объяснения", "объяснений"] as [string, string, string],
  point: ["балл", "балла", "баллов"] as [string, string, string],
};
