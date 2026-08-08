import { NextResponse } from "next/server";
import { supabaseConfigured, tokenFrom, userClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Wipes every account's practice history.
 *
 * The route decides nothing: it calls reset_statistics(), which refuses anyone
 * who is not the owner. Putting the check in the database rather than here means
 * a mistake in this handler cannot turn into an admin — or a student with a
 * crafted request — clearing the school's progress.
 *
 * Accounts are untouched by design. Signups are the one figure that has to
 * survive, being the only record of who ever joined.
 */
export async function POST(request: Request) {
  if (!supabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured. See DATABASE.md." },
      { status: 503 },
    );
  }

  const token = tokenFrom(request);
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const client = userClient(token);
  if (!client) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const { data, error } = await client.rpc("reset_statistics");

  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[reset]", error);
    // 42501 is the function's own refusal; anything else is a real fault, and
    // the driver's message can name internals so it stays server-side.
    const denied = error.code === "42501" || /owner/i.test(error.message ?? "");
    return NextResponse.json(
      { error: denied ? "Only the owner can reset statistics." : "Could not reset." },
      { status: denied ? 403 : 502 },
    );
  }

  const removed = (data ?? {}) as { attempts?: number; mocks?: number };
  return NextResponse.json({
    ok: true,
    attempts: removed.attempts ?? 0,
    mocks: removed.mocks ?? 0,
  });
}
