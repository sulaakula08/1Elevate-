import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * The pages worth indexing, served at /sitemap.xml.
 *
 * Three, and deliberately only three. Every other route in the app requires an
 * account, so a crawler that followed one would be served the landing page and
 * report the site as a dozen near-identical documents. A short honest sitemap
 * describes a small site better than a long misleading one.
 *
 * `lastModified` is the build time, which is the truth available here: the pages
 * are static, so they change when the deployment does.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/signup`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
