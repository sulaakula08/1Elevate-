import type { MetadataRoute } from "next";
import { IS_PRODUCTION_SITE, SITE_URL } from "@/lib/site";

/**
 * What a crawler may read, served at /robots.txt.
 *
 * There was no such file: the path answered 404, which is not fatal — a missing
 * robots.txt means "crawl everything" — but it also meant no sitemap was ever
 * advertised, so a new domain had nothing to hand Google beyond its home page.
 *
 * Everything behind the sign-in is disallowed. Not to hide it — it is already
 * unreachable without an account — but because a crawler asking for /practice
 * is served the landing page's markup, and a dozen paths all returning the same
 * page is exactly the duplicate content that makes a small site look thin.
 *
 * Previews refuse everything. The same pages under a branch URL competing with
 * the live domain is the one SEO mistake a deploy pipeline makes for free.
 */
export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION_SITE) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/account",
          "/admin",
          "/community",
          "/feedback",
          "/mock",
          "/practice",
          "/progress",
          "/review",
          "/settings",
          "/auth/",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
