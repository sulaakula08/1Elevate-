"use client";

import { supabase, supabaseReady } from "./supabase/client";

/**
 * Supabase email + password auth, wrapped so the UI never touches raw error
 * strings.
 *
 * This replaces the old local PIN scheme entirely. That scheme kept a SHA-256
 * hash in localStorage, which is not a login — anyone with the device could read
 * every profile, and nothing was shared between browsers. Real sessions are the
 * point of having a database at all.
 */

export type AuthErrorCode =
  | "unconfigured"
  | "invalidCredentials"
  | "emailTaken"
  | "weakPassword"
  | "invalidEmail"
  | "rateLimited"
  | "needsConfirmation"
  | "network"
  | "unknown";

export type AuthOutcome =
  | { ok: true; needsConfirmation?: boolean }
  | { ok: false; code: AuthErrorCode; detail?: string };

/**
 * Supabase returns machine-readable `code` on newer versions and only a message
 * on older ones, so both are inspected. Anything unrecognised falls through to
 * `unknown` rather than being shown raw — driver text names internal tables.
 */
function classify(error: { message?: string; code?: string; status?: number }): AuthErrorCode {
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  if (code === "invalid_credentials" || message.includes("invalid login")) {
    return "invalidCredentials";
  }
  if (code === "user_already_exists" || message.includes("already registered")) {
    return "emailTaken";
  }
  if (code === "weak_password" || message.includes("password should be")) return "weakPassword";
  if (code === "email_address_invalid" || message.includes("invalid")) {
    if (message.includes("email")) return "invalidEmail";
  }
  if (code === "over_email_send_rate_limit" || error.status === 429) return "rateLimited";
  if (code === "email_not_confirmed" || message.includes("not confirmed")) {
    return "needsConfirmation";
  }
  if (message.includes("fetch") || message.includes("network")) return "network";
  return "unknown";
}

export function authReady(): boolean {
  return supabaseReady();
}

export async function signUpWithPassword(input: {
  email: string;
  password: string;
  name: string;
}): Promise<AuthOutcome> {
  const client = supabase();
  if (!client) return { ok: false, code: "unconfigured" };

  const { data, error } = await client.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    // Read by the handle_new_user trigger to populate profiles.name.
    options: { data: { name: input.name.trim() } },
  });

  if (error) return { ok: false, code: classify(error), detail: error.message };

  // With "Confirm email" on, Supabase returns a user but no session: the account
  // exists and cannot be used until the link is clicked. The UI has to say so
  // rather than pretending the student is signed in.
  return { ok: true, needsConfirmation: !data.session };
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthOutcome> {
  const client = supabase();
  if (!client) return { ok: false, code: "unconfigured" };

  const { error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) return { ok: false, code: classify(error), detail: error.message };
  return { ok: true };
}

export async function sendPasswordReset(email: string): Promise<AuthOutcome> {
  const client = supabase();
  if (!client) return { ok: false, code: "unconfigured" };

  const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/auth/reset`,
  });
  if (error) return { ok: false, code: classify(error), detail: error.message };
  return { ok: true };
}

export async function updatePassword(password: string): Promise<AuthOutcome> {
  const client = supabase();
  if (!client) return { ok: false, code: "unconfigured" };

  const { error } = await client.auth.updateUser({ password });
  if (error) return { ok: false, code: classify(error), detail: error.message };
  return { ok: true };
}

export async function signOutEverywhere(): Promise<void> {
  await supabase()?.auth.signOut();
}

/** Minimum Supabase enforces by default; mirrored so the UI can warn early. */
export const MIN_PASSWORD = 6;

/** 0–3, for the strength meter. Length first, then variety. */
export function passwordScore(password: string): number {
  if (password.length < MIN_PASSWORD) return 0;
  let score = 1;
  if (password.length >= 10) score++;
  if (/[^a-zA-Z]/.test(password) && /[a-zA-Z]/.test(password)) score++;
  return Math.min(3, score);
}
