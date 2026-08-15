import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A per-caller ceiling on the two routes that cost money.
 *
 * The count lives in Postgres, in `public.rate_limits`, and is reached only
 * through `consume_rate` — a SECURITY DEFINER function that takes the subject
 * from `auth.uid()` rather than from a parameter. The table has row-level
 * security on and no policies, so a caller can neither read the count nor
 * reset it. See the migration for the reasoning.
 *
 * ── Why not in memory ──────────────────────────────────────────────────────
 * It was, and that version could be walked around by accident: Vercel runs
 * several instances and recycles them, so the count an attacker met depended on
 * which instance answered and how recently it had started. Every instance now
 * consults the same number.
 *
 * The in-memory limiter survives as the fallback for exactly one situation: a
 * database that has not had the migration applied yet. Falling back is the
 * right failure here — refusing every request would take the tutor down over a
 * missing table, and allowing every request would remove the ceiling silently.
 */

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

/** Keeps the map from growing without bound on a long-lived instance. */
function sweep(now: number) {
  if (windows.size < 500) return;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export type RateVerdict = {
  ok: boolean;
  /** Seconds until the window resets — goes straight into Retry-After. */
  retryAfter: number;
};

/** Best-effort, single instance. Used only when the shared counter is absent. */
export function rateLimitInMemory(key: string, limit: number, windowMs: number): RateVerdict {
  const now = Date.now();
  sweep(now);

  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  current.count += 1;
  if (current.count > limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfter: 0 };
}

/**
 * The real ceiling: one shared count for every instance.
 *
 * @param client   the caller's own client, so `auth.uid()` inside the function
 *                 is the person being counted
 * @param bucket   what is being limited, e.g. "explain"
 * @param userId   only for the in-memory fallback key
 */
export async function consumeRate(
  client: SupabaseClient,
  bucket: string,
  userId: string,
  limit: number,
  windowSeconds: number,
): Promise<RateVerdict> {
  const { data, error } = await client.rpc("consume_rate", {
    bucket_name: bucket,
    max_count: limit,
    window_seconds: windowSeconds,
  });

  if (error) {
    // Most likely the migration has not been applied. Say so in development,
    // where it is actionable, and keep a ceiling on either way.
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[rate-limit] falling back to memory: ${error.message}`);
    }
    return rateLimitInMemory(`${bucket}:${userId}`, limit, windowSeconds * 1000);
  }

  // A set-returning function comes back as an array of one row.
  const row = (Array.isArray(data) ? data[0] : data) as
    | { allowed?: boolean; retry_after?: number }
    | undefined;

  // A shape that cannot be read is treated as refusal rather than as consent:
  // the counter has already been incremented, and guessing "allowed" here would
  // turn every future change to that function into an open door.
  if (!row || typeof row.allowed !== "boolean") {
    return { ok: false, retryAfter: windowSeconds };
  }

  return { ok: row.allowed, retryAfter: Math.max(0, Number(row.retry_after ?? 0)) };
}
