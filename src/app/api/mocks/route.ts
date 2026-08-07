import { NextResponse } from "next/server";
import type { MockResult } from "@/lib/storage";
import { supabaseConfigured, tokenFrom, userClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Completed mock exams.
 *
 * Unlike attempts, a mock carries its own id, and the table uses it as the
 * primary key. The write is therefore idempotent: a retry after a dropped
 * connection re-sends the same row and is ignored, rather than creating a
 * duplicate exam in the student's history.
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

const MAX_BATCH = 50;

function row(mock: MockResult, accountId: string) {
  return {
    id: String(mock.id),
    account_id: accountId,
    exam: String(mock.exam),
    score: Math.round(Number(mock.score) || 0),
    correct: Math.round(Number(mock.correct) || 0),
    total: Math.round(Number(mock.total) || 0),
    sections: mock.sections ?? [],
    wrong: mock.wrong ?? [],
    at: new Date(mock.at ?? Date.now()).toISOString(),
  };
}

export async function POST(request: Request) {
  if (!supabaseConfigured()) return notConfigured();

  const token = tokenFrom(request);
  if (!token) return unauthorized();
  const client = userClient(token);
  if (!client) return notConfigured();

  // The owner comes from the token, never from the body.
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) return unauthorized();

  let body: { mocks?: unknown };
  try {
    body = (await request.json()) as { mocks?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body.mocks) || body.mocks.length === 0) {
    return NextResponse.json({ error: "No mocks to record." }, { status: 400 });
  }
  if (body.mocks.length > MAX_BATCH) {
    return NextResponse.json({ error: `At most ${MAX_BATCH} at a time.` }, { status: 413 });
  }

  const rows = (body.mocks as MockResult[]).map((mock) => row(mock, auth.user.id));
  if (rows.some((r) => !r.id || !r.exam)) {
    return NextResponse.json({ error: "Malformed mock." }, { status: 400 });
  }

  // ignoreDuplicates makes this ON CONFLICT DO NOTHING, which is a pure insert.
  // A plain upsert would take the UPDATE path on a repeat, and the mocks table
  // has an insert policy but deliberately no update policy — RLS refuses it. A
  // finished exam is immutable anyway, so re-sending one should do nothing
  // rather than overwrite it.
  const { error } = await client
    .from("mocks")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[mocks]", error);
    return NextResponse.json({ error: "Could not save." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, saved: rows.length });
}

export async function GET(request: Request) {
  if (!supabaseConfigured()) return notConfigured();

  const token = tokenFrom(request);
  if (!token) return unauthorized();
  const client = userClient(token);
  if (!client) return notConfigured();

  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) return unauthorized();

  // Scoped to the caller, explicitly — same reasoning as /api/attempts. The read
  // policy permits an admin to see every row, which is why an admin's own score
  // history was filling up with mock tests other people had sat.
  const { data, error } = await client
    .from("mocks")
    .select("id, exam, score, correct, total, sections, wrong, at")
    .eq("account_id", auth.user.id)
    .order("at", { ascending: false })
    .limit(500);

  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[mocks]", error);
    return NextResponse.json({ error: "Could not load." }, { status: 502 });
  }

  const mocks = (data ?? []).map((r) => ({
    id: r.id,
    exam: r.exam,
    score: r.score,
    correct: r.correct,
    total: r.total,
    sections: r.sections ?? [],
    wrong: r.wrong ?? [],
    at: new Date(r.at).getTime(),
  }));

  return NextResponse.json({ mocks });
}
