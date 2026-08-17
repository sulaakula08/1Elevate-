import { SITE_URL } from "@/lib/site";

/**
 * Who this site is, in the form a search engine reads.
 *
 * The name is not unique — an unrelated 1Elevate has held the first results for
 * years — so a query for it is a question Google has already answered with
 * somebody else. Nothing here forces a ranking, and no markup could. What it
 * does is state plainly that this is a distinct organisation with this name,
 * this URL and this purpose, rather than leaving that to be inferred from a
 * page whose text a crawler must guess at.
 *
 * Two objects, because they answer different questions. WebSite names the site
 * and lets Google offer a search box beneath the result once there are pages
 * worth searching. Organization names the thing behind it.
 *
 * JSON-LD rather than microdata scattered through the markup: it is one block
 * to keep truthful, and truthful is the only thing that matters here — markup
 * that claims more than the site delivers is the kind Google learns to distrust.
 */
export function StructuredData() {
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "1Elevate",
      alternateName: "1Elevate SAT",
      url: `${SITE_URL}/`,
      inLanguage: "en",
      description:
        "SAT preparation: a question bank written to the official blueprint, full-length mock tests with real module timing, and analytics that name the topics costing you points.",
    },
    {
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      name: "1Elevate",
      url: `${SITE_URL}/`,
      description:
        "An online SAT preparation platform: practice by topic, timed mock exams on the official format, and an AI assistant that explains any question.",
      areaServed: "Worldwide",
    },
  ];

  return (
    <script
      type="application/ld+json"
      // The only safe use of this prop: the content is built here from constants,
      // never from anything a user typed, and JSON.stringify escapes it.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
