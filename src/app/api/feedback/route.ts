import { NextResponse } from "next/server";
import { supabaseConfigured, tokenFrom, userClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Student feedback in, admin reading out.
 *
 * Authorisation is the database's, as everywhere else: the insert policy pins a
 * row to the caller, and the read policy shows a student their own messages and
 * an admin everyone's. This handler's own contribution is limited to shaping the
 * row and refusing an obviously bad one early.
 */

const CATEGORIES = new Set(["bug", "content", "idea", "other"]);
const MAX_LENGTH = 4000;

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

type Row = {
  id: string;
  message: string;
  category: string;
  handled_at: string | null;
  created_at: string;
  account_id: string;
  /**
   * Embedded author. Null for a student reading their own list — the profiles
   * policy shows them only their own row, and the embed is a left join — and
   * null for an author whose account was deleted.
   */
  author?: { name: string | null; email: string | null } | { name: string | null; email: string | null }[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export async function POST(request: Request) {
  if (!supabaseConfigured()) return notConfigured();
  const found = await caller(request);
  if (!found) return unauthorized();

  let body: { message?: unknown; category?: unknown };
  try {
    body = (await request.json()) as { message?: unknown; category?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "Write something first." }, { status: 400 });
  }
  if (message.length > MAX_LENGTH) {
    return NextResponse.json(
      { error: `That is longer than ${MAX_LENGTH} characters.` },
      { status: 413 },
    );
  }

  const category =
    typeof body.category === "string" && CATEGORIES.has(body.category)
      ? body.category
      : "other";

  const { error } = await found.client.from("feedback").insert({
    account_id: found.user.id,
    message,
    category,
  });

  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[feedback]", error);
    return NextResponse.json({ error: "Could not send that." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

/** Everything the caller may read: their own messages, or all of them for an admin. */
export async function GET(request: Request) {
  if (!supabaseConfigured()) return notConfigured();
  const found = await caller(request);
  if (!found) return unauthorized();

  const { data, error } = await found.client
    .from("feedback")
    .select("id, message, category, handled_at, created_at, account_id, author:profiles(name, email)")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[feedback]", error);
    return NextResponse.json({ error: "Could not load." }, { status: 502 });
  }

  const items = (data ?? []).map((raw) => {
    const row = raw as Row;
    const author = one(row.author);
    return {
      id: row.id,
      message: row.message,
      category: row.category,
      handled: Boolean(row.handled_at),
      at: new Date(row.created_at).getTime(),
      authorName: author?.name || null,
      authorEmail: author?.email || null,
      mine: row.account_id === found.user.id,
    };
  });

  return NextResponse.json({ items });
}

/** Mark one message handled, or put it back. Admin only, per the update policy. */
export async function PATCH(request: Request) {
  if (!supabaseConfigured()) return notConfigured();
  const found = await caller(request);
  if (!found) return unauthorized();

  let body: { id?: unknown; handled?: unknown };
  try {
    body = (await request.json()) as { id?: unknown; handled?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.id !== "string" || !body.id) {
    return NextResponse.json({ error: "Which message?" }, { status: 400 });
  }

  const { error } = await found.client
    .from("feedback")
    .update({ handled_at: body.handled === false ? null : new Date().toISOString() })
    .eq("id", body.id);

  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[feedback]", error);
    // 403 rather than 502: the likely cause is a student calling this and the
    // update policy refusing them.
    return NextResponse.json({ error: "Only an admin can do that." }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
