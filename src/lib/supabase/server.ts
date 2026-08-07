import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase clients.
 *
 * This module is server-only. Nothing here may be imported from a "use client"
 * file: the service key below bypasses row-level security entirely, and a
 * bundler that follows the import would ship it to the browser.
 *
 * Two clients, because they answer two different questions:
 *
 *   userClient(token) — "what may THIS student see?" Every query runs as them,
 *   so the policies in supabase/schema.sql apply and a bug in a route handler
 *   still cannot leak another student's rows. This is the default.
 *
 *   adminClient() — "do this regardless of who is asking." Bypasses RLS, so it
 *   is only for work that has no student behind it, like a migration.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Supabase renamed its keys: anon → publishable, service_role → secret. Both
// namings are read, newest first, so a project created before or after the
// change works without anyone editing their .env.local.
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

/** False until the environment is configured, so routes can degrade politely. */
export function supabaseConfigured(): boolean {
  return Boolean(URL && ANON_KEY);
}

/**
 * A client acting as the signed-in student, given the access token their
 * browser sent. Returns null when Supabase is not configured yet.
 */
export function userClient(accessToken: string): SupabaseClient | null {
  if (!URL || !ANON_KEY) return null;
  return createClient(URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Bypasses every policy. Reach for this only when there is no user involved. */
export function adminClient(): SupabaseClient | null {
  if (!URL || !SERVICE_KEY) return null;
  return createClient(URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** The bearer token from an incoming request, if it carries one. */
export function tokenFrom(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}
