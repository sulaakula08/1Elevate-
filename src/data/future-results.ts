/**
 * Fictional profiles for the landing page's future-results preview.
 *
 * These are design fixtures, not testimonials or product outcomes. The section
 * that renders them says so in visible copy and carries `data-synthetic=true`.
 * Replace this file with verified records before presenting the carousel as
 * evidence rather than as a concept.
 */
export type FutureResult = {
  id: string;
  name: string;
  place: string;
  from: number;
  to: number;
  skill: string;
};

export const FUTURE_RESULTS: FutureResult[] = [
  {
    id: "aigerim",
    name: "Aigerim Sarsenova",
    place: "Astana, Kazakhstan",
    from: 1370,
    to: 1540,
    skill: "Command of Evidence",
  },
  {
    id: "emily",
    name: "Emily Carter",
    place: "Austin, United States",
    from: 1360,
    to: 1500,
    skill: "Advanced Math",
  },
  {
    id: "omar",
    name: "Omar Al-Hassan",
    place: "Amman, Jordan",
    from: 1340,
    to: 1490,
    skill: "Rhetorical Synthesis",
  },
  {
    id: "oliver",
    name: "Oliver Bennett",
    place: "London, United Kingdom",
    from: 1450,
    to: 1570,
    skill: "Problem-Solving and Data Analysis",
  },
  {
    id: "anastasia",
    name: "Anastasia Volkova",
    place: "Moscow, Russia",
    from: 1360,
    to: 1510,
    skill: "Words in Context",
  },
  {
    id: "zayd",
    name: "Zayd Al-Mansoori",
    place: "Abu Dhabi, UAE",
    from: 1370,
    to: 1530,
    skill: "Geometry and Trigonometry",
  },
  {
    id: "maya",
    name: "Maya Rodriguez",
    place: "New York, United States",
    from: 1350,
    to: 1520,
    skill: "Linear Equations",
  },
  {
    id: "alikhan",
    name: "Alikhan Nurbekov",
    place: "Almaty, Kazakhstan",
    from: 1400,
    to: 1550,
    skill: "Standard English Conventions",
  },
];
