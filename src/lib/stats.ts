import { getExam } from "@/data/exams";
import type { ExamId, Question } from "@/data/types";
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

/** Consecutive days of practice ending today or yesterday. */
export function streak(attempts: Attempt[], now = Date.now()): number {
  const days = activeDays(attempts);
  if (days.size === 0) return 0;
  const DAY = 86_400_000;
  // Allow the streak to still count if today has no activity yet.
  let cursor = days.has(dayKey(now)) ? now : now - DAY;
  if (!days.has(dayKey(cursor))) return 0;
  let count = 0;
  while (days.has(dayKey(cursor))) {
    count += 1;
    cursor -= DAY;
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
export function reviewQueue(data: UserData, bank: Question[]): Question[] {
  const byQuestion = new Map<string, Attempt[]>();
  for (const a of data.attempts) {
    const list = byQuestion.get(a.questionId) ?? [];
    list.push(a);
    byQuestion.set(a.questionId, list);
  }

  const scored: { q: Question; priority: number }[] = [];
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

export function maxScore(exam: ExamId): number {
  return getExam(exam)?.maxScore ?? 1600;
}

export function minScore(exam: ExamId): number {
  return getExam(exam)?.minScore ?? 400;
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
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
