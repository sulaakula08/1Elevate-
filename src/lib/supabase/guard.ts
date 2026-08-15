import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { supabaseConfigured, tokenFrom, userClient } from "./server";

/**
 * The gate every route handler stands behind.
 *
 * It existed as a copied block in each route, which is how two of them came to
 * be missing it entirely: `/api/explain` and `/api/generate` reached body
 * validation with no caller at all, so anyone on the internet could spend the
 * project's Anthropic budget. A shared helper does not prevent someone
 * forgetting to call it, but it makes the omission visible in a diff — a route
 * that never imports this is now conspicuous.
 *
 * Note what it does NOT do: it does not decide what a caller may read or write.
 * That is row-level security's job, and every query still runs as the student
 * through `userClient`. This only answers "is there a caller at all", and for
 * `requireAdmin`, "is that caller staff".
 */

export type Caller = { client: SupabaseClient; user: User };

/** A guard either produces the caller, or the response to send instead. */
export type Guarded = { ok: true; caller: Caller } | { ok: false; response: NextResponse };

function fail(message: string, status: number): { ok: false; response: NextResponse } {
  return { ok: false, response: NextResponse.json({ error: message }, { status }) };
}

/** Any signed-in account. */
export async function requireUser(request: Request): Promise<Guarded> {
  if (!supabaseConfigured()) {
    return fail("Supabase is not configured. See DATABASE.md.", 503);
  }

  const token = tokenFrom(request);
  if (!token) return fail("Sign in first.", 401);

  const client = userClient(token);
  if (!client) return fail("Supabase is not configured. See DATABASE.md.", 503);

  // Supabase decides who the token belongs to. An id taken from the request
  // body would be a request to act as anyone.
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return fail("Sign in first.", 401);

  return { ok: true, caller: { client, user: data.user } };
}

/** An admin or an owner. */
export async function requireAdmin(request: Request): Promise<Guarded> {
  const guarded = await requireUser(request);
  if (!guarded.ok) return guarded;

  const { data } = await guarded.caller.client
    .from("profiles")
    .select("role")
    .eq("id", guarded.caller.user.id)
    .maybeSingle();

  const role = (data as { role?: string } | null)?.role;
  if (role !== "admin" && role !== "owner") return fail("Admins only.", 403);

  return guarded;
}
