import type { Question } from "./types";

/**
 * Fourth SAT batch — deliberately balanced across the three difficulty levels so
 * an easy/medium/hard filter has real depth in every domain.
 */
export const SAT_QUESTIONS_4: Question[] = [
  // ================= Math · Algebra =================
  {
    id: "sat-math-031",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Evaluating expressions",
    domain: "Algebra",
    difficulty: 1,
    prompt: { en: "If x = 4, what is the value of 5x − 3?" },
    choices: [{ en: "12" }, { en: "17" }, { en: "20" }, { en: "23" }],
    answer: 1,
    explanation: {
      en: "5 · 4 = 20, and 20 − 3 = 17.",
    },
  },
  {
    id: "sat-math-032",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Slope-intercept form",
    domain: "Algebra",
    difficulty: 1,
    prompt: { en: "What is the y-intercept of the line y = −2x + 9?" },
    choices: [{ en: "−2" }, { en: "2" }, { en: "9" }, { en: "4.5" }],
    answer: 2,
    explanation: {
      en: "In y = mx + b, b is the y-intercept, so it is 9. The −2 is the slope.",
    },
  },
  {
    id: "sat-math-033",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Linear inequalities in context",
    domain: "Algebra",
    difficulty: 2,
    prompt: {
      en: "A student has $60 and buys notebooks at $7 each. Which inequality gives the possible numbers n of notebooks?",
    },
    choices: [{ en: "7n ≥ 60" }, { en: "7n ≤ 60" }, { en: "n + 7 ≤ 60" }, { en: "60n ≤ 7" }],
    answer: 1,
    explanation: {
      en: "Total spent is 7n and it cannot exceed 60, so 7n ≤ 60 (giving n ≤ 8).",
    },
  },
  {
    id: "sat-math-034",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Systems in context",
    domain: "Algebra",
    difficulty: 3,
    prompt: {
      en: "Tickets cost $8 for students and $12 for adults. 200 tickets sold for $2 000 in total. How many student tickets were sold?",
    },
    choices: [{ en: "50" }, { en: "100" }, { en: "150" }, { en: "160" }],
    answer: 1,
    explanation: {
      en: "With s + a = 200 and 8s + 12a = 2 000, substitute a = 200 − s: 8s + 2 400 − 12s = 2 000, so −4s = −400 and s = 100.",
    },
  },

  // ================= Math · Advanced Math =================
  {
    id: "sat-math-035",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Factoring",
    domain: "Advanced Math",
    difficulty: 1,
    prompt: { en: "Which expression is equivalent to x² − 9?" },
    choices: [
      { en: "(x − 3)(x − 3)" },
      { en: "(x + 3)(x − 3)" },
      { en: "(x + 9)(x − 1)" },
      { en: "x(x − 9)" },
    ],
    answer: 1,
    explanation: {
      en: "This is a difference of squares: a² − b² = (a + b)(a − b), so x² − 9 = (x + 3)(x − 3).",
    },
  },
  {
    id: "sat-math-036",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Function notation",
    domain: "Advanced Math",
    difficulty: 2,
    prompt: {
      en: "If f(x) = x² + 1 and g(x) = 2x, what is f(g(2))?",
    },
    choices: [{ en: "5" }, { en: "9" }, { en: "10" }, { en: "17" }],
    answer: 3,
    explanation: {
      en: "Work outward-in: g(2) = 4, then f(4) = 16 + 1 = 17. Doing f first would give the wrong 10.",
    },
  },
  {
    id: "sat-math-037",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Quadratic roots",
    domain: "Advanced Math",
    difficulty: 3,
    prompt: {
      en: "For which value of c does x² + 6x + c = 0 have exactly one real solution?",
    },
    choices: [{ en: "3" }, { en: "6" }, { en: "9" }, { en: "36" }],
    answer: 2,
    explanation: {
      en: "One solution means the discriminant is zero: 36 − 4c = 0, so c = 9 (the perfect square (x + 3)²).",
    },
  },

  // ================= Math · Problem-Solving and Data Analysis =================
  {
    id: "sat-math-038",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Unit rates",
    domain: "Problem-Solving and Data Analysis",
    difficulty: 1,
    prompt: { en: "A car travels 180 km in 3 hours. What is its average speed?" },
    choices: [{ en: "50 km/h" }, { en: "60 km/h" }, { en: "90 km/h" }, { en: "540 km/h" }],
    answer: 1,
    explanation: {
      en: "180 / 3 = 60 km/h.",
    },
  },
  {
    id: "sat-math-039",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Proportional reasoning",
    domain: "Problem-Solving and Data Analysis",
    difficulty: 2,
    prompt: {
      en: "A recipe for 4 people needs 300 g of rice. How much is needed for 10 people?",
    },
    choices: [{ en: "600 g" }, { en: "700 g" }, { en: "750 g" }, { en: "900 g" }],
    answer: 2,
    explanation: {
      en: "300 / 4 = 75 g per person, so 75 · 10 = 750 g.",
    },
  },
  {
    id: "sat-math-040",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Sample inference",
    domain: "Problem-Solving and Data Analysis",
    difficulty: 3,
    passage: {
      en: "A researcher surveys 400 randomly selected residents of a city of 200 000 and finds that 35% cycle at least once a week, with a margin of error of 4 percentage points.",
    },
    prompt: { en: "Which conclusion is best supported?" },
    choices: [
      { en: "Exactly 70 000 residents cycle weekly." },
      { en: "Between about 31% and 39% of residents cycle weekly." },
      { en: "The sample is too small to support any conclusion." },
      { en: "35% of the 400 surveyed residents is unrelated to the city as a whole." },
    ],
    answer: 1,
    explanation: {
      en: "A margin of error gives an interval, not a point value: 35% ± 4 points. Random selection is exactly what licenses generalising to the city.",
    },
  },

  // ================= Math · Geometry and Trigonometry =================
  {
    id: "sat-math-041",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Angles",
    domain: "Geometry and Trigonometry",
    difficulty: 1,
    prompt: {
      en: "Two angles of a triangle measure 50° and 60°. What is the third angle?",
    },
    choices: [{ en: "60°" }, { en: "70°" }, { en: "80°" }, { en: "110°" }],
    answer: 1,
    explanation: {
      en: "Angles in a triangle sum to 180°: 180 − 50 − 60 = 70°.",
    },
  },
  {
    id: "sat-math-042",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Arc and sector",
    domain: "Geometry and Trigonometry",
    difficulty: 2,
    prompt: {
      en: "A circle has radius 6. What is the area of a sector with a central angle of 90°?",
    },
    choices: [{ en: "3π" }, { en: "6π" }, { en: "9π" }, { en: "36π" }],
    answer: 2,
    explanation: {
      en: "The full area is 36π; a 90° sector is one quarter of it: 9π.",
    },
  },
  {
    id: "sat-math-043",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Special right triangles",
    domain: "Geometry and Trigonometry",
    difficulty: 3,
    prompt: {
      en: "In a 30°–60°–90° triangle the shortest side is 5. What is the hypotenuse?",
    },
    choices: [{ en: "5√2" }, { en: "5√3" }, { en: "10" }, { en: "10√3" }],
    answer: 2,
    explanation: {
      en: "Sides are in the ratio 1 : √3 : 2, so the hypotenuse is twice the shortest side: 10. 5√3 is the middle leg.",
    },
  },

  // ================= RW · Information and Ideas =================
  {
    id: "sat-rw-023",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Inferences",
    domain: "Information and Ideas",
    difficulty: 1,
    passage: {
      en: "The library's 3D printer was booked solid for the first month. By March, staff noticed the sign-up sheet had blank afternoons, though the printer itself ran almost continuously — a handful of regulars had learned to queue several jobs at once.",
    },
    prompt: { en: "Which choice most logically completes the text's implication?" },
    choices: [
      { en: "Interest in the printer collapsed after the first month." },
      { en: "Use became concentrated among fewer, more experienced users." },
      { en: "The printer was broken for much of March." },
      { en: "The library plans to buy a second printer." },
    ],
    answer: 1,
    explanation: {
      en: "Fewer sign-ups but near-continuous running points to a small group using it more heavily, not to falling use.",
    },
  },
  {
    id: "sat-rw-024",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Command of evidence (textual)",
    domain: "Information and Ideas",
    difficulty: 2,
    passage: {
      en: "A historian argues that the felt yurt spread not because it was cheap but because it could be dismantled and re-erected by a single family in under two hours.",
    },
    prompt: {
      en: "Which finding, if true, would most strengthen the historian's claim?",
    },
    choices: [
      {
        en: "Households that moved camp most often adopted the yurt earliest, regardless of wealth.",
      },
      { en: "Felt was widely available across the steppe." },
      { en: "Yurts were often decorated with expensive textiles." },
      { en: "Some settled communities also used yurts seasonally." },
    ],
    answer: 0,
    explanation: {
      en: "Linking adoption to frequency of movement — and explicitly not to wealth — supports mobility rather than cost as the driver.",
    },
  },

  // ================= RW · Craft and Structure =================
  {
    id: "sat-rw-025",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Words in context",
    domain: "Craft and Structure",
    difficulty: 1,
    passage: {
      en: "Her first draft was sprawling and unfocused; the published essay is lean, with every paragraph doing visible work.",
    },
    prompt: { en: "Which word best describes the published essay?" },
    choices: [{ en: "disjointed" }, { en: "economical" }, { en: "ornate" }, { en: "tentative" }],
    answer: 1,
    explanation: {
      en: "“Lean” with every paragraph working means nothing wasted — economical. The other options describe the draft or the opposite quality.",
    },
  },
  {
    id: "sat-rw-026",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Text structure and purpose",
    domain: "Craft and Structure",
    difficulty: 3,
    passage: {
      en: "The paper spends its first half establishing that the two lakes had nearly identical chemistry in 1990. Only then does it introduce the difference that matters: one has been fed by meltwater ever since, the other by irrigation runoff.",
    },
    prompt: { en: "What function does the first half of the paper serve?" },
    choices: [
      { en: "It establishes a baseline so a later difference can be attributed to one cause." },
      { en: "It argues that lake chemistry cannot be measured reliably." },
      { en: "It summarises previous research on meltwater." },
      { en: "It shows that irrigation runoff is harmless." },
    ],
    answer: 0,
    explanation: {
      en: "Showing the lakes started alike is what makes the single later difference explanatory — a controlled comparison.",
    },
  },

  // ================= RW · Expression of Ideas =================
  {
    id: "sat-rw-027",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Transitions",
    domain: "Expression of Ideas",
    difficulty: 1,
    prompt: {
      en: "Choose the best transition: “The museum is free on Wednesdays. ____, it is busiest on that day.”",
    },
    choices: [{ en: "Unsurprisingly" }, { en: "Nevertheless" }, { en: "In contrast" }, { en: "Instead" }],
    answer: 0,
    explanation: {
      en: "The second sentence is the expected consequence of the first, so a confirming transition fits.",
    },
  },
  {
    id: "sat-rw-028",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Rhetorical synthesis",
    domain: "Expression of Ideas",
    difficulty: 2,
    passage: {
      en: "Notes: • The Turkestan–Siberian railway was completed in 1930. • It linked Central Asian cotton with Siberian grain. • Construction employed tens of thousands of workers. • Travel time between the regions fell from weeks to days.",
    },
    prompt: {
      en: "The student wants to emphasise the railway's economic effect. Which choice best uses the notes?",
    },
    choices: [
      { en: "The Turkestan–Siberian railway was completed in 1930." },
      {
        en: "By linking Central Asian cotton with Siberian grain, the railway cut travel between the regions from weeks to days.",
      },
      { en: "Tens of thousands of workers were employed building the railway." },
      { en: "The railway was one of several built in the period." },
    ],
    answer: 1,
    explanation: {
      en: "Only the second choice pairs what was linked with the measurable change — an economic effect. The others give dates or inputs.",
    },
  },

  // ================= RW · Standard English Conventions =================
  {
    id: "sat-rw-029",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Subject–verb agreement",
    domain: "Standard English Conventions",
    difficulty: 1,
    prompt: {
      en: "Which choice is correct? “The list of required documents ____ posted online.”",
    },
    choices: [{ en: "are" }, { en: "is" }, { en: "were" }, { en: "have been" }],
    answer: 1,
    explanation: {
      en: "The subject is “list” (singular), not “documents”, so the verb is “is”.",
    },
  },
  {
    id: "sat-rw-030",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Boundaries",
    domain: "Standard English Conventions",
    difficulty: 2,
    prompt: {
      en: "Which choice is correct? “After the storm passed ____ the crew inspected every panel.”",
    },
    choices: [{ en: "," }, { en: ";" }, { en: ":" }, { en: " — and" }],
    answer: 0,
    explanation: {
      en: "“After the storm passed” is a dependent clause, so a comma joins it to the main clause. A semicolon would need two independent clauses.",
    },
  },
  {
    id: "sat-rw-031",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Form, structure and sense",
    domain: "Standard English Conventions",
    difficulty: 3,
    prompt: {
      en: "Which choice completes the sentence conforming to standard English? “The samples, having been stored improperly for a decade, ____ no longer usable.”",
    },
    choices: [{ en: "was" }, { en: "were" }, { en: "is" }, { en: "being" }],
    answer: 1,
    explanation: {
      en: "Ignore the interrupting phrase: the plural subject “samples” takes “were”. “Being” would leave the sentence without a main verb.",
    },
  },
];
