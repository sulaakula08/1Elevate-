import type { ExamId } from "./types";

/**
 * Community post model. Every post carries a small, typed payload for its
 * `type` and leaves the rest undefined — the alternative (one flat post shape
 * with every field optional and no link between them) would let a "question"
 * post carry `scoreData` by accident. Reaction counts and comments are seed
 * baselines: the current student's own reaction/save/comment is layered on
 * top at render time (see `lib/community-state.tsx`), so this file stays pure
 * demo content that a real API response could replace field-for-field.
 */
export type CommunityPostType =
  | "question"
  | "progress"
  | "achievement"
  | "explanation"
  | "study-update"
  | "resource";

export type CommunityAuthor = {
  name: string;
  /** School, cohort or "SAT 1480" — one short line of context under the name. */
  context?: string;
  /** Two-letter monogram; falls back to deriving one from `name`. */
  initials?: string;
  /** Picks the avatar tone from the subject palette, so authors read as distinct people. */
  colorSeed: string;
};

export type CommunityComment = {
  id: string;
  author: CommunityAuthor;
  text: string;
  createdAt: number;
};

export type CommunityReactionKind = "helpful" | "congrats";

export type CommunityReactionCounts = {
  helpful: number;
  congrats: number;
};

export type QuestionPostData = {
  subjectId: string;
  prompt: string;
  /** Letter the student picked, e.g. "B". */
  myAnswer?: string;
  /** Letter that turned out to be correct, e.g. "D". */
  correctAnswer?: string;
  /** Number of explanations/answers offered by the community. */
  explanationCount: number;
};

export type ProgressPostData = {
  fromScore: number;
  toScore: number;
  mathScore?: number;
  readingWritingScore?: number;
  mockLabel?: string;
};

export type AchievementPostData = {
  emoji: string;
  title: string;
  detail?: string;
  startScore?: number;
  currentScore?: number;
};

export type ExplanationPostData = {
  subjectId: string;
  title: string;
  body: string;
};

export type StudyUpdatePostData = {
  subjectId: string;
  questionsCompleted: number;
  accuracy: number;
  accuracyDelta?: number;
};

export type ResourcePostData = {
  title: string;
  note: string;
  subjectId?: string;
};

export type CommunityPost = {
  id: string;
  type: CommunityPostType;
  author: CommunityAuthor;
  createdAt: number;
  exam: ExamId;
  /** Subtopic under the subject, e.g. "Systems of equations" — matches the
   *  question bank's topic taxonomy (see data/questions-sat*.ts) so the two
   *  read as one vocabulary. */
  topic?: string;
  /** Free-text body every post type may add below its structured content. */
  text?: string;
  question?: QuestionPostData;
  progress?: ProgressPostData;
  achievement?: AchievementPostData;
  explanation?: ExplanationPostData;
  studyUpdate?: StudyUpdatePostData;
  resource?: ResourcePostData;
  reactions: CommunityReactionCounts;
  comments: CommunityComment[];
  /** True once this post has been through the composer this session (local, not seeded). */
  isLocal?: boolean;
};

const HOUR = 3_600_000;
const now = () => Date.now();

function author(name: string, context: string, colorSeed: string): CommunityAuthor {
  return { name, context, colorSeed };
}

/**
 * Demo feed content. Realistic Kazakhstani students and SAT numbers, written
 * in Russian to match the interface — see UI_LANG in lib/i18n.tsx. Kept small
 * (10 posts) and varied on purpose: this is what proves the card architecture
 * works before a real API ever has to fill it.
 */
export const COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: "cp-1",
    type: "question",
    author: author("Aruzhan S.", "NIS Astana · SAT 1480", "violet"),
    createdAt: now() - 0.2 * HOUR,
    exam: "sat",
    topic: "Systems of equations",
    text: "Разбирала пробник и застряла — по логике должно быть B, но правильный ответ D. Кто-то может объяснить?",
    question: {
      subjectId: "sat-math",
      prompt:
        "Система уравнений: 2x + 3y = 12 и 4x − y = 5. Чему равно значение x?",
      myAnswer: "B",
      correctAnswer: "D",
      explanationCount: 6,
    },
    reactions: { helpful: 9, congrats: 0 },
    comments: [
      {
        id: "cm-1a",
        author: author("Ali K.", "SAT 1510", "blue"),
        text: "Попробуй сначала подставить x — так сразу уходит одна переменная.",
        createdAt: now() - 0.1 * HOUR,
      },
      {
        id: "cm-1b",
        author: author("Madi T.", "RFMS · SAT 1460", "teal"),
        text: "Из второго уравнения y = 4x − 5, подставляешь в первое — получаешь x = 3.",
        createdAt: now() - 0.05 * HOUR,
      },
    ],
  },
  {
    id: "cp-2",
    type: "progress",
    author: author("Dias N.", "Nazarbayev Intellectual School", "blue"),
    createdAt: now() - 3 * HOUR,
    exam: "sat",
    progress: {
      fromScore: 1430,
      toScore: 1480,
      mathScore: 770,
      readingWritingScore: 710,
      mockLabel: "Пробный тест №4",
    },
    reactions: { helpful: 0, congrats: 34 },
    comments: [
      {
        id: "cm-2a",
        author: author("Amina R.", "SAT 1520", "rose"),
        text: "Отличный рывок за месяц! Что поменял в подготовке?",
        createdAt: now() - 2.5 * HOUR,
      },
    ],
  },
  {
    id: "cp-3",
    type: "achievement",
    author: author("Amina R.", "SAT 1520", "rose"),
    createdAt: now() - 5 * HOUR,
    exam: "sat",
    achievement: {
      emoji: "🔥",
      title: "30 дней подряд",
      detail: "Ни разу не пропустила ежедневную практику за месяц.",
    },
    reactions: { helpful: 0, congrats: 21 },
    comments: [],
  },
  {
    id: "cp-4",
    type: "explanation",
    author: author("Madi T.", "RFMS · SAT 1460", "teal"),
    createdAt: now() - 7 * HOUR,
    exam: "sat",
    topic: "Systems of equations",
    explanation: {
      subjectId: "sat-math",
      title: "Быстрый способ решать системы уравнений на SAT",
      body: "Почти всегда быстрее не решать через подстановку, а сразу сложить или вычесть уравнения так, чтобы одна переменная сократилась. На это уходит 20–30 секунд вместо полутора минут.",
    },
    reactions: { helpful: 48, congrats: 0 },
    comments: [
      {
        id: "cm-4a",
        author: author("Ерлан Б.", "SAT 1390", "amber"),
        text: "Именно так и делаю в модуле Advanced Math, экономит время.",
        createdAt: now() - 6 * HOUR,
      },
    ],
  },
  {
    id: "cp-5",
    type: "study-update",
    author: author("Amina R.", "SAT 1520", "rose"),
    createdAt: now() - 9 * HOUR,
    exam: "sat",
    topic: "Advanced Math",
    studyUpdate: {
      subjectId: "sat-math",
      questionsCompleted: 25,
      accuracy: 0.88,
      accuracyDelta: 0.07,
    },
    reactions: { helpful: 5, congrats: 0 },
    comments: [],
  },
  {
    id: "cp-6",
    type: "question",
    author: author("Ерлан Б.", "SAT 1390", "amber"),
    createdAt: now() - 11 * HOUR,
    exam: "sat",
    topic: "Craft and structure",
    text: "В отрывке про экосистему коралловых рифов не понимаю, зачем автор вставляет вторую цитату — она вроде противоречит первой?",
    question: {
      subjectId: "sat-rw",
      prompt:
        "Какую функцию выполняет вторая цитата во втором абзаце отрывка?",
      myAnswer: "A",
      correctAnswer: "C",
      explanationCount: 3,
    },
    reactions: { helpful: 4, congrats: 0 },
    comments: [
      {
        id: "cm-6a",
        author: author("Aruzhan S.", "NIS Astana · SAT 1480", "violet"),
        text: "Это классический приём Craft and Structure — вторая цитата нужна, чтобы показать сложность темы, а не опровергнуть первую.",
        createdAt: now() - 10 * HOUR,
      },
    ],
  },
  {
    id: "cp-7",
    type: "achievement",
    author: author("Ali K.", "SAT 1510", "blue"),
    createdAt: now() - 14 * HOUR,
    exam: "sat",
    achievement: {
      emoji: "🏆",
      title: "Клуб 1500+",
      startScore: 1320,
      currentScore: 1510,
    },
    reactions: { helpful: 0, congrats: 41 },
    comments: [
      {
        id: "cm-7a",
        author: author("Dias N.", "Nazarbayev Intellectual School", "blue"),
        text: "+190 баллов — это невероятно, поздравляю!",
        createdAt: now() - 13 * HOUR,
      },
    ],
  },
  {
    id: "cp-8",
    type: "resource",
    author: author("Aisha M.", "SAT 1500", "indigo"),
    createdAt: now() - 18 * HOUR,
    exam: "sat",
    topic: "Punctuation",
    resource: {
      title: "Мой конспект по пунктуации для Standard English Conventions",
      note: "Собрала все правила про запятые, точки с запятой и тире, которые чаще всего спрашивают на SAT — на одной странице.",
      subjectId: "sat-rw",
    },
    reactions: { helpful: 17, congrats: 0 },
    comments: [],
  },
  {
    id: "cp-9",
    type: "progress",
    author: author("Madi T.", "RFMS · SAT 1460", "teal"),
    createdAt: now() - 22 * HOUR,
    exam: "sat",
    progress: {
      fromScore: 1290,
      toScore: 1460,
      mathScore: 740,
      readingWritingScore: 720,
      mockLabel: "Пробный тест №6",
    },
    reactions: { helpful: 0, congrats: 28 },
    comments: [],
  },
  {
    id: "cp-10",
    type: "study-update",
    author: author("Ерлан Б.", "SAT 1390", "amber"),
    createdAt: now() - 26 * HOUR,
    exam: "sat",
    topic: "Command of evidence",
    studyUpdate: {
      subjectId: "sat-rw",
      questionsCompleted: 18,
      accuracy: 0.72,
      accuracyDelta: -0.03,
    },
    reactions: { helpful: 2, congrats: 0 },
    comments: [],
  },
];

/** Static demo modules for the right sidebar — see CommunitySidebar. */
export const WEEKLY_LEADERS: { name: string; xp: number }[] = [
  { name: "Aisha M.", xp: 2840 },
  { name: "Dias N.", xp: 2510 },
  { name: "Aruzhan S.", xp: 2320 },
];

export const WEEKLY_CHALLENGE = {
  title: "SAT Math Sprint",
  description: "Решите 100 вопросов на этой неделе",
  current: 64,
  target: 100,
};

export const TRENDING_TAGS = ["#SATMath", "#1500Club", "#AugustSAT"];
