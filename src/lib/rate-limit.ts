/**
 * A per-caller ceiling on the two routes that cost money.
 *
 * ── What this is honestly worth ────────────────────────────────────────────
 * The counter lives in the memory of one server instance. Vercel runs several,
 * and recycles them, so a determined attacker spreading requests around will
 * get more through than the numbers below suggest, and a cold start forgets
 * everything. It is not a quota.
 *
 * It is still worth having, because the realistic attack is not determined: it
 * is a loop in a terminal against an endpoint someone noticed. That this stops
 * outright. A real quota needs shared state — Upstash, or a counter table in
 * Postgres — and is worth adding the day the bill says so.
 *
 * Anonymous callers are not the concern here: both routes now require a signed
 * -in account, so every request already costs an attacker a sign-up.
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

/**
 * @param key    who is being counted, usually `${route}:${userId}`
 * @param limit  requests allowed per window
 * @param windowMs  how long the window lasts
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateVerdict {
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
