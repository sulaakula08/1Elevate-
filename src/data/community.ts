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
/**
 * `post` is an ordinary post: someone's words, with no structured block behind
 * them. It is the only type a person now picks, and they pick it by starting to
 * write rather than by choosing it.
 *
 * The other six describe a shape the product understands, and five of them are
 * on their way to being written by the app itself — progress from a mock result,
 * a study update from a finished session, an achievement from a real milestone.
 * They stay in the model, in the feed and in the filters; they have just left
 * the composer, because asking a student to tell the difference between "Explain
 * Something" and "Study Update" before they have written a word is asking them
 * to learn our schema.
 */
export type CommunityPostType =
  | "post"
  | "question"
  | "progress"
  | "achievement"
  | "explanation"
  | "study-update"
  | "resource";

export type CommunityAuthor = {
  /**
   * Account id, when the post came from the server. Absent on a post still
   * being written locally, and on any seeded content — so anything reading it
   * must treat "no id" as "not mine" rather than as a match.
   */
  id?: string;
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
  /**
   * The bank question this was asked about, when it came from Practice.
   *
   * Rides in the post's `payload` jsonb rather than a column, which needs no
   * migration and matches how `skill` is stored on custom_questions: nothing
   * queries it in SQL, it is read to build a link back to
   * /practice/<subject>/<id>. Absent on a question typed straight into the
   * composer, which is the honest default — there is no originating item.
   *
   * Deliberately not a foreign key. A post should survive the question being
   * deleted from the bank; the link simply stops resolving, and the post is still
   * a student asking for help with a problem quoted in full.
   */
  questionId?: string;
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
  /** Subtopic under the subject, e.g. "Systems of equations" — drawn from the
   *  same vocabulary as a question's `topic`, which admins now set when they
   *  write the item, so a post and a question read as one taxonomy. */
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
 * Demo feed content. Realistic Kazakhstani students and SAT numbers — the
 * interface is English-only (see lib/i18n.tsx), so post copy is written in
 * English even though the students themselves are from Kazakhstani schools.
 * Kept small (10 posts) and varied on purpose: this is what proves the card
 * architecture works before a real API ever has to fill it.
 */
export const COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: "cp-1",
    type: "question",
    author: author("Aruzhan S.", "NIS Astana · SAT 1480", "violet"),
    createdAt: now() - 0.2 * HOUR,
    exam: "sat",
    topic: "Systems of equations",
    text: "Working through a practice test and got stuck — logically it should be B, but the correct answer is D. Can someone explain?",
    question: {
      subjectId: "sat-math",
      prompt: "System of equations: 2x + 3y = 12 and 4x − y = 5. What is the value of x?",
      myAnswer: "B",
      correctAnswer: "D",
      explanationCount: 6,
    },
    reactions: { helpful: 9, congrats: 0 },
    comments: [
      {
        id: "cm-1a",
        author: author("Ali K.", "SAT 1510", "blue"),
        text: "Try substituting for x first — it removes one variable immediately.",
        createdAt: now() - 0.1 * HOUR,
      },
      {
        id: "cm-1b",
        author: author("Madi T.", "RFMS · SAT 1460", "teal"),
        text: "From the second equation, y = 4x − 5. Substitute that into the first one and you get x = 3.",
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
      mockLabel: "Mock Test #4",
    },
    reactions: { helpful: 0, congrats: 34 },
    comments: [
      {
        id: "cm-2a",
        author: author("Amina R.", "SAT 1520", "rose"),
        text: "Huge jump in a month! What did you change in your prep?",
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
      title: "30-Day Streak",
      detail: "Never missed a daily practice session this month.",
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
      title: "A faster way to solve SAT systems-of-equations questions",
      body: "Instead of solving by substitution, it's almost always faster to add or subtract the equations directly so one variable cancels out. That takes 20–30 seconds instead of a minute and a half.",
    },
    reactions: { helpful: 48, congrats: 0 },
    comments: [
      {
        id: "cm-4a",
        author: author("Erlan B.", "SAT 1390", "amber"),
        text: "That's exactly how I do it in the Advanced Math module — saves a lot of time.",
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
    author: author("Erlan B.", "SAT 1390", "amber"),
    createdAt: now() - 11 * HOUR,
    exam: "sat",
    topic: "Craft and structure",
    text: "In the passage about coral reef ecosystems, I don't get why the author adds a second quote in paragraph two — doesn't it contradict the first one?",
    question: {
      subjectId: "sat-rw",
      prompt: "What function does the second quotation in the second paragraph serve?",
      myAnswer: "A",
      correctAnswer: "C",
      explanationCount: 3,
    },
    reactions: { helpful: 4, congrats: 0 },
    comments: [
      {
        id: "cm-6a",
        author: author("Aruzhan S.", "NIS Astana · SAT 1480", "violet"),
        text: "That's a classic Craft and Structure move — the second quote shows the complexity of the topic, it isn't there to disprove the first.",
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
      title: "1500+ Club",
      startScore: 1320,
      currentScore: 1510,
    },
    reactions: { helpful: 0, congrats: 41 },
    comments: [
      {
        id: "cm-7a",
        author: author("Dias N.", "Nazarbayev Intellectual School", "blue"),
        text: "+190 points is incredible, congrats!",
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
      title: "My punctuation cheat sheet for Standard English Conventions",
      note: "Collected every rule about commas, semicolons and dashes that shows up most often on the SAT — all on one page.",
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
      mockLabel: "Mock Test #6",
    },
    reactions: { helpful: 0, congrats: 28 },
    comments: [],
  },
  {
    id: "cp-10",
    type: "study-update",
    author: author("Erlan B.", "SAT 1390", "amber"),
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


