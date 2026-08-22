import { SUBJECTS, subjectsFor } from "@/data/exams";
import { domainsFor } from "@/data/taxonomy";
import type { Difficulty, QuestionIndexEntry } from "@/data/types";
import type { Attempt, MockResult } from "./storage";
import { contributionYear, dayKey, streak, type HeatWeek } from "./stats";

/**
 * The analytics engine behind /progress.
 *
 * One pass over the attempt log, producing every figure the page draws. It is a
 * pure function of data the student has actually generated — attempts, mocks,
 * the bank's taxonomy and the target score they set — so nothing on the page can
 * be a number somebody typed in to make a screenshot look good.
 *
 * Three rules the whole file is written to:
 *
 * 1. Never invent. Where there is not enough evidence for a figure it is `null`
 *    and the view says so. A confident wrong number is worse than a blank.
 * 2. Say where a number came from. Every derived measure below carries a comment
 *    explaining its method, because "78% readiness" is only worth showing if the
 *    student could, in principle, be told exactly how it was reached.
 * 3. One definition per concept. Accuracy, recency, reliability and difficulty
 *    weighting are defined once, in RULES, and every section reads them from
 *    there — so two panels can never disagree about what "recent" means.
 *
 * Attempts carry subject, topic, difficulty and timing but not the content
 * domain or skill; those live on the bank entry. Joining by question id is what
 * makes domain- and skill-level analysis possible at all, and it is also why an
 * answer to a question that has since been deleted drops out of those sections
 * (and only those): the label it was filed under is genuinely no longer known.
 */

const DAY = 86_400_000;

/**
 * Every threshold this file judges by, in one place.
 *
 * These are the numbers that decide whether the page makes a claim, so they are
 * stated rather than scattered: a reader who disagrees with "eight attempts is
 * enough to call a skill weak" can find the decision in one line.
 */
export const RULES = {
  /** Attempts before a bucket's accuracy is reported as a finding. */
  reliable: 8,
  /** Attempts before it is shown at all, marked as provisional. */
  provisional: 3,
  /** The comparison window: "recent" everywhere on the page means this. */
  windowDays: 30,
  /**
   * Half-life, in days, of an answer's weight in the practice estimate. At 30
   * days an answer counts half as much as one from today, at 60 a quarter.
   * Progress is the thing being measured, so old evidence has to fade.
   */
  halfLifeDays: 30,
  /** Answers in a section before a practice estimate is shown for it. */
  estimateMin: 25,
  /** Answers in a rolling window before the trend line is drawn through it. */
  trendMin: 6,
  /** Answers on a day before that day's accuracy counts as a personal best. */
  bestDayMin: 10,
  /** Answers in a 7-day window before it counts as a "best week". */
  bestWeekMin: 20,
  /** Answers needed each side of the divide before a change is called a trend. */
  changeMin: 8,
  /** Percentage points of change worth telling the student about. */
  changeMinPoints: 5,
  /**
   * Questions a sitting must contain before its score is treated as a
   * measurement.
   *
   * The blueprint is 98. A two-question "mock" is a real thing a student can
   * do — the runner allows a shortened test — but scoring one on the 400–1600
   * scale produces a number that is not comparable with a full sitting: get
   * both wrong and it reads 400, which would then headline this page as the
   * student's standing. Shortened sittings are still listed in the history,
   * marked as shortened; they simply do not set the score.
   */
  mockMinQuestions: 40,
  /** Volume milestones, in answered questions. */
  milestones: [50, 100, 250, 500, 1000, 2500, 5000],
  /** Scale span of one SAT section, 200–800. */
  sectionSpan: 600,
  sectionFloor: 200,
} as const;

/* ---------------------------------------------------------------- shapes -- */

export type Reliability = "reliable" | "provisional" | "insufficient";

/**
 * Mastery bands. Five states plus "unknown", derived from accuracy only once
 * there is enough of it — a 100% on two questions is not mastery, it is two
 * questions.
 */
export type Band = "mastered" | "strong" | "developing" | "needsWork" | "critical" | "unknown";

/** A measure now against the same measure over the preceding window. */
export type Change = {
  current: number | null;
  previous: number | null;
  /** current − previous, or null when either side is too thin to compare. */
  delta: number | null;
};

export type LevelTally = {
  level: Difficulty;
  attempts: number;
  correct: number;
  accuracy: number | null;
};

/** One row of the mastery matrix: a domain, or a skill inside one. */
export type Cell = {
  /** The label as College Board writes it — what the student will recognise. */
  key: string;
  subjectId: string;
  attempts: number;
  correct: number;
  accuracy: number | null;
  reliability: Reliability;
  band: Band;
  /** Median seconds per question, from practice answers only. See `timed`. */
  seconds: number | null;
  /** Last 30 days against the 30 before them. */
  change: Change;
  byLevel: LevelTally[];
  /**
   * Questions in the bank carrying this label. It separates "you have not
   * practised this" from "there is nothing here to practise yet", which look
   * identical in an attempt log and mean opposite things to a student.
   */
  available: number;
};

export type DomainCell = Cell & {
  /** Published share of the section, from data/taxonomy.ts. */
  weight: number;
  skills: Cell[];
};

export type SubjectEstimate = {
  subjectId: string;
  /** 200–800, or null when there is not enough practice to say. */
  score: number | null;
  /** The difficulty-reweighted, recency-weighted share correct behind it. */
  share: number | null;
  attempts: number;
  /** Answers still needed before a figure appears. 0 once it has. */
  need: number;
};

export type ScoreEstimate = {
  subjects: SubjectEstimate[];
  /** 400–1600, only when both sections have enough behind them. */
  total: number | null;
  /** The last mock actually sat — measured, not estimated. */
  mock: { score: number; at: number; setIndex?: number } | null;
  /** Best mock ever sat. */
  best: number | null;
};

export type TrendRange = "7d" | "30d" | "90d" | "all";

export type TrendPoint = {
  day: string;
  ms: number;
  /** Rolling accuracy at that date, or null where the window was too thin. */
  overall: number | null;
  bySubject: Record<string, number | null>;
  /** Answers on that single day — the volume the line is standing on. */
  count: number;
  correct: number;
};

/**
 * The one moment in a range worth writing on the chart.
 *
 * A chart is read as a shape, and a shape does not say what happened. This is
 * the largest week-over-week move in the rolling line inside the range — at
 * most one per range, and only when it clears `changeMinPoints`, so an
 * annotation is an observation the data supports rather than decoration.
 */
export type TrendNote = {
  index: number;
  ms: number;
  /** Signed change in the rolling value over the preceding week. */
  delta: number;
  kind: "fall" | "rise";
};

export type TrendSeries = {
  range: TrendRange;
  /** Length of the trailing window the rolling accuracy is measured over. */
  windowDays: number;
  points: TrendPoint[];
  /** Mocks sat inside the range, as milestones on the timeline. */
  marks: {
    ms: number;
    day: string;
    score: number;
    setIndex?: number;
    /** Raw share correct per section — the only per-section figure a finished
        mock actually stores. Never a scaled section score. */
    bySubject: { subjectId: string; accuracy: number }[];
  }[];
  /** Null when nothing in the range moved enough to be worth naming. */
  note: TrendNote | null;
  /** Accuracy across the range against the equally long range before it. */
  compare: Change;
  /** Answers inside the range. Below `trendMin` there is no line to draw. */
  attempts: number;
};

export type Opportunity = {
  key: string;
  subjectId: string;
  accuracy: number;
  attempts: number;
  /** The student's own best reliable domain in the same section. */
  ceiling: number;
  /** Which domain that is, so the comparison can be stated by name. */
  ceilingKey: string;
  /**
   * Scaled points the section estimate would gain if this domain matched that
   * ceiling: weight × gap × 600. It is a "what is this costing me" figure, not
   * a prediction — the assumption is stated in the UI beside it.
   */
  points: number;
  weight: number;
  change: Change;
  seconds: number | null;
  band: Band;
};

export type LevelReport = LevelTally & {
  seconds: number | null;
  change: Change;
  /** Share of this student's answers sat at this level. */
  share: number;
};

export type SpeedPoint = {
  key: string;
  subjectId: string;
  /** Median seconds per question in this domain. */
  seconds: number;
  accuracy: number;
  attempts: number;
  quadrant: "fastAccurate" | "slowAccurate" | "fastInaccurate" | "slowInaccurate";
};

export type SpeedReport = {
  points: SpeedPoint[];
  /** The student's own median pace and accuracy — the axes cross here. */
  midSeconds: number;
  midAccuracy: number;
  /** Answers with a real measured duration behind the whole chart. */
  timed: number;
};

export type MetricKey =
  | "accuracy"
  | "questions"
  | "activeDays"
  | "pace"
  | "subject";

export type Metric = {
  key: MetricKey;
  /** Set for the per-subject rows. */
  subjectId?: string;
  current: number | null;
  previous: number | null;
  delta: number | null;
  /** Which way is progress. Faster answers are better; fewer are not. */
  good: "up" | "down";
  format: "percent" | "count" | "seconds";
};

export type PeriodReport = {
  days: number;
  metrics: Metric[];
  /** False when there is nothing behind the earlier window to compare against. */
  hasBaseline: boolean;
};

export type MilestoneId =
  | "volume"
  | "bestDay"
  | "bestAccuracyDay"
  | "longestStreak"
  | "bestMock"
  | "bestWeek"
  | "mostImproved";

export type Milestone = {
  id: MilestoneId;
  value: number | null;
  unit: "count" | "percent" | "score" | "days" | "points";
  /** When the record was set, where that is meaningful. */
  at: number | null;
  /** The supporting figure: questions behind an accuracy, and so on. */
  note: number | null;
  label?: string;
  subjectId?: string;
  /** Volume only: the next round number and how far along it is, 0–1. */
  next?: { target: number; progress: number };
};

export type InsightKind =
  | "improving"
  | "declining"
  | "hardGap"
  | "consistency"
  | "imbalance"
  | "slowDomain"
  | "mockGap"
  | "reliability";

export type Insight = {
  id: string;
  kind: InsightKind;
  tone: "good" | "warn" | "neutral";
  /** Already display-rounded, so the view only interpolates. */
  values: Record<string, string | number>;
  priority: number;
};

export type FocusItem = {
  key: string;
  subjectId: string | null;
  accuracy: number | null;
  points: number | null;
  impact: "high" | "medium" | "low";
  href: string;
  /** "review" items carry the queue length instead of an accuracy. */
  kind: "domain" | "review" | "mock" | "volume";
  count?: number;
};

export type MockRun = {
  id: string;
  at: number;
  score: number;
  setIndex?: number;
  correct: number;
  total: number;
  /** False for a shortened sitting — see RULES.mockMinQuestions. */
  full: boolean;
  bySubject: { subjectId: string; correct: number; total: number; accuracy: number }[];
};

export type MockReport = {
  /** Every sitting, newest last, shortened ones included and flagged. */
  runs: MockRun[];
  /** Only the sittings long enough to score. Empty is possible. */
  scored: MockRun[];
  /** Latest and best of the scored sittings, or null when none qualify. */
  latest: MockRun | null;
  best: MockRun | null;
  /** How many sittings were too short to score. */
  shortened: number;
  /** Latest minus the one before it. */
  step: number | null;
  /** Mean points gained per mock across the whole history. */
  perMock: number | null;
  /** Latest minus first: the journey in one number. */
  gain: number | null;
  /** Share correct across mocks, against share correct in practice. */
  mockAccuracy: number;
  practiceAccuracy: number | null;
};

export type ActivityReport = {
  weeks: HeatWeek[];
  total: number;
  activeDays: number;
  peak: number;
  currentStreak: number;
  longestStreak: number;
  /** Days practised out of the last seven — consistency at a useful scale. */
  last7: number;
  /** First day of the current run, so a streak can be dated rather than counted. */
  streakStart: number | null;
  /** Hours of measured practice in the last year. */
  hours: number;
};

export type Pace = {
  /** Answers per calendar day over the comparison window. */
  perDay: number;
  activeDays: number;
  medianSeconds: number | null;
};

export type Analytics = {
  /** Empty means the page has nothing honest to show yet. */
  any: boolean;
  totals: { attempts: number; correct: number; accuracy: number; questions: number };
  estimate: ScoreEstimate;
  subjects: {
    subjectId: string;
    attempts: number;
    correct: number;
    accuracy: number | null;
    change: Change;
    seconds: number | null;
    hard: { attempts: number; correct: number; accuracy: number | null };
    best: Cell | null;
    worst: Cell | null;
    /** Share of the student's practice spent in this section. */
    share: number;
  }[];
  trend: Record<TrendRange, TrendSeries>;
  domains: DomainCell[];
  opportunities: Opportunity[];
  /**
   * Every recoverable figure added up, and how many domains produced it.
   *
   * Summing is defensible because the map from share-correct to a section score
   * is linear and the total is the two sections added: lifting two domains lifts
   * the estimate by both amounts. It stays an estimate, and it is never shown
   * without the assumption it rests on — each domain reaching the student's own
   * best domain in that section.
   */
  opportunityTotal: { points: number; domains: number };
  /** Answers short of a first opportunity, when there are none yet. */
  opportunityPending: number;
  /**
   * Domains with enough answers to be judged. Ranking needs two of them — the
   * comparison is against the student's own best — so the empty state can say
   * which of the two things is missing.
   */
  reliableDomains: number;
  levels: LevelReport[];
  speed: SpeedReport;
  period: PeriodReport;
  milestones: Milestone[];
  insights: Insight[];
  focus: FocusItem[];
  mocks: MockReport | null;
  activity: ActivityReport;
  pace: Pace;
};

/**
 * Whether a sitting is long enough for its score to mean anything.
 *
 * Exported because two screens quote a mock score — this page and the dashboard
 * — and they must not disagree about which sitting counts. Without a shared
 * rule, a two-question test scored 400 headlined the home page while /progress
 * showed the student's real 1390.
 */
export function isFullMock(mock: { total: number }): boolean {
  return mock.total >= RULES.mockMinQuestions;
}

/* --------------------------------------------------------------- helpers -- */

function share(correct: number, attempts: number): number | null {
  return attempts > 0 ? correct / attempts : null;
}

function reliabilityOf(attempts: number): Reliability {
  if (attempts >= RULES.reliable) return "reliable";
  if (attempts >= RULES.provisional) return "provisional";
  return "insufficient";
}

/**
 * Mastery band from accuracy.
 *
 * The cuts are set against what the score table actually rewards rather than
 * against school grading: ~90% of a domain right is where a section stops
 * losing points to it, and below half right a domain is costing more than any
 * other single thing a student could fix. An unreliable sample has no band at
 * all — that is the honest answer, and the UI draws it as an empty cell rather
 * than as a bad one.
 */
function bandOf(accuracy: number | null, reliability: Reliability): Band {
  if (accuracy === null || reliability === "insufficient") return "unknown";
  if (accuracy >= 0.9) return "mastered";
  if (accuracy >= 0.78) return "strong";
  if (accuracy >= 0.65) return "developing";
  if (accuracy >= 0.5) return "needsWork";
  return "critical";
}

/**
 * Median seconds over answers that recorded a real duration.
 *
 * Median, not mean, for the reason lib/stats.ts gives: one question left open
 * over lunch would drag an average into nonsense. The outer bounds drop those
 * outright — under half a second is a mis-click, over fifteen minutes is a walk
 * away from the desk.
 *
 * Mock answers are excluded by the caller, not here: a mock records the same
 * per-question average against all 98 answers, so they are a section pace
 * repeated rather than 98 measurements, and mixing them in would quietly flatten
 * every per-domain difference this page exists to surface.
 */
function medianOf(list: Attempt[]): number | null {
  const times = list
    .map((a) => a.ms)
    .filter((ms): ms is number => typeof ms === "number" && ms > 500 && ms < 15 * 60_000)
    .sort((x, y) => x - y);
  if (times.length === 0) return null;
  const middle = Math.floor(times.length / 2);
  const ms = times.length % 2 === 1 ? times[middle] : (times[middle - 1] + times[middle]) / 2;
  return Math.round(ms / 1000);
}

function tallyOf(list: Attempt[]) {
  let correct = 0;
  for (const a of list) if (a.correct) correct += 1;
  return { attempts: list.length, correct, accuracy: share(correct, list.length) };
}

/**
 * Accuracy over the last `windowDays` against the window before it.
 *
 * Both sides need `changeMin` answers. Without that guard a student who
 * answered three questions last month and forty this month is told their
 * accuracy "fell 33 points", which is arithmetic rather than information.
 */
function changeOf(list: Attempt[], now: number, windowDays = RULES.windowDays): Change {
  const edge = daysBack(now, windowDays - 1);
  const start = daysBack(now, 2 * windowDays - 1);
  const recent = tallyOf(list.filter((a) => a.at >= edge));
  const before = tallyOf(list.filter((a) => a.at >= start && a.at < edge));
  const comparable =
    recent.attempts >= RULES.changeMin && before.attempts >= RULES.changeMin;
  return {
    current: recent.accuracy,
    previous: before.accuracy,
    delta:
      comparable && recent.accuracy !== null && before.accuracy !== null
        ? recent.accuracy - before.accuracy
        : null,
  };
}

function levelsOf(list: Attempt[]): LevelTally[] {
  return ([1, 2, 3] as Difficulty[]).map((level) => {
    const slice = list.filter((a) => a.difficulty === level);
    const t = tallyOf(slice);
    return { level, attempts: t.attempts, correct: t.correct, accuracy: t.accuracy };
  });
}

/**
 * Local midnight `days` ago.
 *
 * Every window on this page is measured in whole local days rather than in
 * multiples of 86 400 000, for two reasons: "the last 30 days" should mean 30
 * calendar days to a student (a rolling millisecond window can report 31 days
 * practised out of 30), and stepping by date is what keeps a window correct
 * across a daylight-saving change.
 */
function daysBack(now: number, days: number): number {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.getTime();
}

/** Round to the nearest ten, the granularity every SAT score is reported at. */
function toTen(n: number): number {
  return Math.round(n / 10) * 10;
}

/* -------------------------------------------------------------- estimate -- */

/**
 * A section score estimated from practice, 200–800.
 *
 * Method, in full, because a number like this has to be auditable:
 *
 * 1. Each answer is weighted by age, halving every `halfLifeDays`. What a
 *    student could do six weeks ago is evidence, but weaker evidence.
 * 2. A weighted accuracy is computed per difficulty level, then recombined
 *    using the difficulty mix of the question bank itself — because that is the
 *    mix a mock assembled from this bank will actually serve. Without this step
 *    a student who happens to have practised mostly easy questions reads as
 *    stronger than they are; with it, practising only easy questions moves the
 *    estimate very little, which is the truth.
 * 3. The resulting share correct is mapped onto 200–800 linearly — the same flat
 *    mapping `scaleScore`/`sectionScore` in lib/stats.ts fall back on for a mock
 *    that did not route.
 *
 * What it is not: adaptive. The real SAT's second module bounds what a section
 * can be worth, and no amount of untimed practice models that. So it is labelled
 * an estimate from practice everywhere it appears, it never overwrites a measured
 * mock score, and it does not exist at all below `estimateMin` answers.
 */
function estimateSection(
  list: Attempt[],
  bankMix: Map<Difficulty, number>,
  now: number,
): { score: number | null; share: number | null; attempts: number; need: number } {
  const attempts = list.length;
  const need = Math.max(0, RULES.estimateMin - attempts);
  if (attempts < RULES.estimateMin) return { score: null, share: null, attempts, need };

  const weighted = new Map<Difficulty | 0, { weight: number; correct: number }>();
  for (const a of list) {
    const age = Math.max(0, (now - a.at) / DAY);
    const weight = Math.pow(0.5, age / RULES.halfLifeDays);
    // 0 stands for "level not recorded" — attempts predate the field. They are
    // kept in their own bucket and re-weighted with the mix's average, rather
    // than dropped, because throwing away a student's earliest history to tidy
    // an aggregate is worse than pooling it.
    const key: Difficulty | 0 = a.difficulty ?? 0;
    const cell = weighted.get(key) ?? { weight: 0, correct: 0 };
    cell.weight += weight;
    if (a.correct) cell.correct += weight;
    weighted.set(key, cell);
  }

  let mixSum = 0;
  let total = 0;
  for (const [key, cell] of weighted) {
    if (cell.weight <= 0) continue;
    // A level with no bank questions still gets a floor weight, so a level the
    // student has practised is never silently worth nothing.
    const mix = key === 0 ? 1 / 3 : (bankMix.get(key) ?? 1 / 3);
    const w = Math.max(mix, 0.02);
    mixSum += w;
    total += w * (cell.correct / cell.weight);
  }
  if (mixSum <= 0) return { score: null, share: null, attempts, need: 0 };

  const value = total / mixSum;
  return {
    score: toTen(RULES.sectionFloor + value * RULES.sectionSpan),
    share: value,
    attempts,
    need: 0,
  };
}

/* ----------------------------------------------------------------- trend -- */

const RANGE_DAYS: Record<TrendRange, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
};

/**
 * The rolling window each range is smoothed over.
 *
 * A week of daily accuracy is mostly noise — twelve questions on a Tuesday can
 * swing a day thirty points — so every range is drawn as a trailing average,
 * and the window grows with the range so the line always carries roughly the
 * same amount of evidence per pixel.
 */
const RANGE_WINDOW: Record<TrendRange, number> = { "7d": 3, "30d": 7, "90d": 14, all: 14 };

type DayTally = { count: number; correct: number; bySubject: Map<string, [number, number]> };

/**
 * The largest week-over-week move in the rolling line, or null.
 *
 * Compared against the value seven plotted days earlier rather than against the
 * range's own extremes: "it fell ten points in a week" is something that
 * happened, whereas "this is the lowest point of the quarter" is often just
 * where the range was cut. Both sides have to exist, so a gap in practice
 * cannot produce a phantom cliff.
 */
function noteFor(points: TrendPoint[]): TrendNote | null {
  const STEP = 7;
  if (points.length < STEP + 4) return null;
  let best: TrendNote | null = null;
  for (let i = STEP; i < points.length; i++) {
    const current = points[i].overall;
    const before = points[i - STEP].overall;
    if (current === null || before === null) continue;
    const delta = current - before;
    if (Math.abs(delta) < RULES.changeMinPoints / 100) continue;
    if (!best || Math.abs(delta) > Math.abs(best.delta)) {
      best = { index: i, ms: points[i].ms, delta, kind: delta < 0 ? "fall" : "rise" };
    }
  }
  return best;
}

function buildTrend(
  attempts: Attempt[],
  mocks: MockResult[],
  range: TrendRange,
  now: number,
): TrendSeries {
  /** Raw accuracy per section for one sitting, for the mark's tooltip. */
  const splitOf = (mock: MockResult) => {
    const grouped = new Map<string, { correct: number; total: number }>();
    for (const section of mock.sections ?? []) {
      const cell = grouped.get(section.subjectId) ?? { correct: 0, total: 0 };
      cell.correct += section.correct;
      cell.total += section.total;
      grouped.set(section.subjectId, cell);
    }
    return [...grouped.entries()]
      .filter(([, cell]) => cell.total > 0)
      .map(([subjectId, cell]) => ({ subjectId, accuracy: cell.correct / cell.total }));
  };
  const windowDays = RANGE_WINDOW[range];
  const subjectIds = SUBJECTS.map((s) => s.id);

  const byDay = new Map<string, DayTally>();
  let earliest = now;
  for (const a of attempts) {
    if (a.at < earliest) earliest = a.at;
    const key = dayKey(a.at);
    const day =
      byDay.get(key) ?? { count: 0, correct: 0, bySubject: new Map<string, [number, number]>() };
    day.count += 1;
    if (a.correct) day.correct += 1;
    const pair = day.bySubject.get(a.subjectId) ?? [0, 0];
    pair[0] += 1;
    if (a.correct) pair[1] += 1;
    day.bySubject.set(a.subjectId, pair);
    byDay.set(key, day);
  }

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const spanDays = RANGE_DAYS[range];
  const firstDay = new Date(earliest);
  firstDay.setHours(0, 0, 0, 0);

  const start = new Date(
    spanDays === null
      ? firstDay.getTime()
      : Math.max(firstDay.getTime(), today.getTime() - (spanDays - 1) * DAY),
  );

  /* The window reaches back past the start of the range, so the first plotted
     day is already smoothed rather than starting from a single day's noise. */
  const walkFrom = new Date(start.getTime());
  walkFrom.setDate(walkFrom.getDate() - (windowDays - 1));

  const points: TrendPoint[] = [];
  const window: { key: string; day: DayTally | undefined }[] = [];
  const cursor = new Date(walkFrom);

  while (cursor.getTime() <= today.getTime()) {
    const key = dayKey(cursor.getTime());
    window.push({ key, day: byDay.get(key) });
    if (window.length > windowDays) window.shift();

    if (cursor.getTime() >= start.getTime()) {
      let count = 0;
      let correct = 0;
      const perSubject = new Map<string, [number, number]>();
      for (const entry of window) {
        if (!entry.day) continue;
        count += entry.day.count;
        correct += entry.day.correct;
        for (const [subjectId, [n, c]] of entry.day.bySubject) {
          const pair = perSubject.get(subjectId) ?? [0, 0];
          pair[0] += n;
          pair[1] += c;
          perSubject.set(subjectId, pair);
        }
      }
      const today_ = byDay.get(key);
      const bySubject: Record<string, number | null> = {};
      for (const id of subjectIds) {
        const pair = perSubject.get(id);
        bySubject[id] = pair && pair[0] >= RULES.trendMin ? pair[1] / pair[0] : null;
      }
      points.push({
        day: key,
        ms: cursor.getTime(),
        overall: count >= RULES.trendMin ? correct / count : null,
        bySubject,
        count: today_?.count ?? 0,
        correct: today_?.correct ?? 0,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
  }

  const from = start.getTime();
  const inRange = attempts.filter((a) => a.at >= from);
  const current = tallyOf(inRange);
  const span = spanDays === null ? Math.max(1, Math.round((now - from) / DAY)) : spanDays;
  const before = tallyOf(
    attempts.filter((a) => a.at >= from - span * DAY && a.at < from),
  );
  const comparable =
    current.attempts >= RULES.changeMin && before.attempts >= RULES.changeMin;

  return {
    range,
    windowDays,
    points,
    marks: mocks
      .filter((m) => m.at >= from)
      .sort((a, b) => a.at - b.at)
      .map((m) => ({
        ms: m.at,
        day: dayKey(m.at),
        score: m.score,
        setIndex: m.setIndex,
        bySubject: splitOf(m),
      })),
    note: noteFor(points),
    compare: {
      current: current.accuracy,
      previous: before.accuracy,
      delta:
        comparable && current.accuracy !== null && before.accuracy !== null
          ? current.accuracy - before.accuracy
          : null,
    },
    attempts: current.attempts,
  };
}

/* ---------------------------------------------------------------- engine -- */

export function buildAnalytics(input: {
  attempts: Attempt[];
  mocks: MockResult[];
  bank: QuestionIndexEntry[];
  targetScore: number;
  now?: number;
}): Analytics {
  const now = input.now ?? Date.now();
  const attempts = [...input.attempts].sort((a, b) => a.at - b.at);
  const mocks = [...input.mocks].sort((a, b) => a.at - b.at);
  const subjectIds = subjectsFor("sat").map((s) => s.id);

  /* The taxonomy join. Two maps rather than a scan per attempt: the matrix
     alone would otherwise walk the bank once per skill per difficulty. */
  const labels = new Map<string, { domain: string | null; skill: string | null }>();
  const bankByDomain = new Map<string, number>();
  const bankBySkill = new Map<string, number>();
  const bankLevels = new Map<string, Map<Difficulty, number>>();
  for (const q of input.bank) {
    labels.set(q.id, { domain: q.domain ?? null, skill: q.skill ?? null });
    if (q.domain) {
      bankByDomain.set(q.domain, (bankByDomain.get(q.domain) ?? 0) + 1);
    }
    if (q.skill) bankBySkill.set(q.skill, (bankBySkill.get(q.skill) ?? 0) + 1);
    const mix = bankLevels.get(q.subjectId) ?? new Map<Difficulty, number>();
    mix.set(q.difficulty, (mix.get(q.difficulty) ?? 0) + 1);
    bankLevels.set(q.subjectId, mix);
  }

  /** Difficulty mix of the bank per subject, as shares — the estimate's reference. */
  const mixFor = (subjectId: string): Map<Difficulty, number> => {
    const counts = bankLevels.get(subjectId);
    const out = new Map<Difficulty, number>();
    if (!counts) return out;
    let total = 0;
    for (const n of counts.values()) total += n;
    if (total === 0) return out;
    for (const [level, n] of counts) out.set(level, n / total);
    return out;
  };

  const bySubject = new Map<string, Attempt[]>();
  const byDomain = new Map<string, Attempt[]>();
  const bySkill = new Map<string, Attempt[]>();
  for (const a of attempts) {
    const list = bySubject.get(a.subjectId) ?? [];
    list.push(a);
    bySubject.set(a.subjectId, list);

    const label = labels.get(a.questionId);
    if (label?.domain) {
      const d = byDomain.get(label.domain) ?? [];
      d.push(a);
      byDomain.set(label.domain, d);
    }
    if (label?.skill) {
      const s = bySkill.get(label.skill) ?? [];
      s.push(a);
      bySkill.set(label.skill, s);
    }
  }

  /** Practice and review only — see the note on `medianOf`. */
  const timedOnly = (list: Attempt[]) => list.filter((a) => a.mode !== "mock");

  const totals = tallyOf(attempts);
  const distinct = new Set(attempts.map((a) => a.questionId)).size;

  /* ------------------------------------------------------------ estimate -- */

  const estimates: SubjectEstimate[] = subjectIds.map((subjectId) => {
    const list = bySubject.get(subjectId) ?? [];
    const e = estimateSection(list, mixFor(subjectId), now);
    return { subjectId, ...e };
  });
  const bothEstimated = estimates.every((e) => e.score !== null);
  /* Only a sitting long enough to be comparable can carry the headline score. */
  const scoredMocks = mocks.filter((m) => m.total >= RULES.mockMinQuestions);
  const lastMock = scoredMocks.length > 0 ? scoredMocks[scoredMocks.length - 1] : null;

  const estimate: ScoreEstimate = {
    subjects: estimates,
    total: bothEstimated
      ? estimates.reduce((sum, e) => sum + (e.score ?? 0), 0)
      : null,
    mock: lastMock
      ? { score: lastMock.score, at: lastMock.at, setIndex: lastMock.setIndex }
      : null,
    best: scoredMocks.length > 0 ? Math.max(...scoredMocks.map((m) => m.score)) : null,
  };

  /* --------------------------------------------------- the mastery matrix -- */

  const cellFor = (
    key: string,
    subjectId: string,
    list: Attempt[],
    available: number,
  ): Cell => {
    const t = tallyOf(list);
    const reliability = reliabilityOf(t.attempts);
    return {
      key,
      subjectId,
      attempts: t.attempts,
      correct: t.correct,
      accuracy: t.accuracy,
      reliability,
      band: bandOf(t.accuracy, reliability),
      seconds: medianOf(timedOnly(list)),
      change: changeOf(list, now),
      byLevel: levelsOf(list),
      available,
    };
  };

  const domains: DomainCell[] = subjectIds.flatMap((subjectId) =>
    domainsFor(subjectId).map((domain) => {
      const list = byDomain.get(domain.name) ?? [];
      const base = cellFor(
        domain.name,
        subjectId,
        list,
        bankByDomain.get(domain.name) ?? 0,
      );
      return {
        ...base,
        weight: domain.weight,
        skills: domain.skills.map((skill) =>
          cellFor(skill, subjectId, bySkill.get(skill) ?? [], bankBySkill.get(skill) ?? 0),
        ),
      };
    }),
  );

  /* -------------------------------------------------------- subject cards -- */

  const subjectReports = subjectIds.map((subjectId) => {
    const list = bySubject.get(subjectId) ?? [];
    const t = tallyOf(list);
    const hard = tallyOf(list.filter((a) => a.difficulty === 3));
    const mine = domains.filter(
      (d) => d.subjectId === subjectId && d.reliability !== "insufficient",
    );
    const ranked = [...mine].sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0));
    return {
      subjectId,
      attempts: t.attempts,
      correct: t.correct,
      accuracy: t.accuracy,
      change: changeOf(list, now),
      seconds: medianOf(timedOnly(list)),
      hard: { attempts: hard.attempts, correct: hard.correct, accuracy: hard.accuracy },
      best: ranked.length > 0 ? ranked[0] : null,
      worst: ranked.length > 1 ? ranked[ranked.length - 1] : null,
      share: totals.attempts > 0 ? t.attempts / totals.attempts : 0,
    };
  });

  /* -------------------------------------------------------- opportunities -- */

  /*
   * What a weakness is costing, in the currency the student cares about.
   *
   * The ceiling is the student's own best reliable domain in the same section,
   * not 100%: "you could gain 90 points by being perfect at Geometry" is not a
   * plan, whereas "Geometry at your Algebra level is worth 30 points" is
   * something a person can act on this week. Multiplying by the domain's
   * published exam weight is what stops the ranking from sending a student to
   * spend a fortnight on the 15% of Math that is Geometry when a smaller gap in
   * the 35% that is Algebra is worth more.
   */
  const opportunities: Opportunity[] = [];
  let closest = Number.POSITIVE_INFINITY;
  for (const subjectId of subjectIds) {
    const mine = domains.filter((d) => d.subjectId === subjectId);
    for (const d of mine) {
      if (d.reliability !== "reliable") {
        closest = Math.min(closest, RULES.reliable - d.attempts);
      }
    }
    const solid = mine.filter((d) => d.reliability === "reliable" && d.accuracy !== null);
    if (solid.length < 2) continue;
    const top = solid.reduce((best, d) => ((d.accuracy ?? 0) > (best.accuracy ?? 0) ? d : best));
    const ceiling = top.accuracy ?? 0;
    for (const d of solid) {
      const gap = Math.max(0, ceiling - (d.accuracy ?? 0));
      const points = toTen(gap * d.weight * RULES.sectionSpan);
      /* Under one scale step there is nothing to report: "this domain is
         costing you approximately zero points" is a row that takes up space to
         say nothing. */
      if (points < 10) continue;
      opportunities.push({
        key: d.key,
        subjectId,
        accuracy: d.accuracy ?? 0,
        attempts: d.attempts,
        ceiling,
        ceilingKey: top.key,
        points,
        weight: d.weight,
        change: d.change,
        seconds: d.seconds,
        band: d.band,
      });
    }
  }
  opportunities.sort((a, b) => b.points - a.points || a.accuracy - b.accuracy);

  /* ----------------------------------------------------------- difficulty -- */

  const levels: LevelReport[] = ([1, 2, 3] as Difficulty[]).map((level) => {
    const list = attempts.filter((a) => a.difficulty === level);
    const t = tallyOf(list);
    return {
      level,
      attempts: t.attempts,
      correct: t.correct,
      accuracy: t.accuracy,
      seconds: medianOf(timedOnly(list)),
      change: changeOf(list, now),
      share: totals.attempts > 0 ? t.attempts / totals.attempts : 0,
    };
  });

  /* -------------------------------------------------------- speed by domain -- */

  const timedAttempts = timedOnly(attempts).filter(
    (a) => typeof a.ms === "number" && a.ms > 500 && a.ms < 15 * 60_000,
  );
  const midSeconds = medianOf(timedAttempts) ?? 0;
  const midAccuracy = tallyOf(timedAttempts).accuracy ?? 0;
  const speedPoints: SpeedPoint[] = [];
  for (const d of domains) {
    const list = timedOnly(byDomain.get(d.key) ?? []);
    const seconds = medianOf(list);
    const t = tallyOf(list.filter((a) => typeof a.ms === "number" && a.ms > 500));
    if (seconds === null || t.attempts < RULES.provisional || t.accuracy === null) continue;
    const fast = seconds <= midSeconds;
    const accurate = t.accuracy >= midAccuracy;
    speedPoints.push({
      key: d.key,
      subjectId: d.subjectId,
      seconds,
      accuracy: t.accuracy,
      attempts: t.attempts,
      quadrant: fast
        ? accurate
          ? "fastAccurate"
          : "fastInaccurate"
        : accurate
          ? "slowAccurate"
          : "slowInaccurate",
    });
  }

  /* ----------------------------------------------------- period comparison -- */

  const windowStart = daysBack(now, RULES.windowDays - 1);
  const previousStart = daysBack(now, 2 * RULES.windowDays - 1);
  const currentWindow = attempts.filter((a) => a.at >= windowStart);
  const previousWindow = attempts.filter(
    (a) => a.at >= previousStart && a.at < windowStart,
  );
  const currentTally = tallyOf(currentWindow);
  const previousTally = tallyOf(previousWindow);
  const hasBaseline = previousTally.attempts >= RULES.changeMin;

  const delta = (a: number | null, b: number | null) =>
    hasBaseline && a !== null && b !== null ? a - b : null;

  const activeIn = (list: Attempt[]) => new Set(list.map((a) => dayKey(a.at))).size;
  const currentPace = medianOf(timedOnly(currentWindow));
  const previousPace = medianOf(timedOnly(previousWindow));

  const metrics: Metric[] = [
    {
      key: "accuracy",
      current: currentTally.accuracy,
      previous: previousTally.accuracy,
      delta: delta(currentTally.accuracy, previousTally.accuracy),
      good: "up",
      format: "percent",
    },
    {
      key: "questions",
      current: currentTally.attempts,
      previous: previousTally.attempts,
      delta: previousWindow.length > 0 ? currentTally.attempts - previousTally.attempts : null,
      good: "up",
      format: "count",
    },
    {
      key: "activeDays",
      current: activeIn(currentWindow),
      previous: activeIn(previousWindow),
      delta:
        previousWindow.length > 0 ? activeIn(currentWindow) - activeIn(previousWindow) : null,
      good: "up",
      format: "count",
    },
    {
      // Faster is better here, which is the whole reason `good` exists: colouring
      // every fall red would tell a student their improving pace is a problem.
      key: "pace",
      current: currentPace,
      previous: previousPace,
      delta: currentPace !== null && previousPace !== null ? currentPace - previousPace : null,
      good: "down",
      format: "seconds",
    },
    ...subjectIds.map((subjectId): Metric => {
      const cur = tallyOf(currentWindow.filter((a) => a.subjectId === subjectId));
      const prev = tallyOf(previousWindow.filter((a) => a.subjectId === subjectId));
      const comparable = cur.attempts >= RULES.changeMin && prev.attempts >= RULES.changeMin;
      return {
        key: "subject",
        subjectId,
        current: cur.accuracy,
        previous: prev.accuracy,
        delta:
          comparable && cur.accuracy !== null && prev.accuracy !== null
            ? cur.accuracy - prev.accuracy
            : null,
        good: "up",
        format: "percent",
      };
    }),
  ];

  /* -------------------------------------------------------------- activity -- */

  const year = contributionYear(attempts, now);
  const dayCounts = new Map<string, { count: number; correct: number }>();
  for (const a of attempts) {
    const key = dayKey(a.at);
    const cell = dayCounts.get(key) ?? { count: 0, correct: 0 };
    cell.count += 1;
    if (a.correct) cell.correct += 1;
    dayCounts.set(key, cell);
  }

  /** Longest run of consecutive practised days anywhere in the record. */
  const longestStreak = (() => {
    const days = [...dayCounts.keys()].sort();
    let best = 0;
    let run = 0;
    let previous: number | null = null;
    for (const key of days) {
      const [y, m, d] = key.split("-").map(Number);
      const ms = new Date(y, m - 1, d, 12).getTime();
      run = previous !== null && Math.round((ms - previous) / DAY) === 1 ? run + 1 : 1;
      previous = ms;
      if (run > best) best = run;
    }
    return best;
  })();

  const last7 = (() => {
    let count = 0;
    const cursor = new Date(now);
    cursor.setHours(12, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      if (dayCounts.has(dayKey(cursor.getTime()))) count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  })();

  const measuredMs = timedAttempts.reduce((sum, a) => sum + a.ms, 0);

  /* The day the current run began. "Every day since 4 July" is the same fact as
     "51 days" and a better sentence. */
  const currentStreak = streak(attempts, now);
  const streakStart = (() => {
    if (currentStreak === 0) return null;
    const cursor = new Date(now);
    cursor.setHours(12, 0, 0, 0);
    if (!dayCounts.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
    cursor.setDate(cursor.getDate() - (currentStreak - 1));
    return cursor.getTime();
  })();

  const activity: ActivityReport = {
    weeks: year.weeks,
    total: year.total,
    activeDays: year.activeDays,
    peak: year.peak,
    currentStreak,
    longestStreak,
    last7,
    streakStart,
    hours: measuredMs / 3_600_000,
  };

  /* ------------------------------------------------------------ milestones -- */

  const bestDay = [...dayCounts.entries()].sort((a, b) => b[1].count - a[1].count)[0] ?? null;
  const bestAccuracyDay =
    [...dayCounts.entries()]
      .filter(([, v]) => v.count >= RULES.bestDayMin)
      .sort((a, b) => b[1].correct / b[1].count - a[1].correct / a[1].count)[0] ?? null;

  const dateOf = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d, 12).getTime();
  };

  /**
   * The best seven consecutive days a section ever had, by accuracy.
   *
   * A two-pointer sweep over the already-sorted log rather than a filter per
   * start point: the naive version is quadratic, and a student with two years of
   * practice would pay for it on every render of this page.
   */
  const bestWeekFor = (subjectId: string) => {
    const list = bySubject.get(subjectId) ?? [];
    if (list.length < RULES.bestWeekMin) return null;
    let best: { accuracy: number; at: number; attempts: number } | null = null;
    let head = 0;
    let correct = 0;
    for (let tail = 0; tail < list.length; tail++) {
      if (list[tail].correct) correct += 1;
      while (list[tail].at - list[head].at >= 7 * DAY) {
        if (list[head].correct) correct -= 1;
        head += 1;
      }
      const attempts = tail - head + 1;
      if (attempts < RULES.bestWeekMin) continue;
      const accuracy = correct / attempts;
      if (!best || accuracy > best.accuracy) {
        best = { accuracy, at: list[head].at, attempts };
      }
    }
    return best;
  };

  const improved = [...domains]
    .filter((d) => d.change.delta !== null)
    .sort((a, b) => (b.change.delta ?? 0) - (a.change.delta ?? 0))[0];

  const nextMilestone = RULES.milestones.find((m) => m > totals.attempts) ?? null;
  const previousMilestone =
    [...RULES.milestones].reverse().find((m) => m <= totals.attempts) ?? 0;

  const bestWeeks = subjectIds
    .map((subjectId) => ({ subjectId, week: bestWeekFor(subjectId) }))
    .filter((entry) => entry.week !== null)
    .sort((a, b) => (b.week?.accuracy ?? 0) - (a.week?.accuracy ?? 0));

  const milestones: Milestone[] = [
    {
      id: "volume",
      value: totals.attempts,
      unit: "count",
      at: null,
      note: null,
      next: nextMilestone
        ? {
            target: nextMilestone,
            progress:
              (totals.attempts - previousMilestone) /
              Math.max(1, nextMilestone - previousMilestone),
          }
        : undefined,
    },
    {
      id: "bestDay",
      value: bestDay ? bestDay[1].count : null,
      unit: "count",
      at: bestDay ? dateOf(bestDay[0]) : null,
      note: bestDay ? Math.round((bestDay[1].correct / bestDay[1].count) * 100) : null,
    },
    {
      id: "bestAccuracyDay",
      value: bestAccuracyDay ? bestAccuracyDay[1].correct / bestAccuracyDay[1].count : null,
      unit: "percent",
      at: bestAccuracyDay ? dateOf(bestAccuracyDay[0]) : null,
      note: bestAccuracyDay ? bestAccuracyDay[1].count : null,
    },
    {
      id: "longestStreak",
      value: longestStreak > 0 ? longestStreak : null,
      unit: "days",
      at: null,
      note: activity.currentStreak,
    },
    {
      id: "bestMock",
      value: estimate.best,
      unit: "score",
      at:
        scoredMocks.length > 0
          ? scoredMocks.reduce((top, m) => (m.score > top.score ? m : top)).at
          : null,
      note: scoredMocks.length,
    },
    {
      id: "bestWeek",
      value: bestWeeks.length > 0 ? (bestWeeks[0].week?.accuracy ?? null) : null,
      unit: "percent",
      at: bestWeeks.length > 0 ? (bestWeeks[0].week?.at ?? null) : null,
      note: bestWeeks.length > 0 ? (bestWeeks[0].week?.attempts ?? null) : null,
      subjectId: bestWeeks.length > 0 ? bestWeeks[0].subjectId : undefined,
    },
    {
      id: "mostImproved",
      value: improved && (improved.change.delta ?? 0) > 0 ? improved.change.delta : null,
      unit: "points",
      at: null,
      note: improved ? improved.attempts : null,
      label: improved?.key,
      subjectId: improved?.subjectId,
    },
  ];

  /* --------------------------------------------------------------- mocks -- */

  const mockReport: MockReport | null =
    mocks.length === 0
      ? null
      : (() => {
          const runs: MockRun[] = mocks.map((m) => {
            const grouped = new Map<string, { correct: number; total: number }>();
            for (const section of m.sections ?? []) {
              const cell = grouped.get(section.subjectId) ?? { correct: 0, total: 0 };
              cell.correct += section.correct;
              cell.total += section.total;
              grouped.set(section.subjectId, cell);
            }
            return {
              id: m.id,
              at: m.at,
              score: m.score,
              setIndex: m.setIndex,
              correct: m.correct,
              total: m.total,
              full: m.total >= RULES.mockMinQuestions,
              bySubject: subjectIds
                .map((subjectId) => {
                  const cell = grouped.get(subjectId);
                  return cell && cell.total > 0
                    ? {
                        subjectId,
                        correct: cell.correct,
                        total: cell.total,
                        accuracy: cell.correct / cell.total,
                      }
                    : null;
                })
                .filter((x): x is NonNullable<typeof x> => x !== null),
            };
          });
          const scored = runs.filter((run) => run.full);
          const latest = scored.length > 0 ? scored[scored.length - 1] : null;
          const best =
            scored.length > 0
              ? scored.reduce((top, r) => (r.score > top.score ? r : top), scored[0])
              : null;
          /* Raw accuracy across every sitting, shortened ones included: two
             answers under a clock are still two answers under a clock, and this
             figure is a share rather than a scaled score. */
          const mockCorrect = runs.reduce((sum, r) => sum + r.correct, 0);
          const mockTotal = runs.reduce((sum, r) => sum + r.total, 0);
          const practice = tallyOf(attempts.filter((a) => a.mode !== "mock"));
          return {
            runs,
            scored,
            latest,
            best,
            shortened: runs.length - scored.length,
            step:
              scored.length > 1 && latest !== null
                ? latest.score - scored[scored.length - 2].score
                : null,
            perMock:
              scored.length > 1 && latest !== null
                ? Math.round((latest.score - scored[0].score) / (scored.length - 1))
                : null,
            gain: scored.length > 1 && latest !== null ? latest.score - scored[0].score : null,
            mockAccuracy: mockTotal > 0 ? mockCorrect / mockTotal : 0,
            practiceAccuracy: practice.accuracy,
          };
        })();

  /* ------------------------------------------------------------- insights -- */

  const insights: Insight[] = [];
  const points = (n: number) => Math.round(n * 100);

  const rising = [...domains]
    .filter((d) => (d.change.delta ?? 0) >= RULES.changeMinPoints / 100)
    .sort((a, b) => (b.change.delta ?? 0) - (a.change.delta ?? 0))[0];
  if (rising && rising.change.current !== null && rising.change.previous !== null) {
    insights.push({
      id: `improving:${rising.key}`,
      kind: "improving",
      tone: "good",
      values: {
        name: rising.key,
        from: points(rising.change.previous),
        to: points(rising.change.current),
        /* The headline figure the insight leads with; from/to are the evidence
           under it. */
        gain: Math.round((rising.change.delta ?? 0) * 1000) / 10,
        days: RULES.windowDays,
      },
      priority: 80,
    });
  }

  const falling = [...domains]
    .filter((d) => (d.change.delta ?? 0) <= -RULES.changeMinPoints / 100)
    .sort((a, b) => (a.change.delta ?? 0) - (b.change.delta ?? 0))[0];
  if (falling && falling.change.current !== null && falling.change.previous !== null) {
    insights.push({
      id: `declining:${falling.key}`,
      kind: "declining",
      tone: "warn",
      values: {
        name: falling.key,
        from: points(falling.change.previous),
        to: points(falling.change.current),
        drop: Math.abs(points(falling.change.delta ?? 0)),
        days: RULES.windowDays,
      },
      priority: 90,
    });
  }

  const hard = levels[2];
  const medium = levels[1];
  if (
    hard.attempts >= RULES.reliable &&
    medium.attempts >= RULES.reliable &&
    hard.accuracy !== null &&
    medium.accuracy !== null &&
    medium.accuracy - hard.accuracy >= 0.15
  ) {
    insights.push({
      id: "hardGap",
      kind: "hardGap",
      tone: "neutral",
      values: {
        hard: points(hard.accuracy),
        medium: points(medium.accuracy),
        gap: points(medium.accuracy - hard.accuracy),
        attempts: hard.attempts,
      },
      priority: 70,
    });
  }

  if (activity.currentStreak >= 3 || last7 >= 4) {
    insights.push({
      id: "consistency",
      kind: "consistency",
      tone: "good",
      values: { days: last7, streak: activity.currentStreak },
      priority: 50,
    });
  }

  const thin = subjectReports.find(
    (s) => totals.attempts >= 40 && s.share > 0 && s.share < 0.3,
  );
  if (thin) {
    insights.push({
      id: `imbalance:${thin.subjectId}`,
      kind: "imbalance",
      tone: "warn",
      values: {
        subject: thin.subjectId,
        share: Math.round(thin.share * 100),
        attempts: thin.attempts,
        days: RULES.windowDays,
      },
      priority: 75,
    });
  }

  const slow = speedPoints
    .filter((p) => p.quadrant === "slowInaccurate" && p.attempts >= RULES.reliable)
    .sort((a, b) => b.seconds - a.seconds)[0];
  if (slow && midSeconds > 0) {
    insights.push({
      id: `slow:${slow.key}`,
      kind: "slowDomain",
      tone: "warn",
      values: {
        name: slow.key,
        // Formatted here rather than in the template: `values` is the engine's
        // display-ready output, and "105s a question" is not how a person reads
        // a minute and three quarters.
        seconds: asDuration(slow.seconds),
        median: asDuration(midSeconds),
        accuracy: points(slow.accuracy),
        overall: points(midAccuracy),
      },
      priority: 65,
    });
  }

  if (
    mockReport &&
    mockReport.practiceAccuracy !== null &&
    Math.abs(mockReport.practiceAccuracy - mockReport.mockAccuracy) >= 0.08
  ) {
    insights.push({
      id: "mockGap",
      kind: "mockGap",
      tone: mockReport.mockAccuracy < mockReport.practiceAccuracy ? "warn" : "good",
      values: {
        mock: points(mockReport.mockAccuracy),
        practice: points(mockReport.practiceAccuracy),
        gap: Math.abs(points(mockReport.mockAccuracy - mockReport.practiceAccuracy)),
      },
      priority: 85,
    });
  }

  if (opportunities.length === 0 && totals.attempts > 0 && Number.isFinite(closest)) {
    insights.push({
      id: "reliability",
      kind: "reliability",
      tone: "neutral",
      values: { need: Math.max(1, closest), threshold: RULES.reliable },
      priority: 40,
    });
  }

  insights.sort((a, b) => b.priority - a.priority);

  /* ---------------------------------------------------------------- focus -- */

  const focus: FocusItem[] = opportunities.slice(0, 3).map((o, index) => ({
    key: o.key,
    subjectId: o.subjectId,
    accuracy: o.accuracy,
    points: o.points,
    impact: index === 0 ? "high" : o.points >= 20 ? "medium" : "low",
    href: "/practice",
    kind: "domain" as const,
  }));

  return {
    any: attempts.length > 0 || mocks.length > 0,
    totals: {
      attempts: totals.attempts,
      correct: totals.correct,
      accuracy: totals.accuracy ?? 0,
      questions: distinct,
    },
    estimate,
    subjects: subjectReports,
    trend: {
      /* Only sittings long enough to score are pinned on the timeline — see
         RULES.mockMinQuestions. */
      "7d": buildTrend(attempts, scoredMocks, "7d", now),
      "30d": buildTrend(attempts, scoredMocks, "30d", now),
      "90d": buildTrend(attempts, scoredMocks, "90d", now),
      all: buildTrend(attempts, scoredMocks, "all", now),
    },
    domains,
    opportunities,
    opportunityTotal: {
      points: opportunities.reduce((sum, o) => sum + o.points, 0),
      domains: opportunities.length,
    },
    opportunityPending: Number.isFinite(closest) ? Math.max(1, closest) : 0,
    reliableDomains: domains.filter((d) => d.reliability === "reliable").length,
    levels,
    speed: {
      points: speedPoints.sort((a, b) => a.seconds - b.seconds),
      midSeconds,
      midAccuracy,
      timed: timedAttempts.length,
    },
    period: { days: RULES.windowDays, metrics, hasBaseline },
    milestones,
    insights: insights.slice(0, 4),
    focus,
    mocks: mockReport,
    activity,
    pace: {
      perDay: currentTally.attempts / RULES.windowDays,
      activeDays: activeIn(currentWindow),
      medianSeconds: currentPace,
    },
  };
}

/* -------------------------------------------------------------- formatting -- */

/** "82%" — one place, so no two panels round differently. */
export function asPercent(value: number | null, digits = 0): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

/** A signed percentage-point change: "+4.7", "−2.1". */
export function asPoints(value: number | null, digits = 1): string {
  if (value === null) return "—";
  const n = value * 100;
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(digits)}`;
}

/** "1m 14s" / "48s" — a pace a person reads, not 74000. */
export function asDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`;
}

/** "August 18" — the date a tooltip should say instead of "2026-08-18". */
export function asDate(ms: number, withYear = false): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: withYear ? "numeric" : undefined,
  }).format(new Date(ms));
}

/** "Aug 18" — the same date where the space is an axis tick. */
export function asShortDate(ms: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(ms),
  );
}

/** Fills `{name}` placeholders in a dictionary string. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}
