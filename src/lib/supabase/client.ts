"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

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
 *
 * The session lives in a cookie rather than in localStorage, which is what
 * `createBrowserClient` changes over the plain `createClient`. localStorage is
 * only ever written by script, and Safari deletes script-written storage after
 * seven days without a visit — a student who prepares on an iPhone and takes a
 * week off was signed out every time, with no way for the app to tell that from
 * a real sign-out. A cookie the server re-issues on each visit (see proxy.ts)
 * is not capped that way, and it is also the only form the server can read, so
 * a request arrives already knowing who is making it.
 *
 * The cookie is deliberately not httpOnly: this client has to read the session
 * back out to refresh it. It holds the same token localStorage held, so nothing
 * has been given away that a script could not already reach.
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
    cached = createBrowserClient(URL, ANON_KEY);
  }
  return cached;
}

export function supabaseReady(): boolean {
  return Boolean(URL && ANON_KEY);
}

/**
 * Carries a session written by the old localStorage client into the cookie.
 *
 * Without this, moving the session to cookies signs out every single person the
 * moment the change ships: their tokens are sitting in localStorage, which the
 * new client no longer looks at, so a perfectly good session reads as absent.
 * Handing those tokens to `setSession` re-establishes it in the cookie, and the
 * student never learns anything happened.
 *
 * Deleting the old key is part of the job. Leaving it would mean a real sign-out
 * is undone by the next reload, which finds the stale tokens and signs them back
 * in — the opposite complaint, and a worse one.
 *
 * Returns true when a session was carried over, so the caller knows to expect an
 * auth event rather than treating the first look as final.
 */
export async function adoptLegacySession(): Promise<boolean> {
  const client = supabase();
  if (!client || typeof window === "undefined") return false;

  let key: string | null = null;
  try {
    key =
      Object.keys(window.localStorage).find(
        (name) => name.startsWith("sb-") && name.endsWith("-auth-token"),
      ) ?? null;
  } catch {
    return false; // Storage blocked — nothing to carry over.
  }
  if (!key) return false;

  try {
    const raw = window.localStorage.getItem(key);
    window.localStorage.removeItem(key);
    if (!raw) return false;

    // supabase-js switched to prefixing the JSON with "base64-" partway through
    // v2, so a browser could hold either form depending on when it last ran.
    const json = raw.startsWith("base64-")
      ? new TextDecoder().decode(
          Uint8Array.from(atob(raw.slice(7).replace(/-/g, "+").replace(/_/g, "/")), (c) =>
            c.charCodeAt(0),
          ),
        )
      : raw;

    const stored = JSON.parse(json) as {
      access_token?: string;
      refresh_token?: string;
    };
    if (!stored.access_token || !stored.refresh_token) return false;

    // The access token is very likely expired by now; the refresh token is what
    // actually matters, and setSession exchanges it.
    const { error } = await client.auth.setSession({
      access_token: stored.access_token,
      refresh_token: stored.refresh_token,
    });
    return !error;
  } catch {
    return false;
  }
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
