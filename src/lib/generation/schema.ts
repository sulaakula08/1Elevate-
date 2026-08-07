/**
 * The contract between the generation route and everything that consumes it.
 *
 * Nothing produced by a model is trusted on either side of the wire: the route
 * validates what the model wrote, and the browser validates again what the route
 * returned. Anything that fails is discarded, never coerced — a question with a
 * wrong answer index is worse for a student than a shorter test.
 */

import { getSubject } from "@/data/exams";
import type { Difficulty, LocalizedText, Question } from "@/data/types";

/** Items per request. Small batches keep a single wait bearable and let the UI show progress. */
export const MAX_BATCH = 8;
export const MIN_CHOICES = 2;
export const MAX_CHOICES = 6;
/** Context the route forwards to the model, capped so a request stays small. */
export const MAX_TOPICS = 40;
export const MAX_AVOID = 80;

export type LevelRequest = { difficulty: Difficulty; count: number };

export type GenerateRequest = {
  subjectId: string;
  /** The difficulty mix the bank is short of. */
  wanted: LevelRequest[];
  /** Topics already in the bank, so generated items stay on the same syllabus. */
  topics: string[];
  /** Official content domains already in the bank. */
  domains: string[];
  /** Prompts already in the bank; the model is told not to write them again. */
  avoid: string[];
};

export type GenerateResponse = {
  questions: Question[];
  /** Model that wrote them, recorded as provenance. */
  model: string;
  /** Drafts thrown away for failing validation or duplicating an existing prompt. */
  rejected: number;
};

export type GenerateErrorCode = "no-key" | "bad-request" | "upstream";

export type GenerateErrorBody = { error: string; code: GenerateErrorCode };

/* ---------------- validation ---------------- */

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function difficultyOf(value: unknown): Difficulty | null {
  return value === 1 || value === 2 || value === 3 ? value : null;
}

/** Compares prompts by their words alone, so punctuation or casing can't hide a repeat. */
export function normalizePrompt(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function localizedText(value: unknown): LocalizedText | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const en = text(record.en);
  if (!en) return null;
  const ru = text(record.ru);
  const kk = text(record.kk);
  return { en, ...(ru ? { ru } : {}), ...(kk ? { kk } : {}) };
}

/** Flat shape the model is asked for — one language per field, no nesting to get wrong. */
export type QuestionDraft = {
  topic?: unknown;
  domain?: unknown;
  difficulty?: unknown;
  passage?: unknown;
  prompt?: unknown;
  choices?: unknown;
  answer?: unknown;
  explanation?: unknown;
};

type Shared = {
  topic: string;
  domain: string;
  difficulty: Difficulty;
  choices: LocalizedText[];
  answer: number;
};

/** The rules both validators share, so the two sides of the wire can't drift apart. */
function checkShared(
  topic: string | null,
  domain: string | null,
  difficulty: Difficulty | null,
  choices: LocalizedText[] | null,
  answer: unknown,
): Shared | null {
  if (!topic || !domain || !difficulty || !choices) return null;
  if (choices.length < MIN_CHOICES || choices.length > MAX_CHOICES) return null;
  // Two identical options make the key ambiguous even when the index is valid.
  if (new Set(choices.map((choice) => choice.en.toLowerCase())).size !== choices.length) {
    return null;
  }
  if (typeof answer !== "number" || !Number.isInteger(answer)) return null;
  if (answer < 0 || answer >= choices.length) return null;
  return { topic, domain, difficulty, choices, answer };
}

/** Turns one model draft into a `Question`, or returns null and lets the caller drop it. */
export function validateDraft(
  draft: QuestionDraft,
  context: { subjectId: string; id: string },
): Question | null {
  const subject = getSubject(context.subjectId);
  if (!subject || subject.exam !== "sat") return null;

  const rawChoices = Array.isArray(draft.choices) ? draft.choices : null;
  const choices = rawChoices
    ? rawChoices.map((choice) => text(choice)).filter((choice): choice is string => choice !== null)
    : null;
  if (rawChoices && choices && choices.length !== rawChoices.length) return null;

  const shared = checkShared(
    text(draft.topic),
    text(draft.domain),
    difficultyOf(draft.difficulty),
    choices ? choices.map((choice) => ({ en: choice })) : null,
    draft.answer,
  );
  if (!shared) return null;

  const prompt = text(draft.prompt);
  const explanation = text(draft.explanation);
  if (!prompt || !explanation) return null;

  const passage = text(draft.passage);

  return {
    id: context.id,
    exam: "sat",
    subjectId: subject.id,
    topic: shared.topic,
    domain: shared.domain,
    difficulty: shared.difficulty,
    ...(passage ? { passage: { en: passage } } : {}),
    prompt: { en: prompt },
    choices: shared.choices,
    answer: shared.answer,
    explanation: { en: explanation },
  };
}

/** Re-checks a finished `Question` that arrived over the wire before it can reach a test. */
export function validateQuestion(value: unknown, expected: { subjectId: string }): Question | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;

  const id = text(record.id);
  const subject = getSubject(expected.subjectId);
  if (!id || !subject || subject.exam !== "sat") return null;
  if (record.subjectId !== subject.id || record.exam !== "sat") return null;

  const rawChoices = Array.isArray(record.choices) ? record.choices : null;
  const choices = rawChoices
    ? rawChoices
        .map((choice) => localizedText(choice))
        .filter((choice): choice is LocalizedText => choice !== null)
    : null;
  if (rawChoices && choices && choices.length !== rawChoices.length) return null;

  const shared = checkShared(
    text(record.topic),
    text(record.domain),
    difficultyOf(record.difficulty),
    choices,
    record.answer,
  );
  if (!shared) return null;

  const prompt = localizedText(record.prompt);
  const explanation = localizedText(record.explanation);
  if (!prompt || !explanation) return null;

  const passage = localizedText(record.passage);

  return {
    id,
    exam: "sat",
    subjectId: subject.id,
    topic: shared.topic,
    domain: shared.domain,
    difficulty: shared.difficulty,
    ...(passage ? { passage } : {}),
    prompt,
    choices: shared.choices,
    answer: shared.answer,
    explanation,
  };
}
