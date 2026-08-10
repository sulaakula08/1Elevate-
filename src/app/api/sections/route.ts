import { NextResponse } from "next/server";
import { supabaseConfigured, tokenFrom, userClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Which parts of the product are closed for maintenance.
 *
 * A missing row means open. That is the important half of the design: a section
 * nobody has ever closed needs no row, and a section added to the app later is
 * open by default rather than invisible until someone remembers to seed it.
 *
 * Only the owner may write, enforced by the policy rather than here. Closing the
 * product for every student is a different kind of decision from writing a
 * question, so it is deliberately not something an admin can do.
 */

/** The sections that can be closed. Anything else is rejected. */
export const SECTION_KEYS = [
  "community",
  "practice",
  "mock",
  "review",
  "progress",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

const MAX_MESSAGE = 300;

function notConfigured() {
  return NextResponse.json(
    { error: "Supabase is not configured. See DATABASE.md." },
    { status: 503 },
  );
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
  if (!supabaseConfigured()) return NextResponse.json({ sections: {} });

  const found = await caller(request);
  // Not an error: a signed-out visitor sees the marketing pages, which are never
  // closed, so an empty answer is the correct one rather than a 401.
  if (!found) return NextResponse.json({ sections: {} });

  const { data, error } = await found.client
    .from("service_sections")
    .select("key, closed, message");

  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[sections]", error);
    // Fail open. A section that cannot be read is far better shown than hidden:
    // the alternative is that a database hiccup takes the whole product down.
    return NextResponse.json({ sections: {} });
  }

  const sections: Record<string, { closed: boolean; message: string | null }> = {};
  for (const row of data ?? []) {
    sections[row.key as string] = {
      closed: Boolean(row.closed),
      message: (row.message as string | null) ?? null,
    };
  }

  return NextResponse.json({ sections });
}

export async function POST(request: Request) {
  if (!supabaseConfigured()) return notConfigured();

  const found = await caller(request);
  if (!found) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body: { key?: unknown; closed?: unknown; message?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const key = String(body.key ?? "");
  if (!SECTION_KEYS.includes(key as SectionKey)) {
    return NextResponse.json({ error: "Unknown section." }, { status: 400 });
  }

  const closed = Boolean(body.closed);
  const message =
    typeof body.message === "string" && body.message.trim()
      ? body.message.trim().slice(0, MAX_MESSAGE)
      : null;

  const { error } = await found.client.from("service_sections").upsert(
    {
      key,
      closed,
      message,
      updated_by: found.user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[sections]", error);
    // 403 rather than 502: the overwhelming likelihood is a non-owner calling
    // this and the write policy refusing them.
    return NextResponse.json(
      { error: "Only the owner can open and close sections." },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true, key, closed });
}
