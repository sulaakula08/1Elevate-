/**
 * Which environment is this, and which database is it talking to.
 *
 * Both halves of that question matter, and they are not the same question. The
 * environment is where the code is running; the database is what it will damage
 * if the answer is wrong. For most of this project's life they were the same
 * database everywhere, so there was nothing to distinguish and nothing to get
 * wrong. Now there are two, and the interesting failure is a mismatch: running
 * locally, against production.
 *
 * Deliberately not a "use client" module. It reads only inlined NEXT_PUBLIC_
 * values and has no React in it, so both the server routes and the browser can
 * import it without one pulling the other's runtime along.
 */

/**
 * The production project's ref, hardcoded on purpose.
 *
 * This is not a secret and cannot be used to reach anything: it is the
 * subdomain of a public URL that ships in every browser bundle and appears in
 * every network request the app makes. What it buys is the one check that the
 * environment variables cannot perform on themselves — "the URL I was handed is
 * the production URL" — which stays true no matter how the variables were set
 * or which platform set them.
 *
 * If production ever moves, this constant moves with it, and the check is loud
 * about being wrong rather than silently passing.
 */
export const PRODUCTION_PROJECT_REF = "mkxebolzrqwfuvpevtsu";

export type AppEnv = "development" | "preview" | "production";

/**
 * The project ref from the configured Supabase URL, e.g.
 * https://abcdefgh.supabase.co -> "abcdefgh". Null when unset or not a
 * recognisable Supabase host, which is the honest answer for a self-hosted or
 * unconfigured setup rather than a guess.
 */
export function supabaseProjectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  const match = /^https?:\/\/([a-z0-9-]+)\.supabase\.(co|in)/i.exec(url.trim());
  return match ? match[1] : null;
}

/**
 * Where the code is running.
 *
 * `NEXT_PUBLIC_APP_ENV` wins when set, so any deployment that is not on Vercel
 * can still state what it is.
 *
 * Otherwise the deciding question is "is this a Vercel deployment at all", and
 * NOT what NODE_ENV says. That is deliberate and it is the whole subtlety of
 * this function:
 *
 *   `next start` sets NODE_ENV=production. So does the real production
 *   deployment. Reading NODE_ENV therefore makes a developer who builds and
 *   serves locally — the normal way to check a production build, and the way
 *   this very badge was first tested — indistinguishable from production. Which
 *   in turn switched off `isUnsafeProductionConnection`, because that check
 *   excludes production, at exactly the moment someone was pointing a local
 *   production build at the real database. The guard was off in the case it
 *   existed for.
 *
 * `NEXT_PUBLIC_VERCEL_ENV` is present on Vercel builds and absent everywhere
 * else, which is precisely the distinction wanted: no Vercel variable means a
 * local build, whatever NODE_ENV claims.
 *
 * The residual gap is a non-Vercel production host, which would report
 * "development" and show a DEV badge. That is the safe direction to be wrong in
 * — it over-warns rather than under-warns — and `NEXT_PUBLIC_APP_ENV=production`
 * is the fix if this is ever hosted somewhere else.
 *
 * Note this says nothing about which database is attached. A preview deployment
 * wired to production Supabase still reports "preview"; that gap is what
 * `usingProductionDatabase` is for.
 */
export function appEnv(): AppEnv {
  const forced = process.env.NEXT_PUBLIC_APP_ENV;
  if (forced === "development" || forced === "preview" || forced === "production") {
    return forced;
  }

  // NEXT_PUBLIC_ for the browser, where only inlined values exist; the bare name
  // for server-side rendering, where the full environment is readable and the
  // public variant may not have been exposed.
  const vercel = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV;
  if (vercel === "production") return "production";
  if (vercel === "preview" || vercel === "development") return "preview";

  return "development";
}

/** True when the configured Supabase project is the one real students use. */
export function usingProductionDatabase(): boolean {
  return supabaseProjectRef() === PRODUCTION_PROJECT_REF;
}

/**
 * The mismatch worth shouting about: not-production code holding the
 * production database.
 *
 * This is the state the whole phase exists to eliminate — it is what made every
 * local browser test write rows a student could read — so the app now knows it
 * is in that state and says so, rather than leaving it to whoever remembers to
 * check the URL in `.env.local`.
 *
 * The reverse mismatch (production code on a dev database) is not treated as
 * dangerous here. It would be a serious outage, but it destroys nothing, and a
 * guard that refuses to run production is a worse failure than the one it
 * prevents.
 */
export function isUnsafeProductionConnection(): boolean {
  return appEnv() !== "production" && usingProductionDatabase();
}

/** Short label for the environment badge. Null in production, where there is nothing to say. */
export function environmentLabel(): string | null {
  if (isUnsafeProductionConnection()) return "PROD DATA";
  switch (appEnv()) {
    case "development":
      return "DEV";
    case "preview":
      return "PREVIEW";
    case "production":
      return null;
  }
}

/**
 * One line for a developer, covering both halves. Used by the badge tooltip and
 * the console warning, so the two cannot describe the situation differently.
 */
export function environmentDescription(): string {
  const ref = supabaseProjectRef() ?? "not configured";
  const where = appEnv();
  if (isUnsafeProductionConnection()) {
    return `${where} build connected to the PRODUCTION database (${ref}). Anything you write here is visible to real students.`;
  }
  return `${where} build, Supabase project ${ref}.`;
}

/**
 * Warn once, in the browser console, when the connection is the dangerous one.
 *
 * A console warning and not a thrown error or a blocking screen: the person who
 * needs to know is a developer with devtools open, and the ones who would be
 * punished by anything louder are students on production — who never reach this
 * branch, because production is excluded by definition.
 *
 * Guarded by a module-level flag rather than a React ref because React mounts
 * this twice in development Strict Mode, and a warning printed twice reads as
 * two problems.
 */
let warned = false;

export function warnOnUnsafeConnection(): void {
  if (warned || typeof window === "undefined") return;
  if (!isUnsafeProductionConnection()) return;
  warned = true;
  console.warn(
    `[1Elevate] ${environmentDescription()}\n` +
      "Point NEXT_PUBLIC_SUPABASE_URL at the development project before running tests. See DATABASE.md.",
  );
}
