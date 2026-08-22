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

export type Domain = {
  name: string;
  /**
   * Share of its section's questions this domain carries on the real exam,
   * 0–1, as published by College Board in the same "What's on the Test" pages
   * the names come from — Reading & Writing 26/28/20/26, Math 35/35/15/15.
   *
   * It is here rather than in the analytics that use it because it is a fact
   * about the SAT, not a modelling choice: it is what turns "you are weaker at
   * Geometry than at Algebra" into "and Algebra is worth more than twice as
   * much of the section", which is the difference between a ranking and a
   * study plan. The published figures are ranges of question counts; these are
   * the midpoints College Board itself states as percentages.
   */
  weight: number;
  skills: string[];
};

/** Reading & Writing — four domains, in the order the exam lists them. */
export const RW_DOMAINS: Domain[] = [
  {
    name: "Information and Ideas",
    weight: 0.26,
    skills: [
      "Central Ideas and Details",
      "Command of Evidence (Textual)",
      "Command of Evidence (Quantitative)",
      "Inferences",
    ],
  },
  {
    name: "Craft and Structure",
    weight: 0.28,
    skills: ["Words in Context", "Text Structure and Purpose", "Cross-Text Connections"],
  },
  {
    name: "Expression of Ideas",
    weight: 0.2,
    skills: ["Rhetorical Synthesis", "Transitions"],
  },
  {
    name: "Standard English Conventions",
    weight: 0.26,
    skills: ["Boundaries", "Form, Structure, and Sense"],
  },
];

/** Math — four domains. */
export const MATH_DOMAINS: Domain[] = [
  {
    name: "Algebra",
    weight: 0.35,
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
    weight: 0.35,
    skills: [
      "Equivalent expressions",
      "Nonlinear equations in one variable",
      "Systems of equations in two variables",
      "Nonlinear functions",
    ],
  },
  {
    name: "Problem-Solving and Data Analysis",
    weight: 0.15,
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
    weight: 0.15,
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
