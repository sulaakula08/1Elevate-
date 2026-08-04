import type { Question } from "./types";

/** Second SAT batch. Same conventions as questions-sat.ts. */
export const SAT_QUESTIONS_2: Question[] = [
  // ---------------- Math ----------------
  {
    id: "sat-math-011",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Functions",
    difficulty: 2,
    prompt: { en: "If g(x) = 2x² − x, what is g(−3)?" },
    choices: [{ en: "15" }, { en: "18" }, { en: "21" }, { en: "−21" }],
    answer: 2,
    explanation: {
      en: "g(−3) = 2(−3)² − (−3) = 2 · 9 + 3 = 21. Squaring removes the sign; the second term flips to +3.",
      ru: "g(−3) = 2(−3)² − (−3) = 18 + 3 = 21. Квадрат убирает знак, а второй член становится +3.",
      kk: "g(−3) = 2(−3)² − (−3) = 18 + 3 = 21. Квадрат таңбаны жояды, екінші мүше +3 болады.",
    },
  },
  {
    id: "sat-math-012",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Inequalities",
    difficulty: 2,
    prompt: { en: "Which value of x satisfies −2x + 5 > 11?" },
    choices: [{ en: "−4" }, { en: "−3" }, { en: "0" }, { en: "3" }],
    answer: 0,
    explanation: {
      en: "−2x > 6, and dividing by a negative flips the sign: x < −3. Of the options only −4 is less than −3.",
      ru: "−2x > 6; при делении на отрицательное знак меняется: x < −3. Из вариантов только −4 меньше −3.",
      kk: "−2x > 6; теріс санға бөлгенде таңба ауысады: x < −3. Нұсқалардан тек −4 сәйкес.",
    },
  },
  {
    id: "sat-math-013",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Percentages",
    difficulty: 3,
    prompt: {
      en: "After a 20% discount a bag costs $48. What was the original price?",
    },
    choices: [{ en: "$56" }, { en: "$60" }, { en: "$62.40" }, { en: "$68" }],
    answer: 1,
    explanation: {
      en: "$48 is 80% of the original, so the original is 48 / 0.8 = $60. Adding 20% back to 48 gives the wrong answer.",
      ru: "48 — это 80% исходной цены, значит 48 / 0,8 = 60. Прибавить 20% к 48 — типичная ошибка.",
      kk: "48 — бастапқы бағаның 80%-ы, демек 48 / 0,8 = 60. 48-ге 20% қосу — жиі кездесетін қате.",
    },
  },
  {
    id: "sat-math-014",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Geometry — volume",
    difficulty: 2,
    prompt: {
      en: "A cube has edge length 4. What is its volume?",
    },
    choices: [{ en: "16" }, { en: "48" }, { en: "64" }, { en: "96" }],
    answer: 2,
    explanation: {
      en: "V = s³ = 4³ = 64. (96 is the surface area, 6s².)",
      ru: "V = s³ = 4³ = 64. (96 — это площадь поверхности, 6s².)",
      kk: "V = s³ = 4³ = 64. (96 — бет ауданы, 6s².)",
    },
  },
  {
    id: "sat-math-015",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Linear models",
    difficulty: 2,
    prompt: {
      en: "A gym charges a $30 joining fee plus $15 per month. Which equation gives the total cost C after m months?",
    },
    choices: [
      { en: "C = 15m" },
      { en: "C = 30m + 15" },
      { en: "C = 15m + 30" },
      { en: "C = 45m" },
    ],
    answer: 2,
    explanation: {
      en: "The per-month charge is the slope and the one-off fee is the intercept: C = 15m + 30.",
      ru: "Ежемесячная плата — коэффициент наклона, разовый взнос — свободный член: C = 15m + 30.",
      kk: "Айлық ақы — көлбеулік, бір реттік төлем — бос мүше: C = 15m + 30.",
    },
  },
  {
    id: "sat-math-016",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Statistics",
    difficulty: 3,
    prompt: {
      en: "The list 3, 7, 7, 9, 24 has which of the following properties?",
    },
    choices: [
      { en: "The mean is less than the median." },
      { en: "The mean equals the median." },
      { en: "The mean is greater than the median." },
      { en: "The list has no mode." },
    ],
    answer: 2,
    explanation: {
      en: "The median is 7 and the mean is 50/5 = 10, so the mean is greater — the outlier 24 pulls it up. The mode is 7.",
      ru: "Медиана 7, среднее 50/5 = 10, значит среднее больше — выброс 24 тянет его вверх. Мода равна 7.",
      kk: "Медиана 7, орташа 50/5 = 10, демек орташа үлкен — 24 шектен тыс мәні оны көтереді. Мода 7.",
    },
  },
  {
    id: "sat-math-017",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Absolute value",
    difficulty: 2,
    prompt: { en: "How many solutions does |2x + 1| = 7 have?" },
    choices: [{ en: "0" }, { en: "1" }, { en: "2" }, { en: "Infinitely many" }],
    answer: 2,
    explanation: {
      en: "2x + 1 = 7 gives x = 3, and 2x + 1 = −7 gives x = −4 — two solutions.",
      ru: "2x + 1 = 7 даёт x = 3, а 2x + 1 = −7 даёт x = −4 — два решения.",
      kk: "2x + 1 = 7 → x = 3, ал 2x + 1 = −7 → x = −4 — екі шешім.",
    },
  },

  // ---------------- Reading & Writing ----------------
  {
    id: "sat-rw-009",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Verb tense",
    difficulty: 2,
    prompt: {
      en: "Which choice completes the sentence correctly? “By the time the results ____ published, the team had already moved on to a new study.”",
    },
    choices: [{ en: "are" }, { en: "were" }, { en: "will be" }, { en: "have been" }],
    answer: 1,
    explanation: {
      en: "“had already moved” is past perfect, so the other clause needs simple past: “were published”.",
      ru: "«had already moved» — past perfect, поэтому вторая часть требует простого прошедшего: «were published».",
      kk: "«had already moved» — past perfect, сондықтан екінші бөлікте simple past керек: «were published».",
    },
  },
  {
    id: "sat-rw-010",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Apostrophes",
    difficulty: 2,
    prompt: {
      en: "Which choice is correct? “The ____ conclusions surprised even their supervisor.”",
    },
    choices: [
      { en: "researchers" },
      { en: "researcher's" },
      { en: "researchers'" },
      { en: "researchers's" },
    ],
    answer: 2,
    explanation: {
      en: "“their supervisor” signals more than one researcher, so use the plural possessive: researchers'.",
      ru: "«their supervisor» указывает на нескольких исследователей — нужен притяжательный падеж множественного числа: researchers'.",
      kk: "«their supervisor» бірнеше зерттеушіні білдіреді — көптік тәуелдік қажет: researchers'.",
    },
  },
  {
    id: "sat-rw-011",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Parallel structure",
    difficulty: 2,
    prompt: {
      en: "Which choice keeps the list parallel? “The internship involved drafting reports, analysing survey data, and ____ to clients.”",
    },
    choices: [
      { en: "presentations" },
      { en: "presenting findings" },
      { en: "to present findings" },
      { en: "she presented findings" },
    ],
    answer: 1,
    explanation: {
      en: "The first two items are -ing phrases (“drafting”, “analysing”), so the third must match: “presenting findings”.",
      ru: "Первые два элемента — формы на -ing («drafting», «analysing»), поэтому третий должен быть таким же: «presenting findings».",
      kk: "Алдыңғы екеуі -ing формасында («drafting», «analysing»), сондықтан үшіншісі де солай болуы керек.",
    },
  },
  {
    id: "sat-rw-012",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Rhetorical synthesis",
    difficulty: 3,
    passage: {
      en: "Notes: • Aral Sea lost about 90% of its volume since 1960. • Main cause: rivers diverted for cotton irrigation. • The North Aral partly recovered after the Kokaral dam (2005). • Local fishing has returned to some northern villages.",
    },
    prompt: {
      en: "The student wants to emphasise a positive development. Which choice best uses the notes to do that?",
    },
    choices: [
      {
        en: "Since 1960 the Aral Sea has lost roughly 90% of its volume, largely because its rivers were diverted for cotton.",
      },
      {
        en: "After the Kokaral dam was built in 2005, the North Aral partly recovered and fishing returned to some northern villages.",
      },
      { en: "Cotton irrigation diverted the rivers that once fed the Aral Sea." },
      { en: "The Aral Sea is one of the best-known environmental disasters in the world." },
    ],
    answer: 1,
    explanation: {
      en: "Only the dam-and-recovery note is a positive development; the others describe the loss or add a claim the notes don't support.",
      ru: "Только заметка о плотине и восстановлении — положительное развитие; остальные описывают потери или добавляют неподтверждённое утверждение.",
      kk: "Тек бөген мен қалпына келу туралы дерек — жағымды даму; қалғандары шығынды сипаттайды немесе дәлелденбеген тұжырым қосады.",
    },
  },
  {
    id: "sat-rw-013",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Words in context",
    difficulty: 2,
    passage: {
      en: "The committee's report did not reject the proposal outright; instead it raised so many procedural questions that the plan quietly stalled for two years.",
    },
    prompt: { en: "As used in the text, the committee's approach is best described as:" },
    choices: [{ en: "enthusiastic" }, { en: "obstructive" }, { en: "transparent" }, { en: "reckless" }],
    answer: 1,
    explanation: {
      en: "Raising questions until the plan stalls blocks it without an outright refusal — that is obstructive.",
      ru: "Задавать вопросы, пока план не заглохнет, — значит препятствовать без прямого отказа, то есть obstructive.",
      kk: "Жоспар тоқтағанша сұрақ қою — тікелей бас тартпай кедергі жасау, яғни obstructive.",
    },
  },
  {
    id: "sat-rw-014",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Transitions",
    difficulty: 2,
    prompt: {
      en: "Choose the best transition: “The dam raised water levels in the northern basin. ____, fish species that had vanished from the area began to reappear.”",
    },
    choices: [{ en: "Nevertheless" }, { en: "As a result" }, { en: "In contrast" }, { en: "Similarly" }],
    answer: 1,
    explanation: {
      en: "The second sentence is the consequence of the first, so a cause-and-effect transition is needed.",
      ru: "Второе предложение — следствие первого, поэтому нужен переход со значением причины-следствия.",
      kk: "Екінші сөйлем біріншінің салдары, сондықтан себеп-салдар байланысы қажет.",
    },
  },
];
