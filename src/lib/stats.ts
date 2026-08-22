import { getExam } from "@/data/exams";
import type { ExamId, QuestionIndexEntry } from "@/data/types";
import type { Attempt, UserData } from "./storage";

export type Bucket = {
  key: string;
  correct: number;
  total: number;
  accuracy: number;
};

function bucketize(attempts: Attempt[], keyOf: (a: Attempt) => string): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const a of attempts) {
    const key = keyOf(a);
    const b = map.get(key) ?? { key, correct: 0, total: 0, accuracy: 0 };
    b.total += 1;
    if (a.correct) b.correct += 1;
    map.set(key, b);
  }
  return [...map.values()]
    .map((b) => ({ ...b, accuracy: b.total ? b.correct / b.total : 0 }))
    .sort((x, y) => y.total - x.total);
}

export function bySubject(attempts: Attempt[]): Bucket[] {
  return bucketize(attempts, (a) => a.subjectId);
}

export function byTopic(attempts: Attempt[]): Bucket[] {
  return bucketize(attempts, (a) => a.topic);
}

/** Accuracy per difficulty level, ordered easy → hard. */
export function byDifficulty(attempts: Attempt[]): Bucket[] {
  return bucketize(
    attempts.filter((a) => a.difficulty),
    (a) => String(a.difficulty),
  ).sort((x, y) => Number(x.key) - Number(y.key));
}

/**
 * Colour for a difficulty level. One ramp inside the brand family — blue,
 * indigo, violet — so "harder" reads as further along a scale rather than as a
 * traffic light. Difficulty always carries its word label too, so colour is
 * never the only channel.
 */
export function difficultyColor(level: number): string {
  return `var(--lvl-${level === 1 ? 1 : level === 2 ? 2 : 3})`;
}

export function difficultyColorSoft(level: number): string {
  return `var(--lvl-${level === 1 ? 1 : level === 2 ? 2 : 3}-soft)`;
}

export function overall(attempts: Attempt[]) {
  const total = attempts.length;
  const correct = attempts.filter((a) => a.correct).length;
  return { total, correct, accuracy: total ? correct / total : 0 };
}

/** Topics with at least `minAttempts` tries, weakest accuracy first. */
export function weakTopics(attempts: Attempt[], minAttempts = 2, limit = 5): Bucket[] {
  return byTopic(attempts)
    .filter((b) => b.total >= minAttempts && b.accuracy < 0.8)
    .sort((x, y) => x.accuracy - y.accuracy)
    .slice(0, limit);
}

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function activeDays(attempts: Attempt[]): Set<string> {
  return new Set(attempts.map((a) => dayKey(a.at)));
}

/**
 * Consecutive days with at least one answer, counting back from today.
 *
 * A day that has not started yet does not break the run: if nothing has been
 * answered today the count begins yesterday, so a streak is only lost by
 * missing a whole day, not by being asked before you have practised.
 *
 * Steps by calendar date rather than by subtracting 86_400_000. A local day is
 * 23 or 25 hours long when clocks change, so a fixed-millisecond step can land
 * on the same date twice or skip one entirely, and either would miscount the
 * run for anyone in a timezone that observes daylight saving.
 */
export function streak(attempts: Attempt[], now = Date.now()): number {
  const days = activeDays(attempts);
  if (days.size === 0) return 0;

  const cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0);
  // Midday, not midnight: it keeps the date unambiguous either side of a clock
  // change, where midnight itself can fail to exist.

  if (!days.has(dayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor.getTime()))) return 0;
  }

  let count = 0;
  while (days.has(dayKey(cursor.getTime()))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

/** Answers-per-day for the last `days` days, oldest first. */
export function recentActivity(attempts: Attempt[], days = 14, now = Date.now()) {
  const DAY = 86_400_000;
  const counts = new Map<string, number>();
  for (const a of attempts) counts.set(dayKey(a.at), (counts.get(dayKey(a.at)) ?? 0) + 1);
  return Array.from({ length: days }, (_, i) => {
    const ms = now - (days - 1 - i) * DAY;
    const key = dayKey(ms);
    return { day: key, count: counts.get(key) ?? 0 };
  });
}

/**
 * Questions that still need review: at least one wrong answer, and not yet
 * answered correctly twice in a row. Hardest (most net-wrong) first.
 */
export type HeatCell = {
  /** YYYY-MM-DD, local. */
  day: string;
  ms: number;
  count: number;
  /** 0–4. 0 means nothing answered that day. */
  level: number;
  /**
   * Always false — the range stops at today. Kept so the grid has one obvious
   * place to mark a cell unrenderable if the range is ever extended forward.
   */
  future: boolean;
};

export type HeatWeek = { days: HeatCell[] };

/**
 * A year of daily activity, laid out as calendar weeks.
 *
 * Columns are weeks and rows are weekdays, so the grid reads the way a wall
 * calendar does. The range starts on the Sunday on or before a year ago, which
 * is what keeps every column a clean Sunday-to-Saturday week rather than a
 * ragged offset that shifts the weekday rows.
 *
 * Levels are relative to the student's own busiest day, not an absolute number.
 * Someone answering five questions a day should see a full-looking year; fixed
 * thresholds would show them a year of near-empty squares and read as failure.
 */
export function contributionYear(attempts: Attempt[], now = Date.now()) {
  const DAY = 86_400_000;

  const counts = new Map<string, number>();
  for (const a of attempts) counts.set(dayKey(a.at), (counts.get(dayKey(a.at)) ?? 0) + 1);

  // Local midnight today, so a cell flips over at the student's midnight.
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const start = new Date(today.getTime() - 364 * DAY);
  start.setDate(start.getDate() - start.getDay()); // back to Sunday

  let total = 0;
  let peak = 0;
  const cells: HeatCell[] = [];

  // Stop at today rather than filling out the final week. Generating the days
  // after today would add a column of nothing whenever today lands on a
  // Saturday; the grid pads short columns instead.
  //
  // Stepping with setDate rather than adding 86_400_000 is what keeps this
  // correct across a daylight-saving change, where a local day is 23 or 25
  // hours long and a fixed-millisecond step drifts onto the wrong date.
  const cursor = new Date(start);
  while (cursor.getTime() <= today.getTime()) {
    const key = dayKey(cursor.getTime());
    const count = counts.get(key) ?? 0;
    total += count;
    if (count > peak) peak = count;
    cells.push({ day: key, ms: cursor.getTime(), count, level: 0, future: false });
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
  }

  for (const cell of cells) {
    if (cell.count === 0) continue;
    const share = cell.count / Math.max(1, peak);
    cell.level = share >= 0.75 ? 4 : share >= 0.5 ? 3 : share >= 0.25 ? 2 : 1;
  }

  const weeks: HeatWeek[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push({ days: cells.slice(i, i + 7) });

  // The walk stops at today, so the last cell is today by construction.
  const todayCount = cells[cells.length - 1]?.count ?? 0;

  return {
    weeks,
    total,
    peak,
    activeDays: cells.filter((c) => c.count > 0).length,
    todayCount,
  };
}

/**
 * The review queue: taxonomy in, taxonomy out.
 *
 * It is built entirely from the attempt log and the ids in the bank — which
 * question was missed, how often, and whether the last two were right. None of
 * that needs a prompt, so the queue can be computed over the index the browser
 * already holds and the content fetched only for the questions a session
 * actually serves.
 */
export function reviewQueue(
  data: UserData,
  bank: QuestionIndexEntry[],
): QuestionIndexEntry[] {
  const byQuestion = new Map<string, Attempt[]>();
  for (const a of data.attempts) {
    const list = byQuestion.get(a.questionId) ?? [];
    list.push(a);
    byQuestion.set(a.questionId, list);
  }

  const scored: { q: QuestionIndexEntry; priority: number }[] = [];
  for (const [questionId, rawAttempts] of byQuestion) {
    const attempts = [...rawAttempts].sort((x, y) => x.at - y.at);
    const wrong = attempts.filter((a) => !a.correct).length;
    if (wrong === 0) continue;

    const last2 = attempts.slice(-2);
    const mastered = last2.length === 2 && last2.every((a) => a.correct);
    if (mastered) continue;

    const q = bank.find((item) => item.id === questionId);
    if (!q) continue; // question was deleted in the admin editor
    const correct = attempts.length - wrong;
    scored.push({ q, priority: wrong * 2 - correct });
  }

  return scored.sort((a, b) => b.priority - a.priority).map((s) => s.q);
}

/**
 * Estimates a 400–1600 score from the share correct, rounded to 10. The real SAT
 * is adaptively scaled, so this is an indication rather than a prediction.
 */
export function scaleScore(exam: ExamId, correct: number, total: number): number {
  if (total === 0) return minScore(exam);
  return Math.round((400 + (correct / total) * 1200) / 10) * 10;
}

/**
 * One section's scaled score, 200–800, from its raw score and its route.
 *
 * The flat `scaleScore` above treats a test as one pile of questions, which is
 * wrong for an adaptive one in a way that matters: on the real SAT the second
 * module you are routed into bounds what the section can be worth, so a student
 * who never left the easier form cannot reach the top of the scale however many
 * of those easier questions they get right. Capping the lower route is the
 * smallest honest model of that. It stays an estimate — the real mapping is a
 * calibrated table per form — and the report says so.
 */
export function sectionScore(correct: number, total: number, routedUp: boolean): number {
  if (total === 0) return 200;
  const share = correct / total;
  const ceiling = routedUp ? 800 : 600;
  return Math.round((200 + share * (ceiling - 200)) / 10) * 10;
}

export function maxScore(exam: ExamId): number {
  return getExam(exam)?.maxScore ?? 1600;
}

export function minScore(exam: ExamId): number {
  return getExam(exam)?.minScore ?? 400;
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/**
 * Median seconds per question, from attempts that actually recorded a duration.
 *
 * Median rather than mean: one question left open while a student made tea would
 * drag an average into nonsense, and pace is only useful if it describes the
 * ordinary case. Mock attempts carry a per-question average rather than a real
 * measurement, so they are as honest as the section clock allows.
 */
export function medianSeconds(attempts: Attempt[]): number | null {
  const times = attempts
    .map((a) => a.ms)
    .filter((ms): ms is number => typeof ms === "number" && ms > 500 && ms < 15 * 60_000)
    .sort((x, y) => x - y);
  if (times.length === 0) return null;
  const middle = Math.floor(times.length / 2);
  const ms =
    times.length % 2 === 1 ? times[middle] : (times[middle - 1] + times[middle]) / 2;
  return Math.round(ms / 1000);
}

/** Accuracy split by how the question was answered — practice, review, mock. */
export function byMode(attempts: Attempt[]): Bucket[] {
  return bucketize(attempts, (a) => a.mode);
}

/**
 * This week against the week before it, for the two things a student can act on:
 * how much they answered and how much of it they got right.
 */
export function weekOverWeek(attempts: Attempt[], now = Date.now()) {
  const WEEK = 7 * 86_400_000;
  const measure = (from: number, to: number) => {
    const slice = attempts.filter((a) => a.at >= from && a.at < to);
    return { ...overall(slice) };
  };
  const current = measure(now - WEEK, now + 1);
  const previous = measure(now - 2 * WEEK, now - WEEK);
  return {
    current,
    previous,
    answeredDelta: current.total - previous.total,
    // Null rather than zero when there is nothing to compare against: "no
    // change" and "no baseline" must not render the same.
    accuracyDelta:
      previous.total > 0 && current.total > 0
        ? current.accuracy - previous.accuracy
        : null,
  };
}

/**
 * How far the latest mock is from the target, and how much it moved. Returns
 * null when no mock has been taken — there is nothing honest to say yet.
 */
export function scoreStanding(
  mocks: { score: number; exam: ExamId; at: number }[],
  targetScore: number,
) {
  if (mocks.length === 0) return null;
  const ordered = [...mocks].sort((a, b) => a.at - b.at);
  const latest = ordered[ordered.length - 1];
  const first = ordered[0];
  const best = ordered.reduce((top, m) => (m.score > top.score ? m : top), ordered[0]);
  return {
    latest: latest.score,
    best: best.score,
    max: maxScore(latest.exam),
    toTarget: targetScore - latest.score,
    // Only meaningful once there is a second data point.
    change: ordered.length > 1 ? latest.score - first.score : null,
  };
}

/** Fisher–Yates, non-mutating. */
export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
