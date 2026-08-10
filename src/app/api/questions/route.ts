import { NextResponse } from "next/server";
import type { Question } from "@/data/types";
import { SEED_QUESTIONS } from "@/data";
import { supabaseConfigured, tokenFrom, userClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * The shared question bank written in the admin editor.
 *
 * This is what makes an admin role mean anything: before it, a pasted question
 * lived in the author's own browser and no student ever saw it. Now every
 * signed-in student reads the same rows.
 *
 * Authorisation is not decided here. The policies on custom_questions allow any
 * signed-in reader and only an admin (or owner) writer, so a mistake in this
 * handler cannot turn into a student editing the bank.
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
      prompt: question.prompt,
      choices: question.choices,
      explanation: question.explanation,
      // Skill rides in the payload rather than in a column of its own. It is
      // free text the author types, nothing queries it in SQL, and putting it
      // here means the field works without a migration — the same reason the
      // prompt and the choices live in jsonb.
      skill: question.skill ?? null,
    },
    created_by: authorId,
  };
}

type Row = {
  id: string;
  exam: string;
  subject_id: string;
  topic: string;
  domain: string | null;
  difficulty: number;
  answer: number;
  payload: {
    passage?: Question["passage"] | null;
    prompt: Question["prompt"];
    choices: Question["choices"];
    explanation: Question["explanation"];
    skill?: string | null;
  };
  created_at?: string | null;
  /**
   * Embedded author profile. Null for a student caller — the profiles read
   * policy only shows them their own row — and null for an author whose account
   * was deleted, so the UI must cope with an unknown author either way.
   */
  author?: { email: string | null } | { email: string | null }[] | null;
};

/** The embed is a to-one join, but PostgREST's typing widens it to an array. */
function authorEmail(author: Row["author"]): string | undefined {
  const one = Array.isArray(author) ? author[0] : author;
  return one?.email ?? undefined;
}

function toQuestion(row: Row): Question {
  return {
    id: row.id,
    exam: row.exam as Question["exam"],
    subjectId: row.subject_id,
    topic: row.topic,
    domain: row.domain ?? undefined,
    difficulty: row.difficulty as Question["difficulty"],
    passage: row.payload?.passage ?? undefined,
    prompt: row.payload?.prompt,
    choices: row.payload?.choices ?? [],
    answer: row.answer,
    explanation: row.payload?.explanation,
    skill: row.payload?.skill ?? undefined,
    custom: true,
    authorEmail: authorEmail(row.author),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : undefined,
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
  if (
    !Number.isInteger(question.answer) ||
    question.answer < 0 ||
    question.answer >= question.choices.length
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

export async function GET(request: Request) {
  if (!supabaseConfigured()) return notConfigured();
  const found = await caller(request);
  if (!found) return unauthorized();

  const { data, error } = await found.client
    .from("custom_questions")
    .select(
      "id, exam, subject_id, topic, domain, difficulty, answer, payload, created_at, author:profiles(email)",
    )
    .order("created_at", { ascending: true });

  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[questions]", error);
    return NextResponse.json({ error: "Could not load." }, { status: 502 });
  }

  return NextResponse.json({ questions: (data ?? []).map((r) => toQuestion(r as Row)) });
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

  // An edit must not rewrite authorship: the upsert sends every column, so
  // without this the last admin to touch a question would appear to have
  // written it. Rows that do not exist yet fall back to the caller.
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

  const { data: existing } = lookupIds.length
    ? await found.client
        .from("custom_questions")
        .select("id, created_by")
        .in("id", lookupIds)
    : { data: [] as { id: string; created_by: string | null }[] };

  const originalAuthor = new Map(
    (existing ?? []).map((row) => [row.id as string, row.created_by as string | null]),
  );
  const known = new Set(originalAuthor.keys());
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

  if (edits.length > 0) {
    const { error } = await found.client
      .from("custom_questions")
      .upsert(
        edits.map((q) => toRow(q, originalAuthor.get(String(q.id)) ?? found.user.id)),
        { onConflict: "id" },
      );

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
