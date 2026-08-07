import { NextResponse } from "next/server";
import { supabaseConfigured, tokenFrom, userClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * The signed-in student's profile: name, grade, target score, and whether they
 * are an admin.
 *
 * `role` is returned but never accepted. The client may ask to change its own
 * target score; it may not promote itself, and the policy in schema.sql would
 * refuse anyway — this handler simply never gives it the chance.
 */

function notConfigured() {
  return NextResponse.json(
    { error: "Supabase is not configured. See DATABASE.md." },
    { status: 503 },
  );
}

async function caller(request: Request) {
  const token = tokenFrom(request);
  if (!token) return { error: "unauthorized" as const };
  const client = userClient(token);
  if (!client) return { error: "unconfigured" as const };
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return { error: "unauthorized" as const };
  return { client, user: data.user };
}

export async function GET(request: Request) {
  if (!supabaseConfigured()) return notConfigured();

  const found = await caller(request);
  if ("error" in found) {
    if (found.error === "unconfigured") return notConfigured();
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const { data, error } = await found.client
    .from("profiles")
    .select("id, name, email, grade, role, target_score")
    .eq("id", found.user.id)
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[profile]", error);
    return NextResponse.json({ error: "Could not load the profile." }, { status: 502 });
  }
  // The signup trigger normally gets here first; a null row means it did not.
  if (!data) return NextResponse.json({ error: "No profile row." }, { status: 404 });

  return NextResponse.json({
    profile: {
      id: data.id,
      name: data.name,
      email: data.email,
      grade: data.grade,
      role: data.role,
      targetScore: data.target_score,
      isAdmin: data.role === "admin",
    },
  });
}

export async function PATCH(request: Request) {
  if (!supabaseConfigured()) return notConfigured();

  const found = await caller(request);
  if ("error" in found) {
    if (found.error === "unconfigured") return notConfigured();
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  let body: { name?: unknown; grade?: unknown; targetScore?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // An allow-list, not a spread of the body: `role` must not be settable here,
  // and neither must `id`.
  const patch: Record<string, string | number> = {};
  if (typeof body.name === "string") patch.name = body.name.trim().slice(0, 80);
  if (typeof body.grade === "string") patch.grade = body.grade.trim().slice(0, 40);
  if (typeof body.targetScore === "number" && Number.isFinite(body.targetScore)) {
    patch.target_score = Math.min(1600, Math.max(400, Math.round(body.targetScore)));
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { error } = await found.client.from("profiles").update(patch).eq("id", found.user.id);
  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[profile]", error);
    return NextResponse.json({ error: "Could not save." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
