/**
 * Exam schedule — the only place a test date is written down.
 *
 * The countdown widget reads this module and nothing else, so publishing a new
 * College Board date is a one-line edit here rather than a change to a
 * component.
 *
 * Every entry carries an explicit UTC offset. A bare "2026-08-29" is parsed as
 * UTC midnight, which is already the previous evening in Almaty: the widget
 * would count down to a moment that never matches the student's admission
 * ticket. With the offset the instant is absolute, so the countdown is a plain
 * difference between two instants and is correct in every time zone the
 * student's browser might be in. `timeZone` is used only to print the calendar
 * date the way the test centre states it.
 */

export type ExamDate = {
  /** ISO 8601 instant with an explicit UTC offset, e.g. "2026-08-29T09:00:00+06:00". */
  at: string;
  /** IANA zone of the sitting. Display only — the offset above pins the instant. */
  timeZone: string;
  /** Optional short note, e.g. a registration deadline. Russian, like the rest of the UI. */
  note?: string;
};

/** Zone of the test centres this product is built for. */
export const DEFAULT_EXAM_TIME_ZONE = "Asia/Almaty";

/**
 * Scheduled sittings, in any order — `scheduledExams()` sorts and filters them.
 *
 * Deliberately empty: this repository has never carried an official College
 * Board date, and inventing one would put a wrong deadline in front of a
 * student. The countdown renders its "not announced yet" state until real
 * dates land here, and starts working the moment they do.
 *
 * Example of a populated entry:
 *   { at: "2026-08-29T09:00:00+05:00", timeZone: "Asia/Almaty" }
 */
export const EXAM_DATES: ExamDate[] = [];

export type Countdown = {
  days: number;
  hours: number;
  minutes: number;
  /** Milliseconds left; negative once the sitting has started. */
  totalMs: number;
};

function instantOf(exam: ExamDate): number {
  return Date.parse(exam.at);
}

/** Configured sittings that parse, soonest first. Malformed entries are dropped. */
export function scheduledExams(): ExamDate[] {
  return EXAM_DATES.filter((exam) => Number.isFinite(instantOf(exam))).sort(
    (a, b) => instantOf(a) - instantOf(b),
  );
}

/**
 * The next sitting still ahead of `now`, or null when the list is empty or every
 * configured date has already passed. Past dates are skipped rather than shown,
 * so a stale config degrades to "not announced yet" instead of a negative clock.
 */
export function nextExam(now: number): ExamDate | null {
  return scheduledExams().find((exam) => instantOf(exam) > now) ?? null;
}

export function countdownTo(exam: ExamDate, now: number): Countdown {
  const totalMs = Math.max(0, instantOf(exam) - now);
  return {
    days: Math.floor(totalMs / 86_400_000),
    hours: Math.floor(totalMs / 3_600_000) % 24,
    minutes: Math.floor(totalMs / 60_000) % 60,
    totalMs,
  };
}

/** "29 августа 2026", in the sitting's own zone. Client-side only (Intl + locale). */
export function formatExamDate(exam: ExamDate): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: exam.timeZone,
  }).format(new Date(instantOf(exam)));
}
