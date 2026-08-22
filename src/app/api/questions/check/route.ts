import { NextResponse } from "next/server";
import { MAX_GRADING_BATCH } from "@/lib/questions/limits";
import { gradeAnswer } from "@/lib/questions/server";
import { consumeRate } from "@/lib/rate-limit";
import { requireUser } from "@/lib/supabase/guard";

export const runtime = "nodejs";

/**
 * Grading. The only route by which a correct answer or an explanation reaches a
 * browser, and it wants a submitted choice in exchange.
 *
 * Two shapes, because two things in the product need marking and they need very
 * different amounts back:
 *
 *   { id, choice }        practice. The student has committed to an answer and is
 *                         owed the verdict, the right choice and the worked
 *                         solution — that reveal is the teaching moment.
 *
 *   { answers: [...] }    a mock. Returns correct/incorrect and NOTHING else: no
 *                         answer index, no explanation. The real test tells you
 *                         nothing until it is over, and the two places this is
 *                         called — module routing halfway through, and scoring at
 *                         the end — only ever needed the tally.
 *
 * That second shape is also a repair. Scoring used to happen in the browser
 * against `question.answer`, which means that until now every correct answer in
 * a timed mock was sitting in the tab the student was taking the exam in. Reading
 * them out of it required no tooling beyond DevTools.
 *
 * ── What this endpoint cannot stop ─────────────────────────────────────────
 * It is an oracle, unavoidably: anything that tells a student whether they were
 * right can be asked the same question with each choice in turn, and four calls
 * settle a four-option item. That is inherent to the feature, not an oversight.
 * What is in our gift is to make it bounded, attributable and slow — it is
 * authenticated, counted per account by `consume_rate`, and capped per request —
 * rather than the single unfiltered response it replaces.
 */

/*
 * Ceilings, and why these numbers.
 *
 * Both paths here are oracles, so both are charged by QUESTION rather than by
 * request — the same reasoning as the bodies limit, and for a stronger reason: a
 * batch of 120 correctness answers costs one request, and counting requests let
 * four such calls with four different choices settle 120 items a minute. Charging
 * per question removes that entirely: a batch of 120 costs 120.
 *
 * The awkward legitimate case is the end of a mock. Scoring is one batch of up to
 * 98, and then every missed question is revealed individually — up to 98 more
 * single calls, in the worst case where the student got everything wrong. The
 * minute ceilings have to clear that burst; the hour ceilings are what bind.
 *
 *   single reveals   150/min   400/hour
 *   batch gradings   200/min   600/hour
 *
 * Extracting a *complete* question needs a body and a reveal, so the binding
 * constraint on that is the smaller of the hourly figures: 400 an hour.
 */
const CHECKS_PER_MINUTE = 150;
const CHECKS_PER_HOUR = 400;

const SCORE_QUESTIONS_PER_MINUTE = 200;
const SCORE_QUESTIONS_PER_HOUR = 600;

/** Every question in one sitting — see MAX_GRADING_BATCH. */
const MAX_BATCH = MAX_GRADING_BATCH;

type Submission = { id?: unknown; choice?: unknown };

function tooMany(retryAfter: number, what: string) {
  return NextResponse.json(
    { error: `Too many ${what} in a row. Give it a moment.` },
    { status: 429, headers: { "retry-after": String(retryAfter) } },
  );
}

/**
 * A choice as the database will accept it, or null if it is not one.
 *
 * -1 is meaningful and must survive: practice uses it to reveal a question the
 * student gave up on, and a mock uses it for one the timer took away. Anything
 * below that, or not an integer, is a malformed request rather than a wrong
 * answer — grading it as wrong would quietly record an attempt the student
 * never made.
 */
function toChoice(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < -1) return null;
  return value;
}

export async function POST(request: Request) {
  const guarded = await requireUser(request);
  if (!guarded.ok) return guarded.response;
  const { client, user } = guarded.caller;

  let body: { id?: unknown; choice?: unknown; answers?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  /* ---------------------------- a mock: tally only ---------------------------- */
  if (Array.isArray(body.answers)) {
    if (body.answers.length === 0) return NextResponse.json({ results: [] });
    if (body.answers.length > MAX_BATCH) {
      return NextResponse.json(
        { error: `At most ${MAX_BATCH} questions per request.` },
        { status: 413 },
      );
    }

    const scoreMinute = await consumeRate(
      client,
      "questions:score",
      user.id,
      SCORE_QUESTIONS_PER_MINUTE,
      60,
      body.answers.length,
    );
    if (!scoreMinute.ok) return tooMany(scoreMinute.retryAfter, "scoring requests");

    const scoreHour = await consumeRate(
      client,
      "questions:score:hour",
      user.id,
      SCORE_QUESTIONS_PER_HOUR,
      3_600,
      body.answers.length,
    );
    if (!scoreHour.ok) return tooMany(scoreHour.retryAfter, "scoring requests");

    const submissions = body.answers as Submission[];
    const results: { id: string; correct: boolean }[] = [];

    for (const submission of submissions) {
      const id = typeof submission?.id === "string" ? submission.id.trim() : "";
      const choice = toChoice(submission?.choice);
      if (!id || choice === null) {
        return NextResponse.json(
          { error: "Every entry needs a question id and a choice." },
          { status: 400 },
        );
      }

      const graded = await gradeAnswer(client, id, choice);
      /*
       * A question that cannot be graded is reported as incorrect rather than
       * failing the whole request. Mid-mock this is the difference between a
       * routing decision and a student losing their sitting to one deleted row,
       * and it can only ever cost a mark that was already unanswerable.
       */
      results.push({ id, correct: graded.ok ? graded.verdict.correct : false });
    }

    // Deliberately no `answer` and no `explanation` on this path.
    return NextResponse.json({ results });
  }

  /* --------------------------- practice: full reveal -------------------------- */
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const choice = toChoice(body.choice);
  if (!id || choice === null) {
    return NextResponse.json({ error: "Which question, and which choice?" }, { status: 400 });
  }

  const checkMinute = await consumeRate(client, "questions:check", user.id, CHECKS_PER_MINUTE, 60);
  if (!checkMinute.ok) return tooMany(checkMinute.retryAfter, "answers");

  const checkHour = await consumeRate(
    client,
    "questions:check:hour",
    user.id,
    CHECKS_PER_HOUR,
    3_600,
  );
  if (!checkHour.ok) return tooMany(checkHour.retryAfter, "answers");

  const graded = await gradeAnswer(client, id, choice);
  if (!graded.ok) {
    return NextResponse.json({ error: graded.error }, { status: graded.status });
  }

  return NextResponse.json({
    id,
    correct: graded.verdict.correct,
    answer: graded.verdict.answer,
    explanation: graded.verdict.explanation ?? null,
  });
}
