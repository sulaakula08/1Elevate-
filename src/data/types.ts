/**
 * Content text. The product is English-only — the wrapper object stays so item
 * records keep one consistent shape for prompts, choices and explanations.
 */
export type LocalizedText = { en: string };

/** The product is SAT-only. Kept as a union so exam-scoped code stays explicit. */
export type ExamId = "sat";

export type Difficulty = 1 | 2 | 3;

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
  prompt: LocalizedText;
  choices: LocalizedText[];
  /** Index into `choices`. */
  answer: number;
  explanation: LocalizedText;
  /** True for questions created in the admin editor (stored in the browser). */
  custom?: boolean;
  /**
   * Provenance for the admin dashboard: who wrote the item and when. Both come
   * from the database and are absent on seed questions, so treat them as
   * display-only — nothing schedules or scores on them.
   */
  authorEmail?: string;
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
