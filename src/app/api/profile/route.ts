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

/**
 * True only for a public URL in this project's own Supabase storage.
 *
 * Parsed rather than pattern-matched: `startsWith` on the project origin is
 * defeated by `https://our-project.supabase.co.evil.example/…`, which is a
 * prefix match and a different host. URL() gives the real hostname to compare.
 */
function isOwnStorageUrl(value: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return false;
  try {
    const url = new URL(value);
    const origin = new URL(base);
    return (
      url.protocol === "https:" &&
      url.hostname === origin.hostname &&
      url.pathname.startsWith("/storage/v1/object/public/avatars/")
    );
  } catch {
    return false;
  }
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

  /*
   * The whole row, not a column list.
   *
   * `avatar_url` arrived in a later migration, and naming it explicitly would
   * make this route 400 on any project that has not applied it yet — taking
   * profile loading, and therefore the entire signed-in app, down over a
   * picture. Selecting the row and reading the field if it is there means the
   * feature is simply inert until the migration runs.
   */
  const { data, error } = await found.client
    .from("profiles")
    .select("*")
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
      // Empty on a database that has not run the avatars migration.
      avatarUrl: data.avatar_url ?? "",
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

  let body: {
    name?: unknown;
    grade?: unknown;
    targetScore?: unknown;
    avatarUrl?: unknown;
  };
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
  /*
   * A URL we issued, or nothing.
   *
   * The client uploads to the avatars bucket and sends back the public URL, so
   * this field is attacker-controlled text that ends up in an <img src> on other
   * people's screens. Restricting it to https and to the project's own storage
   * host is what stops it becoming a way to point every viewer's browser at an
   * arbitrary server — a tracking pixel with a face on it. Empty clears it.
   */
  if (typeof body.avatarUrl === "string") {
    const value = body.avatarUrl.trim();
    if (value === "") {
      patch.avatar_url = "";
    } else if (isOwnStorageUrl(value)) {
      patch.avatar_url = value.slice(0, 500);
    } else {
      return NextResponse.json({ error: "That is not an uploaded image." }, { status: 400 });
    }
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { error } = await found.client.from("profiles").update(patch).eq("id", found.user.id);
  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[profile]", error);
    // The one failure the operator can act on, and the likely one on a project
    // that has not applied the avatars migration.
    if ("avatar_url" in patch && /avatar_url/i.test(error.message)) {
      return NextResponse.json(
        { error: "Profile pictures need the avatars migration — run supabase/schema.sql." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Could not save." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Closes the caller's own account, permanently.
 *
 * The work is done by `delete_own_account`, a SECURITY DEFINER function, for
 * the reason set out in its migration: removing a row from auth.users would
 * otherwise mean giving this application a service-role key, and nothing in it
 * can bypass row-level security today.
 *
 * The typed name is passed straight through rather than compared here. The
 * function checks it, which is the check that counts — this route is not the
 * only way in, and a confirmation performed only by the caller is not a
 * confirmation at all.
 */
export async function DELETE(request: Request) {
  if (!supabaseConfigured()) return notConfigured();

  const found = await caller(request);
  if ("error" in found) {
    if (found.error === "unconfigured") return notConfigured();
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  let body: { confirmName?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.confirmName !== "string" || !body.confirmName.trim()) {
    return NextResponse.json({ error: "Type your name to confirm." }, { status: 400 });
  }

  const { error } = await found.client.rpc("delete_own_account", {
    confirm_name: body.confirmName,
  });

  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[profile:delete]", error);

    // These three are the caller's to fix, so they are worth saying plainly.
    // Anything else is ours and stays in the log.
    if (/does not match/i.test(error.message)) {
      return NextResponse.json({ error: "That name does not match." }, { status: 400 });
    }
    if (/owner cannot delete/i.test(error.message)) {
      return NextResponse.json(
        { error: "An owner cannot delete their own account." },
        { status: 403 },
      );
    }
    if (/delete_own_account/i.test(error.message)) {
      return NextResponse.json(
        { error: "Account deletion needs its migration — see supabase/migrations." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Could not delete the account." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
