/**
 * Content text. The product is English-only — the wrapper object stays so item
 * records keep one consistent shape for prompts, choices and explanations.
 */
export type LocalizedText = { en: string };

/** The product is SAT-only. Kept as a union so exam-scoped code stays explicit. */
export type ExamId = "sat";

export type Difficulty = 1 | 2 | 3;

/**
 * An image belonging to a question.
 *
 * `src` is whatever an <img> can load: a public storage URL for an upload, or a
 * data URI for a small inline SVG. Kept as one string rather than a storage path
 * plus a bucket, so a figure can also come from somewhere else entirely — a
 * College Board practice figure an admin links, say — without a second code path.
 */
export type QuestionFigure = {
  src: string;
  /** What the figure shows, in words. Required — see `Question.figure`. */
  alt: string;
};

export type Question = {
  id: string;
  exam: ExamId;
  subjectId: string;
  topic: string;
  /**
   * Official content domain the item is written against — the four SAT domains
   * (Information and Ideas, Craft and Structure, Expression of Ideas, Standard
   * English Conventions, Algebra, Advanced Math, Problem-Solving and Data
   * Analysis, Geometry and Trigonometry).
   */
  domain?: string;
  /**
   * The specific thing being tested, one level finer than `topic` — "Systems of
   * equations" is a topic, "solving by substitution" is a skill. Optional: a
   * question is usable without one, and the bank predates the field.
   */
  skill?: string;
  /**
   * The model that drafted this question, when one did. Absent for anything a
   * person wrote, which is the useful default: provenance is only interesting
   * where it is not a human, and an absent field cannot be mistaken for a claim.
   */
  generatedBy?: string;
  difficulty: Difficulty;
  /** Optional reading passage / shared stimulus shown above the prompt. */
  passage?: LocalizedText;
  /**
   * A diagram, graph, table or figure the question depends on.
   *
   * Text cannot carry a scatterplot. Roughly a fifth of real SAT Math items and
   * most Problem-Solving and Data Analysis items are built on one, so a bank
   * without figures cannot hold a representative test however many items it has.
   *
   * `alt` is required rather than optional, and not for form's sake: it is what a
   * screen reader announces, what the AI tutor is given instead of the picture,
   * and what tells an admin what they are looking at in a list. A figure with no
   * description is a question some students cannot answer at all.
   */
  figure?: QuestionFigure;
  prompt: LocalizedText;
  choices: LocalizedText[];
  /**
   * Index into `choices`.
   *
   * Optional because of where questions come from. An admin writing one always
   * has it, and so does anything reading the bank server-side — but a student's
   * browser is deliberately never sent it until they submit a choice and the
   * server grades it (see `lib/questions/server.ts` and the `check_answer`
   * function in the question-bank migration). So on the client this is `number`
   * once a question has been graded and `undefined` before that, and the type
   * has to say so or every reveal path would be silently reading a field that
   * is not there.
   */
  answer?: number;
  /** The worked solution. Absent until graded, for the same reason as `answer`. */
  explanation?: LocalizedText;
  /** True for questions created in the admin editor (stored in the browser). */
  custom?: boolean;
  /**
   * A draft being tried out on this device and nowhere else.
   *
   * Set only by the generator's "keep locally" path. Nothing writes it to the
   * database — the flag exists so every surface that shows a question can say
   * plainly that this one is not in the bank, and so the drafts can be told
   * apart from real items when it is time to clear them out.
   */
  local?: boolean;
  /**
   * Provenance for the admin dashboard: who wrote the item and when. Both come
   * from the database and are absent on seed questions, so treat them as
   * display-only — nothing schedules or scores on them.
   */
  authorEmail?: string;
  createdAt?: number;
};

/**
 * A question with its answer attached — what an author writes, and what the
 * server reads out of the bank.
 *
 * The editor, the generator and the grading path all genuinely have these two
 * fields and would rather not guard on them, so they say so in their types. This
 * is the shape `Question` had before the bank was closed; the optionality on
 * `Question` exists for the delivered copy, not for the authored one.
 */
export type AuthoredQuestion = Question & {
  answer: number;
  explanation: LocalizedText;
};

/**
 * The taxonomy half of a question: what it is about, never what it says.
 *
 * This is what a student's browser is allowed to hold for the whole bank, and it
 * is enough for every screen that reasons about the bank in aggregate — the
 * practice browser and its filters, the review queue, the progress charts, mock
 * assembly. None of those read a prompt; they count and group by these labels,
 * and the labels are already public in `data/taxonomy.ts`.
 *
 * Question content is fetched separately, by id, for the handful of questions
 * actually on screen. See `useQuestionBodies` in `lib/app-state.tsx`.
 */
export type QuestionIndexEntry = Pick<
  Question,
  "id" | "exam" | "subjectId" | "topic" | "domain" | "skill" | "difficulty"
> & {
  createdAt?: number;
};

/** Named hue, resolved to `--s-<name>` CSS variables. */
export type SubjectColor =
  | "violet"
  | "blue"
  | "indigo"
  | "cyan"
  | "green"
  | "teal"
  | "amber"
  | "orange"
  | "rose";

export type Subject = {
  id: string;
  exam: ExamId;
  name: LocalizedText;
  color: SubjectColor;
  /** One to four characters used as the subject's monogram. */
  glyph: string;
};

export type ExamSection = {
  subjectId: string;
  /** Questions drawn for this section in a mock test. */
  count: number;
  minutes: number;
  /** Each SAT section runs as two modules of the same subject. */
  module: number;
};

export type ExamBlueprint = {
  exam: ExamId;
  name: LocalizedText;
  description: LocalizedText;
  /** Score scale endpoints, per the official format. */
  maxScore: number;
  minScore: number;
  /** The modules every test-taker sees, in order. */
  sections: ExamSection[];
};
