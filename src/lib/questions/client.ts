"use client";

import type { Question, QuestionIndexEntry } from "@/data/types";
import { MAX_IDS_PER_REQUEST } from "@/lib/questions/limits";
import { apiFetch } from "@/lib/supabase/client";

/**
 * The browser's side of the question bank.
 *
 * Three things reach the client, in increasing order of how much they give away,
 * and nothing here can ask for more than the route it calls is willing to hand
 * over — the ceiling is in Postgres, not in this file.
 *
 *   fetchIndex     taxonomy for the whole bank. Safe to hold: it is the same
 *                  labels as data/taxonomy.ts, and it is what the practice
 *                  browser, review queue and progress charts count.
 *   fetchBodies    content for the questions on screen, in pages the route will
 *                  accept — see MAX_IDS_PER_REQUEST.
 *   grade / score  the only way an answer or an explanation gets here at all.
 */

export type Verdict = {
  correct: boolean;
  answer: number;
  explanation?: Question["explanation"];
};

/** Taxonomy for every question in the bank. */
export async function fetchIndex(): Promise<QuestionIndexEntry[] | null> {
  const response = await apiFetch("/api/questions");
  if (!response.ok) return null;
  const body = (await response.json()) as { questions?: QuestionIndexEntry[] };
  return body.questions ?? [];
}

/**
 * Content for a set of ids, requested in pages the server will accept.
 *
 * Pages go out one after another rather than all at once. A student opening a
 * subject can name 150 ids, and firing five parallel requests at a route with a
 * per-minute ceiling is how a legitimate session ends up rate-limited — the
 * caller only ever needs the first page to render, and the rest arrive behind it.
 */
export async function fetchBodies(ids: string[]): Promise<Question[]> {
  const wanted = [...new Set(ids.filter(Boolean))];
  if (wanted.length === 0) return [];

  const out: Question[] = [];
  for (let i = 0; i < wanted.length; i += MAX_IDS_PER_REQUEST) {
    const page = wanted.slice(i, i + MAX_IDS_PER_REQUEST);
    const response = await apiFetch(`/api/questions?ids=${page.map(encodeURIComponent).join(",")}`);
    if (!response.ok) break;
    const body = (await response.json()) as { questions?: Question[] };
    out.push(...(body.questions ?? []));
  }
  return out;
}

/**
 * Submit one choice and get the verdict back.
 *
 * `choice` may be -1, which is the practice UI saying "reveal it, I give up".
 * Returns null when the check could not be made — the caller has to decide what
 * to do about that rather than being handed a made-up "wrong", because recording
 * an attempt the student did not make is worse than showing them an error.
 */
export async function grade(questionId: string, choice: number): Promise<Verdict | null> {
  const response = await apiFetch("/api/questions/check", {
    method: "POST",
    body: JSON.stringify({ id: questionId, choice }),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    correct?: boolean;
    answer?: number;
    explanation?: Question["explanation"] | null;
  };
  if (typeof body.correct !== "boolean" || typeof body.answer !== "number") return null;
  return {
    correct: body.correct,
    answer: body.answer,
    explanation: body.explanation ?? undefined,
  };
}

/**
 * Tally a set of submitted choices without revealing anything.
 *
 * This is the mock's path, and the response deliberately carries no answers and
 * no explanations: during a sitting the student is owed a score and nothing else.
 * Returns a map of id → correct; ids the server could not grade are absent, and
 * the caller treats an absent id as unanswered rather than as wrong.
 */
export async function score(
  submissions: { id: string; choice: number }[],
): Promise<Record<string, boolean>> {
  if (submissions.length === 0) return {};

  const response = await apiFetch("/api/questions/check", {
    method: "POST",
    body: JSON.stringify({ answers: submissions }),
  });
  if (!response.ok) return {};

  const body = (await response.json()) as { results?: { id: string; correct: boolean }[] };
  const out: Record<string, boolean> = {};
  for (const row of body.results ?? []) out[row.id] = row.correct;
  return out;
}

/** Whole rows, for the admin editor. Refused by the database for anyone else. */
export async function fetchAdminBank(): Promise<Question[] | null> {
  const response = await apiFetch("/api/questions?view=full");
  if (!response.ok) return null;
  const body = (await response.json()) as { questions?: Question[] };
  return body.questions ?? [];
}

/** The taxonomy half of a question the client already holds in full. */
export function toIndexEntry(question: Question): QuestionIndexEntry {
  return {
    id: question.id,
    exam: question.exam,
    subjectId: question.subjectId,
    topic: question.topic,
    domain: question.domain,
    skill: question.skill,
    difficulty: question.difficulty,
    createdAt: question.createdAt,
  };
}
