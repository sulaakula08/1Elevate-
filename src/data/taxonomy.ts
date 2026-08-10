/**
 * The official digital SAT content taxonomy: four domains per section, each
 * with its own skills.
 *
 * One source of truth, because these strings are how the whole product joins up.
 * Typed by hand into a free-text box they drift — "Words in Context", "words in
 * context", "Word in Context" — and every report that groups by skill silently
 * splits into three. A question's domain and skill are now chosen from a list,
 * never typed.
 *
 * Names are the ones College Board publishes, so a student sees the same wording
 * here as in their score report.
 *
 * Source: https://satsuite.collegeboard.org/sat/whats-on-the-test/reading-writing
 *         https://satsuite.collegeboard.org/sat/whats-on-the-test/math
 */

export type Domain = { name: string; skills: string[] };

/** Reading & Writing — four domains, in the order the exam lists them. */
export const RW_DOMAINS: Domain[] = [
  {
    name: "Information and Ideas",
    skills: [
      "Central Ideas and Details",
      "Command of Evidence (Textual)",
      "Command of Evidence (Quantitative)",
      "Inferences",
    ],
  },
  {
    name: "Craft and Structure",
    skills: ["Words in Context", "Text Structure and Purpose", "Cross-Text Connections"],
  },
  {
    name: "Expression of Ideas",
    skills: ["Rhetorical Synthesis", "Transitions"],
  },
  {
    name: "Standard English Conventions",
    skills: ["Boundaries", "Form, Structure, and Sense"],
  },
];

/** Math — four domains. */
export const MATH_DOMAINS: Domain[] = [
  {
    name: "Algebra",
    skills: [
      "Linear equations in one variable",
      "Linear equations in two variables",
      "Linear functions",
      "Systems of two linear equations in two variables",
      "Linear inequalities in one or two variables",
    ],
  },
  {
    name: "Advanced Math",
    skills: [
      "Equivalent expressions",
      "Nonlinear equations in one variable",
      "Systems of equations in two variables",
      "Nonlinear functions",
    ],
  },
  {
    name: "Problem-Solving and Data Analysis",
    skills: [
      "Ratios, rates, proportional relationships, and units",
      "Percentages",
      "One-variable data: distributions and measures of center and spread",
      "Two-variable data: models and scatterplots",
      "Probability and conditional probability",
      "Inference from sample statistics and margin of error",
      "Evaluating statistical claims: observational studies and experiments",
    ],
  },
  {
    name: "Geometry and Trigonometry",
    skills: [
      "Area and volume",
      "Lines, angles, and triangles",
      "Right triangles and trigonometry",
      "Circles",
    ],
  },
];

export function domainsFor(subjectId: string): Domain[] {
  return subjectId === "sat-math" ? MATH_DOMAINS : RW_DOMAINS;
}

export function skillsFor(subjectId: string, domainName: string): string[] {
  return domainsFor(subjectId).find((d) => d.name === domainName)?.skills ?? [];
}

/** Every skill in a section, for a flat list where the domain is implied. */
export function allSkills(subjectId: string): string[] {
  return domainsFor(subjectId).flatMap((d) => d.skills);
}
