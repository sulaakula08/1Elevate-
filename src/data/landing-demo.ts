/**
 * ============================================================================
 *  SYNTHETIC LANDING-PAGE CONTENT. NOT PRODUCT DATA. NOT A RESULT.
 * ============================================================================
 *
 * Everything exported from this file was written by hand to show what an
 * outcomes section will look like once there are real students to put in it.
 * No student, score, gain, city or quote below describes a person.
 *
 * This is the only file in the repository that holds invented outcomes, and it
 * holds nothing else. Two properties keep it that way, and both matter:
 *
 * 1. It is inert unless switched on. `syntheticOutcomesEnabled()` is false on
 *    production builds unless `NEXT_PUBLIC_LANDING_DEMO_OUTCOMES=on` is set
 *    deliberately, so shipping this to students without that decision removes
 *    the section rather than publishing a claim. `=off` disables it everywhere.
 *
 * 2. Nothing else imports it. The learning loop, the capability surfaces and
 *    the exam anatomy all run on `landing-sample.ts` and the real blueprint in
 *    `exams.ts`, so the page still argues its case with the section gone. If a
 *    future edit needs a number from here to make another section work, that
 *    section is making a claim it cannot support — move the number, not the
 *    import.
 *
 * The section that renders this also carries `data-synthetic="true"` on its
 * root element: invisible to a reader, greppable in a review, and the fastest
 * way to answer "is anything on this page invented" from devtools.
 */

/** One student outcome as the wall renders it. */
export type DemoOutcome = {
  id: string;
  name: string;
  place: string;
  /** Score before and after, on the real 400–1600 scale. */
  from: number;
  to: number;
  /** A skill name from `taxonomy.ts`, so the detail matches the product. */
  skill: string;
  /** Questions answered in the product. */
  answered: number;
  /** Weeks between the first and last mock. */
  weeks: number;
  quote: string;
};

/**
 * Six outcomes, ordered for the wall rather than by size.
 *
 * The gains run +90 to +150 because that is the band a preparation product can
 * stand behind: large enough to matter, small enough to be true. Nothing here
 * says "guaranteed", nothing crosses 200 points, and the student who starts at
 * 1420 gains the least — a wall where everyone gains the same amount from every
 * starting score is the tell that the numbers were invented.
 *
 * Names are drawn from the places this product is actually used, and each quote
 * is written in a different voice: one is blunt, one is grateful, one is nearly
 * a complaint. Six variations on "it helped" would read as one person typing.
 *
 * Quotes are kept under about sixty-five characters because the card reveals them
 * in a panel of known height — a third line overflows it. Which is no loss: the
 * shorter they got, the more they sounded like someone talking.
 */
export const DEMO_OUTCOMES: DemoOutcome[] = [
  {
    id: "d1",
    name: "Aruzhan",
    place: "Almaty",
    from: 1240,
    to: 1390,
    skill: "Command of Evidence (Textual)",
    answered: 612,
    weeks: 7,
    quote: "I stopped doing random sets. The queue told me what was broken.",
  },
  {
    id: "d2",
    name: "Ethan",
    place: "Portland",
    from: 1180,
    to: 1320,
    skill: "Linear equations in two variables",
    answered: 478,
    weeks: 9,
    quote: "I had been making the same sign mistake for a year.",
  },
  {
    id: "d3",
    name: "Omar",
    place: "Amman",
    from: 1360,
    to: 1480,
    skill: "Rhetorical Synthesis",
    answered: 745,
    weeks: 6,
    quote: "The explanations were the part that changed anything.",
  },
  {
    id: "d4",
    name: "Sofia",
    place: "Warsaw",
    from: 1290,
    to: 1430,
    skill: "Nonlinear functions",
    answered: 523,
    weeks: 8,
    quote: "Two timed mocks in, the clock stopped scaring me.",
  },
  {
    id: "d5",
    name: "Alikhan",
    place: "Astana",
    from: 1420,
    to: 1510,
    skill: "Boundaries",
    answered: 388,
    weeks: 5,
    quote: "At 1420 nothing general helps. This found the eleven that did.",
  },
  {
    id: "d6",
    name: "Mariam",
    place: "Cairo",
    from: 1210,
    to: 1350,
    skill: "Inferences",
    answered: 640,
    weeks: 10,
    quote: "Watching one weak topic move every week kept me opening it.",
  },
];

/**
 * Three figures above the wall.
 *
 * The first two are the medians of the six outcomes below, computed by hand and
 * kept in step with them: gains 90/120/140/140/140/150 → 140, and weeks
 * 5/6/7/8/9/10 → 7.5, rounded to 8. Editing an outcome means editing these.
 *
 * That consistency is not pedantry. A wall whose summary does not agree with the
 * rows under it is the single most obvious tell that the numbers were typed
 * rather than measured, and this section's whole job is to look like the real one
 * that replaces it.
 *
 * The third figure has no source in the rows — it is a property of the invented
 * cohort, not of the six students shown.
 */
export const DEMO_COHORT = [
  { id: "gain", value: 140, prefix: "+", suffix: "", label: "median point gain" },
  { id: "weeks", value: 8, prefix: "", suffix: " wks", label: "median time to the second mock" },
  {
    id: "queue",
    value: 71,
    prefix: "",
    suffix: "%",
    label: "of their practice drawn from their own review queue",
  },
] as const;

/**
 * Whether the outcomes section renders at all.
 *
 * Only `NEXT_PUBLIC_` variables are read, and they are inlined into both the
 * server and the browser bundle at build time, so this returns the same answer
 * on both sides of hydration. Reading a server-only variable here — `VERCEL_ENV`
 * without the public prefix, say — would make the server render the section and
 * the browser remove it, which is a hydration mismatch on the busiest page in
 * the product.
 */
export function syntheticOutcomesEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_LANDING_DEMO_OUTCOMES;
  if (flag === "on") return true;
  if (flag === "off") return false;

  const isProduction =
    process.env.NEXT_PUBLIC_APP_ENV === "production" ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === "production";
  return !isProduction;
}
