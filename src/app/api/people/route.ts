import { NextResponse } from "next/server";
import { supabaseConfigured, tokenFrom, userClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Who has which role, and the owner's ability to change it.
 *
 * The route decides nothing about authorisation. Listing relies on the read
 * policy — an admin or owner sees every profile, a student sees only their own,
 * so a student calling this gets a list of one rather than an error. Changing a
 * role goes through the set_role() function in schema.sql, which is the single
 * doorway to a column no signed-in user can otherwise write.
 *
 * That matters: the guards live in the database, not here. Someone bypassing
 * this handler and calling PostgREST directly hits exactly the same rules.
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

export async function GET(request: Request) {
  if (!supabaseConfigured()) return notConfigured();
  const found = await caller(request);
  if (!found) return unauthorized();

  const { data, error } = await found.client
    .from("profiles")
    .select("id, name, email, role, created_at")
    .order("role", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[people]", error);
    return NextResponse.json({ error: "Could not load." }, { status: 502 });
  }

  return NextResponse.json({
    people: (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role as "student" | "admin" | "owner",
      createdAt: new Date(p.created_at).getTime(),
    })),
    // So the UI can show the controls without a second request, and never offer
    // the caller a control that would fail.
    isOwner: (data ?? []).some((p) => p.id === found.user.id && p.role === "owner"),
    selfId: found.user.id,
  });
}

export async function POST(request: Request) {
  if (!supabaseConfigured()) return notConfigured();
  const found = await caller(request);
  if (!found) return unauthorized();

  let body: { id?: unknown; role?: unknown };
  try {
    body = (await request.json()) as { id?: unknown; role?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.id !== "string" || (body.role !== "admin" && body.role !== "student")) {
    return NextResponse.json(
      { error: "Send an id and a role of admin or student." },
      { status: 400 },
    );
  }

  const { error } = await found.client.rpc("set_role", {
    target_id: body.id,
    new_role: body.role,
  });

  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[people]", error);
    // set_role raises with a message written to be read by a person, so it is
    // passed through — unlike a driver error, it names no internal structure.
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
