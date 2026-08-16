import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient } from "./server";

/**
 * The fallback path for closing an account.
 *
 * The primary path is `delete_own_account`, a SECURITY DEFINER function, and it
 * is preferred precisely because it needs no privileged key. But it only works
 * where the role that owns it may delete from auth's tables — deleting a user
 * cascades into identities, sessions, refresh tokens and the rest — and on a
 * project where that grant cannot be made it fails with 42501 no matter how
 * many times the migration is re-run.
 *
 * Supabase's own answer for that is the Auth Admin API, which needs the service
 * key. So the key is optional and this runs only when the function has already
 * refused for lack of privilege: a project that can grant them never loads a
 * key that bypasses row-level security, and one that cannot still gets a
 * working feature.
 *
 * ── Why the guards are repeated here ───────────────────────────────────────
 * This path does not go through the function, so the function's checks do not
 * apply. Re-stating them is duplication, and the alternative is worse: a second
 * way in that skips the name confirmation and the owner rule is not a fallback,
 * it is a hole. They are checked against the profile as read by the caller, so
 * row-level security still decides which row is theirs.
 */

export type DeleteOutcome =
  | { ok: true }
  | { ok: false; status: number; error: string };

/** Null when no service key is configured — the caller then reports the original failure. */
export async function deleteAccountAsAdmin(
  callerClient: SupabaseClient,
  userId: string,
  confirmName: string,
): Promise<DeleteOutcome | null> {
  const admin = adminClient();
  if (!admin) return null;

  const { data: profile } = await callerClient
    .from("profiles")
    .select("name, email, role")
    .eq("id", userId)
    .maybeSingle();

  const me = profile as { name?: string; email?: string; role?: string } | null;
  if (!me) return { ok: false, status: 404, error: "No profile for this account." };

  // The same two spellings the interface can show: the stored name, or the
  // email's local part when that column is empty.
  const typed = confirmName.trim();
  const matches =
    typed === (me.name ?? "").trim() || typed === (me.email ?? "").split("@")[0];
  if (!matches) return { ok: false, status: 400, error: "That name does not match." };

  if (me.role === "owner") {
    return {
      ok: false,
      status: 403,
      error:
        "An owner cannot delete their own account — it would leave the project with nobody who can appoint admins.",
    };
  }

  // Personal files first. If this fails the account still goes: a leftover
  // avatar is worth less than an account someone asked twice to be rid of.
  for (const bucket of ["avatars", "feedback-shots"]) {
    try {
      const { data: files } = await admin.storage.from(bucket).list(userId);
      if (files?.length) {
        await admin.storage.from(bucket).remove(files.map((f) => `${userId}/${f.name}`));
      }
    } catch {
      // Reported by the delete below if it matters; never fatal on its own.
    }
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    return { ok: false, status: 502, error: "Could not delete the account." };
  }
  return { ok: true };
}
