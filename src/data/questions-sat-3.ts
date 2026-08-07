import type { Question } from "./types";

/**
 * Third SAT batch, written against the published College Board domains:
 * Reading & Writing — Information and Ideas, Craft and Structure, Expression of
 * Ideas, Standard English Conventions. Math — Algebra, Advanced Math,
 * Problem-Solving and Data Analysis, Geometry and Trigonometry.
 * Original items in the official style; no exam papers are reproduced.
 */
export const SAT_QUESTIONS_3: Question[] = [
  // ---------------- Math · Algebra ----------------
  {
    id: "sat-math-018",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Linear equations in one variable",
    domain: "Algebra",
    difficulty: 1,
    prompt: { en: "If 3(x − 2) = x + 8, what is the value of x?" },
    choices: [{ en: "3" }, { en: "5" }, { en: "7" }, { en: "14" }],
    answer: 2,
    explanation: {
      en: "Expand: 3x − 6 = x + 8. Subtract x and add 6: 2x = 14, so x = 7.",
    },
  },
  {
    id: "sat-math-019",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Systems of linear equations",
    domain: "Algebra",
    difficulty: 3,
    prompt: {
      en: "How many solutions does the system 2x + 3y = 12 and 4x + 6y = 24 have?",
    },
    choices: [
      { en: "Exactly one" },
      { en: "Exactly two" },
      { en: "None" },
      { en: "Infinitely many" },
    ],
    answer: 3,
    explanation: {
      en: "The second equation is the first multiplied by 2, so both describe the same line — every point on it is a solution.",
    },
  },
  {
    id: "sat-math-020",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Linear functions in context",
    domain: "Algebra",
    difficulty: 2,
    prompt: {
      en: "A tank holds 60 litres and drains at 4 litres per minute. Which function gives the litres L remaining after m minutes?",
    },
    choices: [
      { en: "L(m) = 4m − 60" },
      { en: "L(m) = 60 − 4m" },
      { en: "L(m) = 60 + 4m" },
      { en: "L(m) = 60 / 4m" },
    ],
    answer: 1,
    explanation: {
      en: "Start at 60 and lose 4 each minute, so the rate is negative: L(m) = 60 − 4m.",
    },
  },

  // ---------------- Math · Advanced Math ----------------
  {
    id: "sat-math-021",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Quadratic functions",
    domain: "Advanced Math",
    difficulty: 3,
    prompt: { en: "What is the minimum value of f(x) = x² − 6x + 11?" },
    choices: [{ en: "−6" }, { en: "2" }, { en: "3" }, { en: "11" }],
    answer: 1,
    explanation: {
      en: "Complete the square: f(x) = (x − 3)² + 2. The square is never negative, so the minimum is 2 (at x = 3). 3 is where the minimum occurs, not the value.",
    },
  },
  {
    id: "sat-math-022",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Exponential functions",
    domain: "Advanced Math",
    difficulty: 2,
    prompt: {
      en: "A colony of 400 bacteria doubles every 5 hours. How many are there after 15 hours?",
    },
    choices: [{ en: "1 200" }, { en: "1 600" }, { en: "3 200" }, { en: "6 400" }],
    answer: 2,
    explanation: {
      en: "15 hours is three doubling periods: 400 · 2³ = 400 · 8 = 3 200. Tripling (1 200) would be linear growth, not exponential.",
    },
  },
  {
    id: "sat-math-023",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Radical equations",
    domain: "Advanced Math",
    difficulty: 3,
    prompt: { en: "How many real solutions does √(x + 7) = x + 1 have?" },
    choices: [{ en: "0" }, { en: "1" }, { en: "2" }, { en: "Infinitely many" }],
    answer: 1,
    explanation: {
      en: "Squaring gives x² + x − 6 = 0, so x = 2 or x = −3. Checking: x = 2 works (3 = 3); x = −3 fails (2 ≠ −2). Only one solution survives.",
    },
  },

  // ---------------- Math · Problem-Solving and Data Analysis ----------------
  {
    id: "sat-math-024",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Conditional probability",
    domain: "Problem-Solving and Data Analysis",
    difficulty: 3,
    passage: {
      en: "In a survey of 200 people, 120 said they prefer tea. Of those 120, 45 are students. Of the 80 who prefer coffee, 25 are students.",
    },
    prompt: {
      en: "A person who prefers tea is selected at random. What is the probability that they are a student?",
    },
    choices: [{ en: "45/200" }, { en: "45/120" }, { en: "70/200" }, { en: "120/200" }],
    answer: 1,
    explanation: {
      en: "The condition restricts the group to the 120 tea-drinkers, so the denominator is 120, not 200: 45/120 = 0.375.",
    },
  },
  {
    id: "sat-math-025",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Percent change",
    domain: "Problem-Solving and Data Analysis",
    difficulty: 2,
    prompt: {
      en: "A subscription rises from $250 to $300 per year. What is the percent increase?",
    },
    choices: [{ en: "16.7%" }, { en: "20%" }, { en: "25%" }, { en: "50%" }],
    answer: 1,
    explanation: {
      en: "Increase is 50, over the original 250: 50/250 = 0.20 = 20%. Dividing by 300 instead gives the wrong 16.7%.",
    },
  },
  {
    id: "sat-math-026",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Centre and spread",
    domain: "Problem-Solving and Data Analysis",
    difficulty: 3,
    prompt: {
      en: "A data set of house prices has a few very expensive outliers. Which statement is true?",
    },
    choices: [
      { en: "The mean is pulled above the median." },
      { en: "The median is pulled above the mean." },
      { en: "Mean and median are unaffected by outliers." },
      { en: "The outliers change the median but not the mean." },
    ],
    answer: 0,
    explanation: {
      en: "The mean uses every value, so large outliers drag it upward; the median only depends on position, so it barely moves.",
    },
  },

  // ---------------- Math · Geometry and Trigonometry ----------------
  {
    id: "sat-math-027",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Circles in the plane",
    domain: "Geometry and Trigonometry",
    difficulty: 2,
    prompt: {
      en: "What are the centre and radius of the circle (x − 3)² + (y + 2)² = 25?",
    },
    choices: [
      { en: "Centre (3, −2), radius 5" },
      { en: "Centre (−3, 2), radius 5" },
      { en: "Centre (3, −2), radius 25" },
      { en: "Centre (3, 2), radius 5" },
    ],
    answer: 0,
    explanation: {
      en: "In (x − h)² + (y − k)² = r², the centre is (h, k) and r is the square root of the constant: (3, −2) with r = 5.",
    },
  },
  {
    id: "sat-math-028",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Similar figures",
    domain: "Geometry and Trigonometry",
    difficulty: 3,
    prompt: {
      en: "Two similar triangles have corresponding sides in the ratio 3 : 5. What is the ratio of their areas?",
    },
    choices: [{ en: "3 : 5" }, { en: "6 : 10" }, { en: "9 : 25" }, { en: "27 : 125" }],
    answer: 2,
    explanation: {
      en: "Area scales with the square of the linear ratio: (3/5)² = 9/25. The cube, 27 : 125, would be the volume ratio.",
    },
  },
  {
    id: "sat-math-029",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Right triangle trigonometry",
    domain: "Geometry and Trigonometry",
    difficulty: 2,
    prompt: {
      en: "In a right triangle, sin A = 0.6. What is cos(90° − A)?",
    },
    choices: [{ en: "0.4" }, { en: "0.6" }, { en: "0.8" }, { en: "1.0" }],
    answer: 1,
    explanation: {
      en: "Sine and cosine of complementary angles are equal: cos(90° − A) = sin A = 0.6.",
    },
  },
  {
    id: "sat-math-030",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Volume",
    domain: "Geometry and Trigonometry",
    difficulty: 2,
    prompt: {
      en: "A cylinder has radius 3 and height 5. What is its volume?",
    },
    choices: [{ en: "15π" }, { en: "30π" }, { en: "45π" }, { en: "75π" }],
    answer: 2,
    explanation: {
      en: "V = πr²h = π · 9 · 5 = 45π. Using 2πrh (30π) gives the lateral surface area instead.",
    },
  },

  // ---------------- RW · Information and Ideas ----------------
  {
    id: "sat-rw-015",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Central ideas and details",
    domain: "Information and Ideas",
    difficulty: 2,
    passage: {
      en: "Archaeologists once assumed the horse was domesticated for riding. Excavations at Botai in northern Kazakhstan complicate that story: the settlement's pottery holds traces of mare's milk, and the horse bones come overwhelmingly from managed herds rather than hunted animals. Riding may have followed milking, not preceded it.",
    },
    prompt: { en: "Which choice best states the main idea of the text?" },
    choices: [
      { en: "Botai pottery is the oldest known pottery in Central Asia." },
      {
        en: "Evidence from Botai suggests horses may have been kept for milk before they were ridden.",
      },
      { en: "Archaeologists no longer believe horses were ever ridden in antiquity." },
      { en: "Hunting remained the main source of horse meat at Botai." },
    ],
    answer: 1,
    explanation: {
      en: "The passage offers two findings — milk residue and managed herds — to question the riding-first assumption. The other options overstate or reverse what the text says.",
    },
  },
  {
    id: "sat-rw-016",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Command of evidence (quantitative)",
    domain: "Information and Ideas",
    difficulty: 3,
    passage: {
      en: "A city measured cycling trips before and after building protected lanes on three streets. On the street with a lane, trips rose from 900 to 2 300 per day. On two comparable streets without lanes, trips rose from 850 to 910 and from 1 000 to 1 040.",
    },
    prompt: {
      en: "Which statement is best supported by the data?",
    },
    choices: [
      {
        en: "Cycling rose sharply only on the street that received a protected lane.",
      },
      { en: "Cycling roughly doubled on all three streets." },
      { en: "The lane reduced cycling on nearby streets." },
      { en: "Most of the city's cyclists now use the new lane." },
    ],
    answer: 0,
    explanation: {
      en: "2.5× growth on the lane street versus roughly 5% on the comparison streets supports only the first claim; the data says nothing about city-wide share.",
    },
  },

  // ---------------- RW · Craft and Structure ----------------
  {
    id: "sat-rw-017",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Text structure and purpose",
    domain: "Craft and Structure",
    difficulty: 3,
    passage: {
      en: "The report opens with three pages of methodology before naming a single finding. That order is not an accident: the authors know their conclusion — that the new curriculum produced no measurable gain — will be challenged, and they want readers to have accepted the method before they meet the result.",
    },
    prompt: { en: "What is the main rhetorical purpose of the text?" },
    choices: [
      { en: "To criticise the report for burying its findings." },
      { en: "To explain why the report is organised the way it is." },
      { en: "To summarise the report's methodology." },
      { en: "To argue that the new curriculum works." },
    ],
    answer: 1,
    explanation: {
      en: "The text describes a structural choice and gives the reason for it (\"not an accident\"). It neither criticises nor summarises the method itself.",
    },
  },
  {
    id: "sat-rw-018",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Cross-text connections",
    domain: "Craft and Structure",
    difficulty: 3,
    passage: {
      en: "Text 1: Remote work widens opportunity. A developer in Aktobe can now hold a job that once required moving to Almaty, keeping talent and salaries in smaller cities.\n\nText 2: Remote work redistributes opportunity unevenly. The jobs that go remote are concentrated in a few well-paid fields, so a region without trained developers gains nothing at all.",
    },
    prompt: {
      en: "How would the author of Text 2 most likely respond to Text 1?",
    },
    choices: [
      { en: "By agreeing that remote work eliminates regional inequality." },
      {
        en: "By noting that the benefit only reaches places that already have qualified workers.",
      },
      { en: "By arguing that developers should move to Almaty after all." },
      { en: "By disputing that remote jobs pay well." },
    ],
    answer: 1,
    explanation: {
      en: "Text 2 accepts that remote work moves opportunity but adds a precondition — trained workers — which Text 1's example assumes. It never disputes pay.",
    },
  },

  // ---------------- RW · Expression of Ideas ----------------
  {
    id: "sat-rw-019",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Rhetorical synthesis",
    domain: "Expression of Ideas",
    difficulty: 3,
    passage: {
      en: "Notes: • Snow leopards live in the mountains of Central Asia. • Kazakhstan's population is estimated at 150–180 animals. • Camera traps recorded 12 individuals in Ile-Alatau park in 2023. • Numbers are hard to establish because the cats are solitary and range widely.",
    },
    prompt: {
      en: "The student wants to explain why the population figure is uncertain. Which choice best uses the notes to do that?",
    },
    choices: [
      { en: "Kazakhstan is home to an estimated 150–180 snow leopards." },
      {
        en: "Because snow leopards are solitary and range widely, counts such as Kazakhstan's estimated 150–180 remain approximate.",
      },
      { en: "Camera traps recorded 12 snow leopards in Ile-Alatau park in 2023." },
      { en: "Snow leopards live in the mountains of Central Asia, including Kazakhstan." },
    ],
    answer: 1,
    explanation: {
      en: "Only the second choice pairs the estimate with the reason it is imprecise, which is exactly the stated goal.",
    },
  },
  {
    id: "sat-rw-020",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Transitions",
    domain: "Expression of Ideas",
    difficulty: 2,
    prompt: {
      en: "Choose the best transition: “The alloy is light and cheap to produce. ____, it loses strength above 200 °C, which rules it out for engine parts.”",
    },
    choices: [{ en: "Consequently" }, { en: "For example" }, { en: "However" }, { en: "Indeed" }],
    answer: 2,
    explanation: {
      en: "The second sentence introduces a drawback that limits the advantages in the first, so a contrast transition is required.",
    },
  },

  // ---------------- RW · Standard English Conventions ----------------
  {
    id: "sat-rw-021",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Boundaries",
    domain: "Standard English Conventions",
    difficulty: 2,
    prompt: {
      en: "Which choice conforms to standard punctuation? “The trial lasted six weeks ____ the verdict took twenty minutes.”",
    },
    choices: [{ en: ", " }, { en: "; " }, { en: " " }, { en: ", and yet, " }],
    answer: 1,
    explanation: {
      en: "Two independent clauses need a semicolon (or a comma plus a conjunction). A comma alone is a splice, and no punctuation is a run-on.",
    },
  },
  {
    id: "sat-rw-022",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Form, structure and sense",
    domain: "Standard English Conventions",
    difficulty: 2,
    prompt: {
      en: "Which choice completes the sentence correctly? “Neither the coach nor the players ____ satisfied with the result.”",
    },
    choices: [{ en: "was" }, { en: "were" }, { en: "is" }, { en: "has been" }],
    answer: 1,
    explanation: {
      en: "With “neither … nor”, the verb agrees with the nearer subject — “players”, which is plural — so “were” is correct.",
    },
  },
];
