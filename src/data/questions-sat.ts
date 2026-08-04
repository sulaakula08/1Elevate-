import type { Question } from "./types";

/**
 * Seed SAT bank. Prompts are English-only on purpose — the real SAT is taken in
 * English — while the interface itself stays trilingual. Explanations carry
 * ru/kk translations where they help a Kazakhstani student most.
 */
export const SAT_QUESTIONS: Question[] = [
  // ---------------- Math ----------------
  {
    id: "sat-math-001",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Linear equations",
    difficulty: 1,
    prompt: { en: "If 3x + 7 = 22, what is the value of x?" },
    choices: [{ en: "3" }, { en: "5" }, { en: "7" }, { en: "15" }],
    answer: 1,
    explanation: {
      en: "Subtract 7 from both sides: 3x = 15. Divide by 3: x = 5.",
      ru: "Вычитаем 7: 3x = 15. Делим на 3: x = 5.",
      kk: "Екі жақтан 7 шығарамыз: 3x = 15. 3-ке бөлеміз: x = 5.",
    },
  },
  {
    id: "sat-math-002",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Slope and lines",
    difficulty: 1,
    prompt: {
      en: "A line passes through the points (2, 3) and (6, 11). What is its slope?",
    },
    choices: [{ en: "1/2" }, { en: "2" }, { en: "4" }, { en: "8" }],
    answer: 1,
    explanation: {
      en: "Slope = (11 − 3) / (6 − 2) = 8 / 4 = 2.",
      ru: "Наклон = (11 − 3) / (6 − 2) = 8 / 4 = 2.",
      kk: "Көлбеулік = (11 − 3) / (6 − 2) = 8 / 4 = 2.",
    },
  },
  {
    id: "sat-math-003",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Percentages",
    difficulty: 1,
    prompt: {
      en: "A jacket costs $80. The store raises the price by 15%. What is the new price?",
    },
    choices: [{ en: "$88" }, { en: "$92" }, { en: "$95" }, { en: "$120" }],
    answer: 1,
    explanation: {
      en: "15% of 80 is 12, so the new price is 80 + 12 = 92.",
      ru: "15% от 80 — это 12, значит новая цена 80 + 12 = 92.",
      kk: "80-нің 15%-ы 12, сондықтан жаңа баға 80 + 12 = 92.",
    },
  },
  {
    id: "sat-math-004",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Systems of equations",
    difficulty: 2,
    prompt: { en: "If x + y = 10 and x − y = 4, what is the value of x?" },
    choices: [{ en: "3" }, { en: "5" }, { en: "6" }, { en: "7" }],
    answer: 3,
    explanation: {
      en: "Add the two equations: 2x = 14, so x = 7 (and y = 3).",
      ru: "Сложим уравнения: 2x = 14, значит x = 7 (а y = 3).",
      kk: "Теңдеулерді қосамыз: 2x = 14, демек x = 7 (y = 3).",
    },
  },
  {
    id: "sat-math-005",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Quadratics",
    difficulty: 2,
    prompt: {
      en: "What is the sum of the solutions of x² − 5x + 6 = 0?",
    },
    choices: [{ en: "−5" }, { en: "1" }, { en: "5" }, { en: "6" }],
    answer: 2,
    explanation: {
      en: "It factors as (x − 2)(x − 3) = 0, so the roots are 2 and 3 and their sum is 5. (Shortcut: sum of roots = −b/a = 5.)",
      ru: "Разложение: (x − 2)(x − 3) = 0, корни 2 и 3, сумма 5. Быстрый способ: сумма корней = −b/a = 5.",
      kk: "Көбейткіштерге жіктеу: (x − 2)(x − 3) = 0, түбірлері 2 және 3, қосындысы 5. Жылдам жол: −b/a = 5.",
    },
  },
  {
    id: "sat-math-006",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Exponential functions",
    difficulty: 2,
    prompt: { en: "If f(x) = 3 · 2ˣ, what is f(4)?" },
    choices: [{ en: "24" }, { en: "36" }, { en: "48" }, { en: "81" }],
    answer: 2,
    explanation: {
      en: "2⁴ = 16, and 3 · 16 = 48. Note the exponent applies only to 2, not to 3.",
      ru: "2⁴ = 16, и 3 · 16 = 48. Степень относится только к 2, а не к 3.",
      kk: "2⁴ = 16, сонда 3 · 16 = 48. Дәреже тек 2-ге қатысты, 3-ке емес.",
    },
  },
  {
    id: "sat-math-007",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Geometry — circles",
    difficulty: 2,
    prompt: {
      en: "A circle has area 36π. What is its circumference?",
    },
    choices: [{ en: "6π" }, { en: "12π" }, { en: "18π" }, { en: "36π" }],
    answer: 1,
    explanation: {
      en: "From πr² = 36π we get r = 6, so the circumference is 2πr = 12π.",
      ru: "Из πr² = 36π следует r = 6, значит длина окружности 2πr = 12π.",
      kk: "πr² = 36π болғандықтан r = 6, сондықтан шеңбер ұзындығы 2πr = 12π.",
    },
  },
  {
    id: "sat-math-008",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Statistics",
    difficulty: 1,
    prompt: {
      en: "The mean of the three numbers 4, 8, and x is 7. What is x?",
    },
    choices: [{ en: "7" }, { en: "9" }, { en: "12" }, { en: "21" }],
    answer: 1,
    explanation: {
      en: "The three numbers must total 3 × 7 = 21. Since 4 + 8 = 12, x = 9.",
      ru: "Сумма трёх чисел равна 3 × 7 = 21. Так как 4 + 8 = 12, то x = 9.",
      kk: "Үш санның қосындысы 3 × 7 = 21. 4 + 8 = 12 болғандықтан x = 9.",
    },
  },
  {
    id: "sat-math-009",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Ratios and rates",
    difficulty: 2,
    prompt: {
      en: "A printer produces 45 pages in 3 minutes. At this rate, how many pages does it produce in 8 minutes?",
    },
    choices: [{ en: "90" }, { en: "105" }, { en: "120" }, { en: "135" }],
    answer: 2,
    explanation: {
      en: "The rate is 45 / 3 = 15 pages per minute, so 15 × 8 = 120 pages.",
      ru: "Скорость 45 / 3 = 15 страниц в минуту, значит 15 × 8 = 120 страниц.",
      kk: "Жылдамдық 45 / 3 = 15 бет/мин, демек 15 × 8 = 120 бет.",
    },
  },
  {
    id: "sat-math-010",
    exam: "sat",
    subjectId: "sat-math",
    topic: "Geometry — triangles",
    difficulty: 2,
    prompt: {
      en: "In a right triangle the two legs measure 6 and 8. What is the length of the hypotenuse?",
    },
    choices: [{ en: "10" }, { en: "12" }, { en: "14" }, { en: "48" }],
    answer: 0,
    explanation: {
      en: "6² + 8² = 36 + 64 = 100, so the hypotenuse is √100 = 10.",
      ru: "6² + 8² = 36 + 64 = 100, значит гипотенуза √100 = 10.",
      kk: "6² + 8² = 36 + 64 = 100, демек гипотенуза √100 = 10.",
    },
  },

  // ---------------- Reading & Writing ----------------
  {
    id: "sat-rw-001",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Transitions",
    difficulty: 1,
    prompt: {
      en: "Choose the best transition: “The new bridge cut travel time in half. ____, it cost far more than the city had budgeted.”",
    },
    choices: [
      { en: "Therefore" },
      { en: "However" },
      { en: "Likewise" },
      { en: "For instance" },
    ],
    answer: 1,
    explanation: {
      en: "The second sentence contrasts a drawback with the benefit in the first, so a contrast transition (“However”) is needed.",
      ru: "Второе предложение противопоставляет недостаток преимуществу, поэтому нужен противительный переход — “However”.",
      kk: "Екінші сөйлем бірінші сөйлемдегі артықшылыққа қарама-қарсы кемшілікті береді, сондықтан “However” қажет.",
    },
  },
  {
    id: "sat-rw-002",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Subject–verb agreement",
    difficulty: 1,
    prompt: {
      en: "Which choice makes the sentence conform to standard English? “The collection of rare manuscripts ____ housed in the university archive.”",
    },
    choices: [{ en: "are" }, { en: "is" }, { en: "were" }, { en: "have been" }],
    answer: 1,
    explanation: {
      en: "The subject is the singular noun “collection”, not “manuscripts”, so the singular verb “is” is correct.",
      ru: "Подлежащее — единственное число “collection”, а не “manuscripts”, поэтому нужен глагол “is”.",
      kk: "Бастауыш — жекеше “collection”, “manuscripts” емес, сондықтан “is” дұрыс.",
    },
  },
  {
    id: "sat-rw-003",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Words in context",
    difficulty: 2,
    passage: {
      en: "Rather than sketching quickly and revising later, Aitmatova worked slowly, verifying every measurement before committing a single line to the page.",
    },
    prompt: {
      en: "Which word best describes Aitmatova's method as described in the text?",
    },
    choices: [
      { en: "meticulous" },
      { en: "impulsive" },
      { en: "derivative" },
      { en: "indifferent" },
    ],
    answer: 0,
    explanation: {
      en: "Working slowly and verifying every measurement is the definition of meticulous — extremely careful about detail.",
      ru: "Медленная работа и проверка каждого измерения — это и есть “meticulous” (крайне тщательный).",
      kk: "Асықпай жұмыс істеп, әр өлшемді тексеру — “meticulous”, яғни аса мұқият дегенді білдіреді.",
    },
  },
  {
    id: "sat-rw-004",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Central ideas",
    difficulty: 2,
    passage: {
      en: "Urban beekeepers once worried that city hives would starve. In practice, city bees often outproduce rural ones: parks, balconies, and roadside verges bloom in staggered waves from March to October, while a single-crop farm offers a brief flood of nectar and then nothing at all.",
    },
    prompt: { en: "What is the main idea of the text?" },
    choices: [
      { en: "Rural beekeeping is in decline across most regions." },
      {
        en: "City environments can supply bees with a longer, steadier bloom than farmland does.",
      },
      { en: "Beekeepers should plant more single-crop fields." },
      { en: "Bees prefer parks to balconies when both are available." },
    ],
    answer: 1,
    explanation: {
      en: "The passage contrasts the staggered, months-long city bloom with farmland's short burst. The other options add claims the text never makes.",
      ru: "Текст сравнивает растянутое городское цветение с коротким периодом на монокультурном поле. Остальные варианты в тексте не утверждаются.",
      kk: "Мәтін қаладағы ұзақ гүлдеуді монодақыл егістігіндегі қысқа кезеңмен салыстырады. Қалған нұсқалар мәтінде айтылмайды.",
    },
  },
  {
    id: "sat-rw-005",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Punctuation",
    difficulty: 2,
    prompt: {
      en: "Which choice completes the sentence so that it conforms to standard English punctuation? “The expedition needed one thing above all ____ fresh water.”",
    },
    choices: [{ en: "else," }, { en: "else:" }, { en: "else;" }, { en: "else" }],
    answer: 1,
    explanation: {
      en: "A colon introduces the specific item that the complete clause before it has pointed to. A semicolon would wrongly imply a second independent clause.",
      ru: "Двоеточие вводит конкретный элемент после законченной части предложения. Точка с запятой требовала бы второго независимого предложения.",
      kk: "Қос нүкте толық сөйлемнен кейін нақты элементті енгізеді. Нүктелі үтір екінші тәуелсіз сөйлемді талап етеді.",
    },
  },
  {
    id: "sat-rw-006",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Modifiers",
    difficulty: 3,
    prompt: {
      en: "Which choice is free of a dangling modifier?",
    },
    choices: [
      { en: "Walking through the museum, the sculptures seemed enormous." },
      { en: "Walking through the museum, we found the sculptures enormous." },
      { en: "Walking through the museum, enormous sculptures were everywhere." },
      { en: "Walking through the museum, it was enormous sculptures." },
    ],
    answer: 1,
    explanation: {
      en: "The opening phrase describes whoever is walking, so the subject right after the comma must be a person — “we”. In the other options the sculptures appear to be doing the walking.",
      ru: "Вводный оборот описывает того, кто идёт, поэтому после запятой должно стоять лицо — “we”. В остальных вариантах получается, что идут скульптуры.",
      kk: "Кіріспе орам жүрген адамды сипаттайды, сондықтан үтірден кейін адам — “we” тұруы керек. Басқа нұсқаларда мүсіндер жүріп жатқан болып шығады.",
    },
  },
  {
    id: "sat-rw-007",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Command of evidence",
    difficulty: 3,
    passage: {
      en: "A researcher claims that library reading rooms improve exam scores mainly by removing distractions rather than by providing access to books.",
    },
    prompt: {
      en: "Which finding, if true, would most strongly support the researcher's claim?",
    },
    choices: [
      {
        en: "Students who study in silent rooms with no books score as well as those who study in the library.",
      },
      { en: "Libraries with more books attract more visitors." },
      { en: "Students report enjoying the library atmosphere." },
      { en: "Exam scores have risen nationally over the past decade." },
    ],
    answer: 0,
    explanation: {
      en: "Isolating the variable — silence without books producing the same benefit — is what shows distraction removal, not book access, is the active ingredient.",
      ru: "Нужно изолировать переменную: если тишина без книг даёт тот же результат, значит работает именно отсутствие отвлечений.",
      kk: "Айнымалыны оқшаулау керек: кітапсыз тыныштық та сол нәтиже берсе, себебі — кедергілердің болмауы.",
    },
  },
  {
    id: "sat-rw-008",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "Pronouns",
    difficulty: 2,
    prompt: {
      en: "Which choice corrects the pronoun error? “Every applicant must submit their own transcript, and they must sign it themselves.”",
    },
    choices: [
      { en: "No change is needed." },
      { en: "Applicants must submit their own transcripts and sign them themselves." },
      { en: "Every applicant must submit his own transcript, and they must sign it." },
      { en: "Every applicant must submit their own transcript, and it must sign itself." },
    ],
    answer: 1,
    explanation: {
      en: "Making the subject plural (“Applicants”) keeps agreement with the plural pronouns consistently, which the SAT prefers to a singular/plural mix.",
      ru: "Множественное подлежащее “Applicants” согласуется с местоимениями во множественном числе — SAT предпочитает такой вариант.",
      kk: "Көптік бастауыш “Applicants” көптік есімдіктермен үйлеседі — SAT осы нұсқаны қалайды.",
    },
  },
];
