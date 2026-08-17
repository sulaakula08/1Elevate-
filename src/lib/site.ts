/**
 * Where this deployment lives, as an absolute origin.
 *
 * Search engines need absolute URLs — a canonical link, an Open Graph image, a
 * sitemap entry — and none of them can be built from a path alone. Next resolves
 * them against `metadataBase`, which is why that has to be set from here rather
 * than left to default: without it Next warns and falls back to localhost, and a
 * canonical pointing at localhost is worse than none at all.
 *
 * The order matters. `NEXT_PUBLIC_SITE_URL` wins so a self-hosted or renamed
 * deployment can say where it is. Otherwise Vercel's own variable is used, which
 * is set on every deployment including previews — so a preview describes itself
 * rather than claiming to be production, and does not invite Google to index a
 * copy of the site under a throwaway address.
 */

const FALLBACK = "https://1elevate.co";

function fromEnv(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit;

  // Vercel sets this without a scheme.
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;

  return FALLBACK;
}

/** No trailing slash, so `${SITE_URL}/path` never doubles it. */
export const SITE_URL = fromEnv().replace(/\/+$/, "");

/**
 * True only on the real production deployment.
 *
 * Previews must not be indexed: Google finding the same pages on
 * project-git-branch.vercel.app and on the live domain is duplicate content,
 * and the copy it decides to show can be a branch that no longer exists.
 */
export const IS_PRODUCTION_SITE =
  process.env.NEXT_PUBLIC_VERCEL_ENV === undefined ||
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production";
