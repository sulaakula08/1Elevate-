import { NextResponse } from "next/server";
import type { Attempt } from "@/lib/storage";
import { supabaseConfigured, tokenFrom, userClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * The attempt log: the first table to move off localStorage.
 *
 * It is deliberately the first, because it is append-only. Nothing here can
 * overwrite or lose an earlier row, so a half-finished migration degrades to
 * "some history is missing" rather than to corrupted progress.
 *
 * Every query runs as the signed-in student (see userClient), so the row-level
 * policies decide what is readable and writable — this handler never has to be
 * the thing that gets authorisation right.
 */

/** 503, not 500: the app is fine, the database simply is not connected yet. */
function notConfigured() {
  return NextResponse.json(
    { error: "Supabase is not configured. See DATABASE.md." },
    { status: 503 },
  );
}

function unauthorized() {
  return NextResponse.json({ error: "Sign in first." }, { status: 401 });
}

/** Only the fields the table has, and only from the shape the app records. */
type Incoming = Pick<
  Attempt,
  | "questionId"
  | "subjectId"
  | "exam"
  | "topic"
  | "difficulty"
  | "chosen"
  | "correct"
  | "mode"
  | "ms"
  | "at"
>;

const MODES = new Set(["practice", "mock", "review"]);
const MAX_BATCH = 100;

function row(attempt: Incoming, accountId: string) {
  return {
    account_id: accountId,
    question_id: String(attempt.questionId),
    subject_id: String(attempt.subjectId),
    exam: String(attempt.exam),
    topic: String(attempt.topic),
    difficulty: attempt.difficulty ?? null,
    chosen: Number(attempt.chosen),
    correct: Boolean(attempt.correct),
    mode: attempt.mode,
    ms: Number.isFinite(attempt.ms) ? Math.max(0, Math.round(attempt.ms)) : 0,
    at: new Date(attempt.at ?? Date.now()).toISOString(),
  };
}

export async function POST(request: Request) {
  if (!supabaseConfigured()) return notConfigured();

  const token = tokenFrom(request);
  if (!token) return unauthorized();

  const client = userClient(token);
  if (!client) return notConfigured();

  // Who the token belongs to is decided by Supabase, never by the request body:
  // an account id sent by the client would be a request to write as anyone.
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) return unauthorized();

  let body: { attempts?: unknown };
  try {
    body = (await request.json()) as { attempts?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body.attempts) || body.attempts.length === 0) {
    return NextResponse.json({ error: "No attempts to record." }, { status: 400 });
  }
  if (body.attempts.length > MAX_BATCH) {
    return NextResponse.json({ error: `At most ${MAX_BATCH} at a time.` }, { status: 413 });
  }

  const rows = (body.attempts as Incoming[]).map((attempt) => row(attempt, auth.user.id));
  const bad = rows.find(
    (r) => !r.question_id || !MODES.has(r.mode) || !Number.isInteger(r.chosen),
  );
  if (bad) return NextResponse.json({ error: "Malformed attempt." }, { status: 400 });

  /*
   * Idempotent insert.
   *
   * An attempt has no client-side id, so the natural key is the one the sync
   * layer dedupes on: who, which question, when, in which mode. With the unique
   * index in place (see supabase/schema.sql) ON CONFLICT DO NOTHING makes a
   * retry after a dropped connection a no-op instead of a duplicate row.
   *
   * The fallback exists because the index has to be applied by hand to an
   * already-deployed database. Postgres raises 42P10 when no constraint matches
   * the conflict target; until the migration is run, a plain insert is still
   * correct — the client dedupes on read — so the route degrades rather than
   * failing outright.
   */
  const conflictTarget = "account_id,question_id,at,mode";
  let { error } = await client
    .from("attempts")
    .upsert(rows, { onConflict: conflictTarget, ignoreDuplicates: true });

  if (error?.code === "42P10") {
    ({ error } = await client.from("attempts").insert(rows));
  }

  if (error) {
    // The driver message can name columns and constraints, so it stays server-side.
    if (process.env.NODE_ENV !== "production") console.error("[attempts]", error);
    return NextResponse.json({ error: "Could not save." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, saved: rows.length });
}

/** The signed-in student's own history. Admins get the same shape for anyone. */
export async function GET(request: Request) {
  if (!supabaseConfigured()) return notConfigured();

  const token = tokenFrom(request);
  if (!token) return unauthorized();

  const client = userClient(token);
  if (!client) return notConfigured();

  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) return unauthorized();

  // No account filter: the policy already narrows this to rows the caller may
  // see — their own, or everyone's if they are an admin.
  const { data, error } = await client
    .from("attempts")
    .select("question_id, subject_id, exam, topic, difficulty, chosen, correct, mode, ms, at")
    .order("at", { ascending: false })
    .limit(5000);

  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[attempts]", error);
    return NextResponse.json({ error: "Could not load." }, { status: 502 });
  }

  const attempts = (data ?? []).map((r) => ({
    questionId: r.question_id,
    subjectId: r.subject_id,
    exam: r.exam,
    topic: r.topic,
    difficulty: r.difficulty ?? undefined,
    chosen: r.chosen,
    correct: r.correct,
    mode: r.mode,
    ms: r.ms,
    at: new Date(r.at).getTime(),
  }));

  return NextResponse.json({ attempts });
}
