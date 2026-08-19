import { NextResponse } from "next/server";
import { supabaseConfigured, tokenFrom, userClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Who has joined recently, for an admin's notification list.
 *
 * The stats route already counts signups per day, and a count is the wrong
 * shape for a notification: "3 on Tuesday" cannot be linked to, cannot be
 * marked read one at a time, and does not say who. This returns the rows
 * themselves — a few dozen at most — so each new student is one item that
 * appears once and then settles.
 *
 * Admins read other people's profiles through the admin branch of the read
 * policy, so no service-role access is needed. A student is refused outright
 * rather than being handed the list of one row the policy would allow.
 */

/** Long enough that a fortnight away still shows what was missed. */
const WINDOW_DAYS = 30;
/** A notification panel shows thirty items in total; more would never be read. */
const LIMIT = 40;

export async function GET(request: Request) {
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const token = tokenFrom(request);
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const client = userClient(token);
  if (!client) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const { data: me } = await client
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  const role = (me as { role?: string } | null)?.role;
  if (role !== "admin" && role !== "owner") {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
  const { data, error } = await client
    .from("profiles")
    .select("id, name, email, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[admin/signups]", error);
    return NextResponse.json({ error: "Could not read signups." }, { status: 500 });
  }

  const rows = (data ?? []) as {
    id: string;
    name: string | null;
    email: string | null;
    created_at: string;
  }[];

  return NextResponse.json({
    signups: rows.map((row) => ({
      id: row.id,
      // The email is the fallback name, and the local part of it is enough to
      // recognise someone by. The full address is already on the admin's people
      // list; it does not need to be in a notification too.
      name: row.name?.trim() || (row.email ?? "").split("@")[0] || "Student",
      email: row.email ?? "",
      at: new Date(row.created_at).getTime(),
    })),
  });
}
