import { NextResponse } from "next/server";
import type { Question } from "@/data/types";
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
};

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
  };
}

/** Enough to reject a malformed paste before it reaches the database. */
function invalid(question: Question): string | null {
  if (!question?.id) return "Every question needs an id.";
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

export async function GET(request: Request) {
  if (!supabaseConfigured()) return notConfigured();
  const found = await caller(request);
  if (!found) return unauthorized();

  const { data, error } = await found.client
    .from("custom_questions")
    .select("id, exam, subject_id, topic, domain, difficulty, answer, payload")
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

  const rows = questions.map((q) => toRow(q, found.user.id));
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

  return NextResponse.json({ ok: true, saved: rows.length });
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
