import { NextResponse } from "next/server";
import type { Question } from "@/data/types";
import { SEED_QUESTIONS } from "@/data";
import { MAX_IDS_PER_REQUEST } from "@/lib/questions/limits";
import { readAdminBank, readBodies, readIndex } from "@/lib/questions/server";
import { consumeRate } from "@/lib/rate-limit";
import { supabaseConfigured, tokenFrom, userClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * The shared question bank written in the admin editor.
 *
 * This is what makes an admin role mean anything: before it, a pasted question
 * lived in the author's own browser and no student ever saw it. Now every
 * signed-in student reads the same rows.
 *
 * Authorisation is not decided here, and neither is what a caller may see of a
 * question. Both live in Postgres: `authenticated` may select only the taxonomy
 * columns of custom_questions, content comes back through SECURITY DEFINER
 * functions that check the caller themselves, and only an admin may write. So a
 * mistake in this handler cannot turn into a student editing the bank, and it
 * cannot turn into a student reading an answer either. See the question-bank
 * migration and `lib/questions/server.ts`.
 *
 * GET serves three different readers, because they need three different amounts:
 *
 *   (default)      the taxonomy index for the whole bank — what the practice
 *                  browser, the review queue and the progress charts count.
 *   ?ids=a,b,c     content for the questions actually on screen, at most
 *                  MAX_IDS_PER_REQUEST of them, never including an answer.
 *   ?view=full     whole rows for the editor. Admins only, enforced in the
 *                  database rather than here.
 */

function notConfigured() {
  return NextResponse.json(
    { error: "Supabase is not configured. See DATABASE.md." },
    { status: 503 },
  );
}

function unauthorized() {
  return NextResponse.json({ error: "Sign in first." }, { status: 401 });
}

async function caller(request: Request) {
  const token = tokenFrom(request);
  if (!token) return null;
  const client = userClient(token);
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return { client, user: data.user };
}

/**
 * The question body lives in a jsonb column rather than fifteen text columns.
 * Prompts, choices and explanations are all localised objects whose shape is
 * the app's business, and flattening them into SQL would mean a migration every
 * time a language is added.
 */
function toRow(question: Question, authorId: string) {
  return {
    id: String(question.id),
    exam: String(question.exam),
    subject_id: String(question.subjectId),
    topic: String(question.topic),
    domain: question.domain ?? null,
    difficulty: Math.min(3, Math.max(1, Number(question.difficulty) || 1)),
    answer: Number(question.answer),
    payload: {
      passage: question.passage ?? null,
      // Figures ride in the payload for the same reason the prompt does: it is
      // jsonb, so a new field costs no migration.
      figure: question.figure ?? null,
      prompt: question.prompt,
      choices: question.choices,
      explanation: question.explanation,
      // Skill rides in the payload rather than in a column of its own. It is
      // free text the author types, nothing queries it in SQL, and putting it
      // here means the field works without a migration — the same reason the
      // prompt and the choices live in jsonb.
      skill: question.skill ?? null,
      generatedBy: question.generatedBy ?? null,
    },
    created_by: authorId,
  };
}

/**
 * The same row for an edit, minus `created_by`.
 *
 * Leaving the column out of the SET list is what preserves the original author:
 * the row keeps whatever it already had, so nobody has to read it back first and
 * the last admin to touch a question cannot end up owning it. `id` goes too — it
 * is the filter, not a field to rewrite.
 */
function toUpdate(question: Question) {
  // Built by naming the columns rather than by discarding two from `toRow`, so
  // that adding a column to `toRow` is a decision here as well: a new field that
  // should not be rewritten on an edit stays out of this list on purpose.
  const row = toRow(question, "");
  return {
    exam: row.exam,
    subject_id: row.subject_id,
    topic: row.topic,
    domain: row.domain,
    difficulty: row.difficulty,
    answer: row.answer,
    payload: row.payload,
  };
}

/** Enough to reject a malformed paste before it reaches the database. */
function invalid(question: Question): string | null {
  // No id check: a new question arrives without one and is numbered below.
  if (!question) return "Empty question.";
  if (!question.subjectId) return "Every question needs a subject.";
  if (!Array.isArray(question.choices) || question.choices.length < 2) {
    return "Every question needs at least two choices.";
  }
  // Read into a local first: `answer` is optional on the delivered shape, and a
  // save that arrives without one is a malformed paste rather than a question
  // whose answer is merely unknown.
  const answer = question.answer;
  if (
    typeof answer !== "number" ||
    !Number.isInteger(answer) ||
    answer < 0 ||
    answer >= question.choices.length
  ) {
    return "The answer must be the index of one of the choices.";
  }
  return null;
}

const MAX_BATCH = 200;

/*
 * Why a save failed, in words an author can act on.
 *
 * Every failure used to come back as "Content editing is for admins", which was
 * a guess dressed as a fact: a not-null violation, a check constraint and an
 * actual permission refusal all produced the same sentence, so a save that was
 * failing for a fixable reason looked like one that never could. The Postgres
 * code is the only thing that knows which it is.
 */
type WriteError = { code?: string; message?: string; details?: string | null };

function writeFailure(error: WriteError): { error: string } {
  switch (error.code) {
    case "23505":
      return {
        error:
          "That question number was taken while you were writing. Nothing was saved — try again.",
      };
    case "23502":
      return { error: "A required field was empty. Check the topic, prompt and answer." };
    case "23514":
      return { error: "A value was out of range — difficulty must be 1, 2 or 3." };
    case "23503":
      return { error: "The author record is missing. Sign out and back in, then retry." };
    case "42501":
      return { error: "Could not save. Content editing is for admins." };
    default:
      // The driver text names columns and constraints, so it stays out of the
      // browser — but the code is safe and is what makes a report actionable.
      return { error: `Could not save the question. (${error.code ?? "unknown"})` };
  }
}

const statusFor = (error: WriteError) =>
  error.code === "23505" ? 409 : error.code === "42501" ? 403 : 400;

/**
 * Question ids are a running number per section: sat-math-041, sat-rw-018.
 *
 * They are allocated here rather than in the browser because two admins writing
 * at the same moment would otherwise pick the same number, and the save is an
 * upsert — the second one would quietly overwrite the first's question instead
 * of failing. The server holds the only view of what already exists.
 */
/**
 * The number at the end of an id, or null if it does not carry one.
 *
 * Written without building a pattern from a string. It used to be
 * `new RegExp(`^${subjectId}-(\d+)$`)`, and inside a template literal a lone
 * backslash before d is not an escape — it collapsed to a literal "d", so the
 * pattern matched the letter rather than a digit and every existing id read as
 * unnumbered. The allocator therefore always believed the section was empty and
 * always handed out 001.
 *
 * A literal regex cannot lose its backslash, and comparing the prefix directly
 * means a subject id with a regex metacharacter in it can never change the
 * meaning of the pattern either.
 */
const DIGITS = /^\d+$/;

function suffixOf(id: string, subjectId: string): number | null {
  const prefix = `${subjectId}-`;
  if (!id.startsWith(prefix)) return null;
  const tail = id.slice(prefix.length);
  return DIGITS.test(tail) ? Number(tail) : null;
}

/**
 * The highest number already used for a section, across both the shipped bank
 * and the database.
 *
 * SEED_QUESTIONS is empty today, so in practice numbering starts at 001 per
 * section. It is still consulted because a shipped set is not stored in
 * Postgres, and if one ever returns — a diagnostic, say — counting only the
 * rows would hand a new question an id that already belongs to a shipped one.
 */
function highestUsed(subjectId: string, existingIds: string[]): number {
  let top = 0;
  for (const question of SEED_QUESTIONS) {
    if (question.subjectId !== subjectId) continue;
    const n = suffixOf(question.id, subjectId);
    if (n !== null && n > top) top = n;
  }
  for (const id of existingIds) {
    const n = suffixOf(id, subjectId);
    if (n !== null && n > top) top = n;
  }
  return top;
}

const formatId = (subjectId: string, n: number) => `${subjectId}-${String(n).padStart(3, "0")}`;

/*
 * Ceilings on the shared counter in Postgres, sized from measured usage.
 *
 * ── The unit ───────────────────────────────────────────────────────────────
 * Bodies are charged per QUESTION, not per request, which is the only unit that
 * separates a student from a scraper. Measured against the real app: opening a
 * practice set costs 8-10, each Next costs exactly 1, a review page costs 6-12,
 * and a mock module costs 27. A scraper wants the maximum every time. Counting
 * requests charged both the same, and therefore had to be loose enough for the
 * scraper — 30 requests a minute at 30 ids was 900 questions a minute.
 *
 * ── The numbers ────────────────────────────────────────────────────────────
 * A whole heavy session, measured end to end — open practice, answer five,
 * refresh, browse and page through review, sit a complete four-module mock —
 * costs 55 questions. The worst legitimate burst is a mock: entering module one
 * (27), submitting it and entering module two (27) inside the same minute, with
 * practice or review alongside.
 *
 *   per minute  120  ≈ 2× that worst burst
 *   per hour    900  ≈ 3× the heaviest hour anyone could actually study
 *
 * Against the old effective ceiling of 900 a minute that is 7.5× tighter by the
 * minute and 60× tighter by the hour. It is a real limit, not an impossible one.
 *
 * The index keeps a request-counted limit. It carries no proprietary text — the
 * same taxonomy labels as data/taxonomy.ts — and it is fetched about three times
 * per full page load, so it is sized for page loads and several tabs.
 */
/*
 * Generous, because the index is fetched once per full page load and again on
 * every auth event, and because it is 400 bytes of taxonomy rather than anything
 * worth rationing. Measured against a real session — six navigations produced a
 * dozen calls — a tight ceiling here would 429 a student for browsing.
 */
const INDEX_PER_MINUTE = 60;
const BODY_QUESTIONS_PER_MINUTE = 120;
const BODY_QUESTIONS_PER_HOUR = 900;
const ADMIN_PER_MINUTE = 30;



function tooMany(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many requests in a row. Give it a moment." },
    { status: 429, headers: { "retry-after": String(retryAfter) } },
  );
}

export async function GET(request: Request) {
  if (!supabaseConfigured()) return notConfigured();
  const found = await caller(request);
  if (!found) return unauthorized();

  const url = new URL(request.url);
  const view = url.searchParams.get("view");
  const rawIds = url.searchParams.get("ids");

  /* ---- content for the questions on screen ---- */
  if (rawIds !== null) {
    const ids = [...new Set(rawIds.split(",").map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0) return NextResponse.json({ questions: [] });
    if (ids.length > MAX_IDS_PER_REQUEST) {
      return NextResponse.json(
        { error: `At most ${MAX_IDS_PER_REQUEST} questions per request.` },
        { status: 400 },
      );
    }

    /*
     * Both windows, charged by question. The minute is checked first so that a
     * caller who has spent the hour still gets the shorter Retry-After when the
     * minute is also gone. Two counter round trips on a request that is already
     * making an RPC is an acceptable price for the ceiling that actually bounds
     * extraction.
     */
    const perMinute = await consumeRate(
      found.client,
      "questions:bodies",
      found.user.id,
      BODY_QUESTIONS_PER_MINUTE,
      60,
      ids.length,
    );
    if (!perMinute.ok) return tooMany(perMinute.retryAfter);

    const perHour = await consumeRate(
      found.client,
      "questions:bodies:hour",
      found.user.id,
      BODY_QUESTIONS_PER_HOUR,
      3_600,
      ids.length,
    );
    if (!perHour.ok) return tooMany(perHour.retryAfter);

    const result = await readBodies(found.client, ids);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ questions: result.questions });
  }

  /* ---- whole rows, for the editor ---- */
  if (view === "full") {
    const verdict = await consumeRate(
      found.client,
      "questions:admin",
      found.user.id,
      ADMIN_PER_MINUTE,
      60,
    );
    if (!verdict.ok) return tooMany(verdict.retryAfter);

    const result = await readAdminBank(found.client);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ questions: result.questions });
  }

  /* ---- the taxonomy index, which is the default on purpose ---- */
  const verdict = await consumeRate(
    found.client,
    "questions:index",
    found.user.id,
    INDEX_PER_MINUTE,
    60,
  );
  if (!verdict.ok) return tooMany(verdict.retryAfter);

  const result = await readIndex(found.client);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ questions: result.entries });
}

/** Create or update. Editing a question the author already saved is the norm. */
export async function POST(request: Request) {
  if (!supabaseConfigured()) return notConfigured();
  const found = await caller(request);
  if (!found) return unauthorized();

  let body: { questions?: unknown };
  try {
    body = (await request.json()) as { questions?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body.questions) || body.questions.length === 0) {
    return NextResponse.json({ error: "No questions to save." }, { status: 400 });
  }
  if (body.questions.length > MAX_BATCH) {
    return NextResponse.json({ error: `At most ${MAX_BATCH} at a time.` }, { status: 413 });
  }

  const questions = body.questions as Question[];
  for (const question of questions) {
    const problem = invalid(question);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  }

  /*
   * Only real ids are looked up, and a blank one is never treated as an
   * existing row.
   *
   * This mattered more than it looks. The editor sends "" for a new question,
   * and the lookup used to include it — so the moment a row with an empty id
   * existed in the table, every subsequent save matched it, was classified as
   * an edit, kept the empty id, and the upsert overwrote that same row. The bank
   * could therefore only ever hold one admin-written question, and each new one
   * silently replaced the last.
   */
  const lookupIds = questions
    .map((q) => String(q.id ?? "").trim())
    .filter((id) => id.length > 0);

  /*
   * Which of these ids already exist — and that is all this needs to know.
   *
   * It used to read `created_by` too, to carry authorship through the upsert.
   * Edits are a plain UPDATE now and simply do not write that column, so the
   * question collapses to "is this a row or not", answerable with `id` alone —
   * which is in the column grant, so no privileged doorway is involved.
   */
  const { data: existing, error: existingError } = lookupIds.length
    ? await found.client.from("custom_questions").select("id").in("id", lookupIds)
    : { data: [] as { id: string }[], error: null };

  if (existingError) {
    if (process.env.NODE_ENV !== "production") console.error("[questions:lookup]", existingError);
    return NextResponse.json({ error: "Could not check the question numbers." }, { status: 502 });
  }

  const known = new Set((existing ?? []).map((row) => (row as { id: string }).id));
  /** A question is an edit only if its id names a row that is actually there. */
  const isEdit = (q: Question) => {
    const id = String(q.id ?? "").trim();
    return id.length > 0 && known.has(id);
  };

  /*
   * Give every genuinely new question its section number.
   *
   * "New" means the id is not already a row: the editor sends a blank id, and
   * anything that does not resolve to an existing question is treated the same
   * way rather than trusted. An id that IS a row is left exactly as it is, so
   * editing a question never renumbers it — the number is how an author refers
   * to it, and it has to stay put.
   */
  const subjectsNeeding = [
    ...new Set(
      questions.filter((q) => !isEdit(q)).map((q) => String(q.subjectId)),
    ),
  ];

  const nextNumber = new Map<string, number>();
  for (const subjectId of subjectsNeeding) {
    const { data: taken } = await found.client
      .from("custom_questions")
      .select("id")
      .eq("subject_id", subjectId);
    nextNumber.set(
      subjectId,
      highestUsed(subjectId, (taken ?? []).map((r) => r.id as string)) + 1,
    );
  }

  const assigned: { from: string; to: string }[] = [];
  const numbered = questions.map((q) => {
    if (isEdit(q)) return q;
    const subjectId = String(q.subjectId);
    // Deliberately not `?? 1`. Falling back to the first number hands out an id
    // that already exists, and the upsert then overwrites the question holding
    // it. Every new question's subject was counted in the pass above, so this is
    // unreachable — and if it ever is reached, failing is the safe outcome.
    const n = nextNumber.get(subjectId);
    if (n === undefined) return null;
    nextNumber.set(subjectId, n + 1);
    const id = formatId(subjectId, n);
    assigned.push({ from: String(q.id ?? ""), to: id });
    return { ...q, id };
  });

  if (numbered.some((q) => q === null)) {
    return NextResponse.json(
      { error: "Could not assign a question number. Nothing was saved." },
      { status: 500 },
    );
  }

  const settled = numbered as Question[];

  /*
   * New questions are inserted; only edits are upserted.
   *
   * This is the guard that matters, because it is the difference between a bug
   * and lost work. A single upsert over both cases means any id collision —
   * a stale client, two admins saving at the same second, a leftover row — is
   * resolved by overwriting whatever was already there, silently. That is how
   * one admin's verbal question replaced another admin's maths question.
   *
   * An insert cannot overwrite. If the id is somehow taken, Postgres raises
   * 23505 and nothing is written, which is recoverable; a lost question is not.
   */
  const edits = settled.filter((q) => isEdit(q));
  const fresh = settled.filter((q) => !isEdit(q));

  if (fresh.length > 0) {
    const { error } = await found.client
      .from("custom_questions")
      .insert(fresh.map((q) => toRow(q, found.user.id)));

    if (error) {
      if (process.env.NODE_ENV !== "production") console.error("[questions:new]", error);
      return NextResponse.json(writeFailure(error), { status: statusFor(error) });
    }
  }

  /*
   * Edits are an UPDATE, one row at a time, and not an upsert.
   *
   * Two reasons, one of them fatal. The fatal one: `insert ... on conflict do
   * update` requires table-level SELECT, which column-level grants cannot
   * satisfy — Postgres refuses it with 42501 and a hint reading "GRANT SELECT ON
   * public.custom_questions TO authenticated", which is exactly the grant this
   * whole boundary exists to withhold. A plain UPDATE filtered on `id` needs only
   * SELECT on `id`, which every signed-in caller has. Verified against dev: the
   * upsert 42501s, the update does not.
   *
   * The good reason: `created_by` is simply left out of the SET list, so
   * authorship is preserved by never being written rather than by being read back
   * and sent again. That removed the only thing the save path wanted `created_by`
   * for, and with it a round trip and a privileged function.
   *
   * One statement per question rather than one for the batch. An edit batch is
   * almost always a single question — the editor saves one at a time — and the
   * alternative is the upsert that does not work.
   */
  for (const question of edits) {
    const { error } = await found.client
      .from("custom_questions")
      .update(toUpdate(question))
      .eq("id", String(question.id));

    if (error) {
      if (process.env.NODE_ENV !== "production") console.error("[questions:edit]", error);
      return NextResponse.json(writeFailure(error), { status: statusFor(error) });
    }
  }

  return NextResponse.json({ ok: true, saved: settled.length, assigned });
}

export async function DELETE(request: Request) {
  if (!supabaseConfigured()) return notConfigured();
  const found = await caller(request);
  if (!found) return unauthorized();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Which question?" }, { status: 400 });

  const { error } = await found.client.from("custom_questions").delete().eq("id", id);
  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[questions]", error);
    return NextResponse.json(
      { error: "Could not delete. Content editing is for admins." },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true });
}
