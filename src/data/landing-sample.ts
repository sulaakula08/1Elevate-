import type { Question } from "./types";

/**
 * Deterministic snapshot of custom_questions.sat-math-dev-001 from the verified
 * development project. Keeping it in the bundle makes the public preview
 * immediate; Hero uses the current bank row when the same id is available.
 */
export const LANDING_SAMPLE_QUESTION: Question = {
  id: "sat-math-dev-001",
  exam: "sat",
  subjectId: "sat-math",
  topic: "Linear equations in one variable",
  domain: "Algebra",
  difficulty: 1,
  prompt: { en: "If $3x + 6 = 21$, what is the value of $x$?" },
  choices: [{ en: "3" }, { en: "4" }, { en: "5" }, { en: "9" }],
  answer: 2,
  explanation: {
    en: "Subtract 6 from both sides to get $3x = 15$, then divide by 3.",
  },
  custom: true,
  createdAt: Date.parse("2026-08-12T20:29:12.938421+00:00"),
};

/**
 * The two items the landing page's learning loop runs on.
 *
 * They are ordinary `Question` records — same shape, same taxonomy strings, same
 * `$…$` notation as anything an admin writes in the editor — because the loop
 * renders them through the real `QuestionView`. Nothing here is a mock-up of a
 * question; it is a question the bank could serve tomorrow.
 *
 * They are a pair on purpose, and the pair is the whole argument of the section:
 *
 *   LOOP_MISS  is failed by dropping a minus sign when dividing by −3.
 *   LOOP_NEXT  is the same skill one difficulty up, and the same sign step is
 *              the one place it can go wrong.
 *
 * So "the miss decides what you practise next" is demonstrable on screen rather
 * than asserted in a heading. Change one and the other has to change with it.
 *
 * Domain and skill are taken verbatim from `taxonomy.ts` (the College Board
 * names), so the chips the loop draws read exactly like the ones in Review.
 */
export const LOOP_MISS_QUESTION: Question = {
  id: "landing-loop-01",
  exam: "sat",
  subjectId: "sat-math",
  topic: "Linear equations in two variables",
  domain: "Algebra",
  skill: "Linear equations in two variables",
  difficulty: 2,
  /* Both strings are kept short on purpose: the loop renders them inside a fixed
     product frame, and a prompt that runs to three lines pushes the explanation
     out of the bottom of it on step two. */
  prompt: {
    en: "The line $4x - 3y = 12$ is graphed in the $xy$-plane. What is the $y$-coordinate of its $y$-intercept?",
  },
  choices: [{ en: "$-4$" }, { en: "$3$" }, { en: "$4$" }, { en: "$12$" }],
  answer: 0,
  explanation: {
    en: "At the $y$-intercept, $x = 0$, so $-3y = 12$ and $y = -4$. Dividing by a negative flips the sign; skip that and $-4$ becomes $4$.",
  },
};

/** The choice the loop picks: right arithmetic, lost sign. */
export const LOOP_MISS_CHOICE = 2;

export const LOOP_NEXT_QUESTION: Question = {
  id: "landing-loop-02",
  exam: "sat",
  subjectId: "sat-math",
  topic: "Linear equations in two variables",
  domain: "Algebra",
  skill: "Linear equations in two variables",
  difficulty: 3,
  prompt: {
    en: "A line in the $xy$-plane has $x$-intercept $6$ and passes through $(0, -8)$. Which equation defines the line?",
  },
  choices: [
    { en: "$4x - 3y = 24$" },
    { en: "$4x + 3y = 24$" },
    { en: "$3x - 4y = 18$" },
    { en: "$4x - 3y = -24$" },
  ],
  answer: 0,
  explanation: {
    en: "Both intercepts are given, so test them: at $(6, 0)$, $4(6) - 3(0) = 24$, and at $(0, -8)$, $-3(-8) = 24$. The sign on the $y$ term is the same step the first question turned on.",
  },
};

/**
 * Rows for the question-bank surface on the landing page.
 *
 * Interface content, not results: this is what the bank looks like with a
 * session's worth of history behind it, the same way the hero shows what one
 * question looks like. Every domain and skill string is copied from
 * `taxonomy.ts`, and `state` uses the three words the real bank filters on.
 *
 * Deliberately unbalanced — five Math, four Reading & Writing, and the misses
 * clustered in Algebra — because a preview where every section has the same
 * number of everything is a preview of nothing.
 */
export type BankPreviewRow = {
  subjectId: "sat-rw" | "sat-math";
  domain: string;
  skill: string;
  difficulty: 1 | 2 | 3;
  state: "missed" | "unseen" | "solved";
};

export const BANK_PREVIEW_ROWS: BankPreviewRow[] = [
  {
    subjectId: "sat-math",
    domain: "Algebra",
    skill: "Linear equations in two variables",
    difficulty: 2,
    state: "missed",
  },
  {
    subjectId: "sat-rw",
    domain: "Information and Ideas",
    skill: "Command of Evidence (Textual)",
    difficulty: 3,
    state: "missed",
  },
  {
    subjectId: "sat-math",
    domain: "Algebra",
    skill: "Systems of two linear equations",
    difficulty: 3,
    state: "missed",
  },
  {
    subjectId: "sat-rw",
    domain: "Standard English Conventions",
    skill: "Boundaries",
    difficulty: 2,
    state: "unseen",
  },
  {
    subjectId: "sat-math",
    domain: "Advanced Math",
    skill: "Nonlinear functions",
    difficulty: 3,
    state: "unseen",
  },
  {
    subjectId: "sat-rw",
    domain: "Craft and Structure",
    skill: "Words in Context",
    difficulty: 1,
    state: "solved",
  },
  {
    subjectId: "sat-math",
    domain: "Problem-Solving and Data Analysis",
    skill: "Percentages",
    difficulty: 1,
    state: "solved",
  },
  {
    subjectId: "sat-rw",
    domain: "Expression of Ideas",
    skill: "Transitions",
    difficulty: 2,
    state: "unseen",
  },
  {
    subjectId: "sat-math",
    domain: "Geometry and Trigonometry",
    skill: "Area and volume",
    difficulty: 2,
    state: "solved",
  },
];

/**
 * The review-and-progress surface, as five skills with a record behind them.
 *
 * Same status as the bank rows above: a depiction of the screen, ordered the way
 * `weakTopics()` orders it — weakest first — and with accuracies that agree with
 * their own fractions. `queue`, `skills` and `streak` are the three figures the
 * real Review page puts above its list.
 */
export const PROGRESS_PREVIEW = {
  queue: 12,
  skills: 5,
  streak: 9,
  rows: [
    { skill: "Systems of two linear equations", correct: 4, total: 9 },
    { skill: "Command of Evidence (Textual)", correct: 5, total: 11 },
    { skill: "Linear equations in two variables", correct: 6, total: 10 },
    { skill: "Boundaries", correct: 9, total: 14 },
    /* 11/15 rather than 12/15: `weakTopics()` cuts strictly under 80% accuracy,
       and 12/15 is exactly 80% — a row that could never actually appear on this
       list, sitting on it. 11/15 rounds to 73%, keeps this the least-weak of the
       five (44/45/60/64/73, ascending), and stays honestly inside the cutoff. */
    { skill: "Words in Context", correct: 11, total: 15 },
  ],
} as const;

/**
 * The worked example the loop's last step animates.
 *
 * Not a result, a projection or an average: this is what the attempt log holds
 * after the four steps the section has just shown, counted by hand against the
 * functions that actually compute it.
 *
 *   before   the skill stands at 2 right of 6 — the miss the loop opened with is
 *            the sixth attempt.
 *   after    the review session takes it to 6 of 10.
 *   neighbour a second skill, untouched by the loop, at 4 of 9.
 *
 * Two real mechanics are being demonstrated, and the numbers are chosen so both
 * are true rather than nearly true:
 *
 *   `weakTopics()` sorts by accuracy, weakest first. At 33% this skill is the
 *   first thing the product asks for; at 60% the neighbour's 44% is worse, so it
 *   is no longer first. That is the movement the last step animates — and note
 *   that it is *not* "it left your focus list", which needs 80% and one review
 *   session cannot honestly buy.
 *
 *   `reviewQueue()` drops an item once its last two attempts are both correct,
 *   which is why the queue goes from 12 to 11 and not to 0.
 *
 * Anything that looks like an outcome — a score, a gain, a student — lives in
 * `landing-demo.ts` behind its own switch, and not here.
 */
export const LOOP_PROGRESS_EXAMPLE = {
  skill: "Linear equations in two variables",
  before: { correct: 2, total: 6 },
  after: { correct: 6, total: 10 },
  /**
   * Two skills the loop does not touch, so the list looks like a list and the
   * reordering has something to reorder against.
   *
   * Weakest first, the order `weakTopics()` produces: before the review session
   * that is 33% / 44% / 71%, and after it is 44% / 60% / 71%. The rows keep their
   * DOM order and the marker moves, which is the one thing being animated.
   *
   * Both are under 80% because that is the cutoff `weakTopics()` applies — a row
   * at 85% could not appear on this list at all.
   */
  neighbour: { skill: "Systems of two linear equations", correct: 4, total: 9 },
  third: { skill: "Boundaries", correct: 10, total: 14 },
  /** Skills on the list but below the fold of the frame. Keeps `5` consistent. */
  moreSkills: 2,
  /** Items due before the miss is filed, and after it is mastered. */
  queueBefore: 11,
  queueAfter: 11,
  /** With the miss filed, between step 3 and step 5. */
  queuePeak: 12,
} as const;
