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

/**
 * Question ids are a running number per section: sat-math-041, sat-rw-018.
 *
 * They are allocated here rather than in the browser because two admins writing
 * at the same moment would otherwise pick the same number, and the save is an
 * upsert — the second one would quietly overwrite the first's question instead
 * of failing. The server holds the only view of what already exists.
 */
const ID_PATTERN = (subjectId: string) => new RegExp(`^${subjectId}-(\d+)$`);

function suffixOf(id: string, subjectId: string): number | null {
  const match = ID_PATTERN(subjectId).exec(id);
  return match ? Number(match[1]) : null;
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
  const { data: existing } = await found.client
    .from("custom_questions")
    .select("id, created_by")
    .in(
      "id",
      questions.map((q) => String(q.id)),
    );
  const originalAuthor = new Map(
    (existing ?? []).map((row) => [row.id as string, row.created_by as string | null]),
  );
  const known = new Set(originalAuthor.keys());

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
      questions.filter((q) => !known.has(String(q.id))).map((q) => String(q.subjectId)),
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
    if (known.has(String(q.id))) return q;
    const subjectId = String(q.subjectId);
    const n = nextNumber.get(subjectId) ?? 1;
    nextNumber.set(subjectId, n + 1);
    const id = formatId(subjectId, n);
    assigned.push({ from: String(q.id), to: id });
    return { ...q, id };
  });

  const rows = numbered.map((q) =>
    toRow(q, originalAuthor.get(String(q.id)) ?? found.user.id),
  );
  const { error } = await found.client
    .from("custom_questions")
    .upsert(rows, { onConflict: "id" });

  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[questions]", error);
    // 403 rather than 502: the overwhelmingly likely cause is a student calling
    // this, and the write policy refusing them.
    return NextResponse.json(
      { error: "Could not save. Content editing is for admins." },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true, saved: rows.length, assigned });
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
