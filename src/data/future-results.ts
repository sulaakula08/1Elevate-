/**
 * Fictional profiles for the landing page's future-results preview.
 *
 * These are design fixtures, not testimonials or product outcomes. The section
 * that renders them says so in visible copy and carries `data-synthetic=true`.
 * Replace this file with verified records before presenting the carousel as
 * evidence rather than as a concept.
 *
 * The cards are drawn as a score report, so each fixture carries what a report
 * actually prints: the administration it belongs to, and the two section scores
 * that sum to the total. `rw + math === to` for every row — a card whose halves
 * do not add up to its total is the one detail that gives a mock report away.
 */
export type FutureResult = {
  id: string;
  name: string;
  place: string;
  from: number;
  to: number;
  /** Reading and Writing, 200–800. */
  rw: number;
  /** Math, 200–800. */
  math: number;
  /** Test date, already formatted — no locale maths on a design fixture. */
  administration: string;
  skill: string;
};

export const FUTURE_RESULTS: FutureResult[] = [
  {
    id: "aigerim",
    name: "Aigerim Sarsenova",
    place: "Astana, Kazakhstan",
    from: 1370,
    to: 1540,
    rw: 750,
    math: 790,
    administration: "March 14, 2026",
    skill: "Command of Evidence",
  },
  {
    id: "emily",
    name: "Emily Carter",
    place: "Austin, United States",
    from: 1360,
    to: 1500,
    rw: 730,
    math: 770,
    administration: "May 2, 2026",
    skill: "Advanced Math",
  },
  {
    id: "omar",
    name: "Omar Al-Hassan",
    place: "Amman, Jordan",
    from: 1340,
    to: 1490,
    rw: 760,
    math: 730,
    administration: "June 6, 2026",
    skill: "Rhetorical Synthesis",
  },
  {
    id: "oliver",
    name: "Oliver Bennett",
    place: "London, United Kingdom",
    from: 1450,
    to: 1570,
    rw: 770,
    math: 800,
    administration: "March 14, 2026",
    skill: "Problem-Solving and Data Analysis",
  },
  {
    id: "anastasia",
    name: "Anastasia Volkova",
    place: "Moscow, Russia",
    from: 1360,
    to: 1510,
    rw: 780,
    math: 730,
    administration: "May 2, 2026",
    skill: "Words in Context",
  },
  {
    id: "zayd",
    name: "Zayd Al-Mansoori",
    place: "Abu Dhabi, UAE",
    from: 1370,
    to: 1530,
    rw: 740,
    math: 790,
    administration: "June 6, 2026",
    skill: "Geometry and Trigonometry",
  },
  {
    id: "maya",
    name: "Maya Rodriguez",
    place: "New York, United States",
    from: 1350,
    to: 1520,
    rw: 750,
    math: 770,
    administration: "March 14, 2026",
    skill: "Linear Equations",
  },
  {
    id: "alikhan",
    name: "Alikhan Nurbekov",
    place: "Almaty, Kazakhstan",
    from: 1400,
    to: 1550,
    rw: 780,
    math: 770,
    administration: "May 2, 2026",
    skill: "Standard English Conventions",
  },
];
