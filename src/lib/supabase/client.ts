"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The browser's Supabase client — sign in, sign out, and the access token the
 * API routes need.
 *
 * Only the anon key is used here, and that key is public by design: it grants
 * nothing on its own, because every table's row-level policy still applies to
 * whoever the token says you are. The service key never appears in this file.
 *
 * Reading data still goes through the app's own API routes rather than
 * straight from the browser. That is one place to get authorisation right
 * instead of one per query, and it keeps the door shut if a policy is ever
 * mis-written.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Both the current name (publishable) and the older one (anon). Next.js inlines
// process.env.NEXT_PUBLIC_* at build time, so each has to be written out in
// full — a computed lookup would not be replaced and would arrive undefined.
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null = null;

/** Null until the environment is configured — the app runs locally without it. */
export function supabase(): SupabaseClient | null {
  if (!URL || !ANON_KEY) return null;
  if (!cached) {
    cached = createClient(URL, ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return cached;
}

export function supabaseReady(): boolean {
  return Boolean(URL && ANON_KEY);
}

/** The current access token, or null when nobody is signed in. */
export async function accessToken(): Promise<string | null> {
  const client = supabase();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}

/** fetch() with the signed-in student's token attached. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await accessToken();
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);
  return fetch(path, { ...init, headers });
}
