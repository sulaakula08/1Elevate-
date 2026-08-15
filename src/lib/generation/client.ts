"use client";

/**
 * Browser side of question generation.
 *
 * Splits each subject's shortfall into small batches, calls the server route,
 * and re-validates and de-duplicates everything it gets back before letting it
 * near a test. It never sees a key: the request carries only the shortfall and
 * the bank's own topics.
 *
 * Failure is a normal outcome, not an exception — the caller gets whatever was
 * accepted so far plus a status, and the mock test runs either way.
 */

import type { Question } from "@/data/types";
import { apiFetch } from "@/lib/supabase/client";
import {
  MAX_BATCH,
  normalizePrompt,
  validateQuestion,
  type GenerateErrorBody,
  type GenerateRequest,
  type GenerateResponse,
} from "./schema";
import type { Provenance, ProvenanceTable } from "./provenance";

export type FillStatus =
  /** Everything asked for came back. */
  | "complete"
  /** Some came back; the modules stay short. */
  | "partial"
  /** No key on the server — the feature is switched off, not broken. */
  | "unavailable"
  /** The request failed. */
  | "failed";

export type FillOutcome = {
  status: FillStatus;
  questions: Question[];
  provenance: ProvenanceTable;
  /** Drafts the server or the browser discarded. */
  rejected: number;
};

function mintId(taken: Set<string>): string {
  let id = "";
  do {
    id = `sat-ai-${Math.random().toString(36).slice(2, 10)}`;
  } while (taken.has(id));
  return id;
}

async function postBatch(
  body: GenerateRequest,
  signal?: AbortSignal,
): Promise<GenerateResponse | GenerateErrorBody> {
  const response = await apiFetch("/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal,
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as
    | GenerateResponse
    | GenerateErrorBody
    | null;
  if (!response.ok) {
    if (payload && "code" in payload) return payload;
    return { error: "Generation failed.", code: response.status === 503 ? "no-key" : "upstream" };
  }
  if (!payload || !("questions" in payload)) {
    return { error: "Malformed response.", code: "upstream" };
  }
  return payload;
}

/** Splits one subject's request into batches of at most `MAX_BATCH` items. */
function batches(request: GenerateRequest): GenerateRequest[] {
  const out: GenerateRequest[] = [];
  let pending = request.wanted.map((level) => ({ ...level }));
  while (pending.some((level) => level.count > 0)) {
    const batch: GenerateRequest["wanted"] = [];
    let room = MAX_BATCH;
    for (const level of pending) {
      if (room <= 0) break;
      const take = Math.min(level.count, room);
      if (take > 0) {
        batch.push({ difficulty: level.difficulty, count: take });
        level.count -= take;
        room -= take;
      }
    }
    if (batch.length === 0) break;
    out.push({ ...request, wanted: batch });
    pending = pending.filter((level) => level.count > 0);
  }
  return out;
}

export async function fillMissingQuestions(
  requests: GenerateRequest[],
  options: {
    /** Ids already in the bank, so a generated question can never shadow one. */
    takenIds: Set<string>;
    /** Called after every batch with the running total of accepted questions. */
    onProgress?: (accepted: number) => void;
    signal?: AbortSignal;
  },
): Promise<FillOutcome> {
  const accepted: Question[] = [];
  const provenance: ProvenanceTable = {};
  const takenIds = new Set(options.takenIds);
  let rejected = 0;
  let asked = 0;

  for (const request of requests) {
    // Prompts already in the bank plus everything accepted so far, so a later
    // batch cannot repeat an earlier one.
    const avoid = [...request.avoid];
    const seen = new Set(avoid.map(normalizePrompt));

    for (const batch of batches(request)) {
      asked += batch.wanted.reduce((sum, level) => sum + level.count, 0);
      const result = await postBatch({ ...batch, avoid: [...avoid] }, options.signal);

      if ("code" in result) {
        return {
          status: result.code === "no-key" ? "unavailable" : "failed",
          questions: accepted,
          provenance,
          rejected,
        };
      }

      rejected += result.rejected;
      for (const candidate of result.questions) {
        const question = validateQuestion(candidate, { subjectId: request.subjectId });
        if (!question) {
          rejected += 1;
          continue;
        }
        const key = normalizePrompt(question.prompt.en);
        if (seen.has(key)) {
          rejected += 1;
          continue;
        }
        seen.add(key);
        avoid.push(question.prompt.en);

        const id = takenIds.has(question.id) ? mintId(takenIds) : question.id;
        takenIds.add(id);
        const stored: Question = { ...question, id };
        accepted.push(stored);
        const record: Provenance = {
          source: "ai-generated",
          generatedAt: Date.now(),
          provider: "anthropic",
          model: result.model,
          validation: "passed",
        };
        provenance[id] = record;
      }
      options.onProgress?.(accepted.length);
    }
  }

  return {
    status: accepted.length >= asked ? "complete" : "partial",
    questions: accepted,
    provenance,
    rejected,
  };
}
