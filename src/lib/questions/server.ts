import type { SupabaseClient } from "@supabase/supabase-js";
import type { Question, QuestionIndexEntry } from "@/data/types";
import { MAX_IDS_PER_REQUEST } from "@/lib/questions/limits";
import { adminClient } from "@/lib/supabase/server";

/**
 * Every server-side path to question content, and there are only four.
 *
 * This module exists so that "what may a caller see of the bank" is one file
 * rather than a decision repeated in each route. It is server-only by
 * convention — nothing here imports a secret, but everything here is the
 * privileged half of a boundary, and a "use client" file importing it would be
 * a mistake worth noticing in review.
 *
 * The boundary itself is not in this file. It is in Postgres, in the question-
 * bank migration: `authenticated` may select only the taxonomy columns of
 * `custom_questions`, and content comes back through three SECURITY DEFINER
 * functions that each check who is asking. So these helpers are not the thing
 * keeping the bank safe — they are the ordinary way to use the doors that are.
 * A bug in here cannot open one that the database has closed, which is the whole
 * point of putting it there.
 *
 *   readIndex        taxonomy for the whole bank. No proprietary text.
 *   readBodies       content for at most MAX_IDS_PER_REQUEST ids. No answer,
 *                    no explanation.
 *   gradeAnswer      one submitted choice → verdict + answer + explanation.
 *   readAdminBank    whole rows, admins only, for the editor.
 */

/** The jsonb column, as the three readers below see it. */
type Payload = {
  passage?: Question["passage"] | null;
  figure?: Question["figure"] | null;
  prompt: Question["prompt"];
  choices: Question["choices"];
  /** Present only on the admin read; stripped by `question_bodies`. */
  explanation?: Question["explanation"] | null;
  skill?: string | null;
  generatedBy?: string | null;
};

type IndexRow = {
  id: string;
  exam: string;
  subject_id: string;
  topic: string;
  domain: string | null;
  skill: string | null;
  difficulty: number;
  created_at?: string | null;
};

type BodyRow = {
  id: string;
  exam: string;
  subject_id: string;
  topic: string;
  domain: string | null;
  difficulty: number;
  payload: Payload;
};

type AdminRow = BodyRow & {
  answer: number;
  created_at?: string | null;
  author_email?: string | null;
};

export type Failure = { ok: false; status: number; error: string };

const ms = (iso?: string | null) => (iso ? new Date(iso).getTime() : undefined);

/**
 * A Postgres error turned into a status and a sentence.
 *
 * The definer functions raise with deliberate SQLSTATEs, so the reason a read
 * was refused survives the trip out of the database instead of collapsing into
 * "something went wrong". Driver text is not forwarded: it names columns and
 * constraints, and this is the half of the response an attacker also reads.
 */
function refusal(error: { code?: string; message?: string }, fallback: string): Failure {
  switch (error.code) {
    case "42501":
      return { ok: false, status: 403, error: "Not allowed." };
    case "22023":
      return { ok: false, status: 400, error: "Asked for too much at once." };
    case "P0002":
      return { ok: false, status: 404, error: "No such question." };
    default:
      if (process.env.NODE_ENV !== "production") {
        console.error("[questions]", error.code, error.message);
      }
      return { ok: false, status: 502, error: fallback };
  }
}

/* ------------------------------------------------------------------ index -- */

/**
 * What every screen that reasons about the bank in aggregate is built from.
 *
 * This is a plain table select rather than a function call, because the column
 * grants already make it safe: the only columns `authenticated` can read are the
 * ones below, so there is no version of this query that returns a prompt. That
 * is worth preferring — a grant cannot be called with the wrong arguments.
 */
export async function readIndex(
  client: SupabaseClient,
): Promise<{ ok: true; entries: QuestionIndexEntry[] } | Failure> {
  const { data, error } = await client
    .from("custom_questions")
    .select("id, exam, subject_id, topic, domain, skill, difficulty, created_at")
    .order("created_at", { ascending: true });

  if (error) return refusal(error, "Could not load the question list.");

  const entries = (data ?? []).map((raw) => {
    const row = raw as IndexRow;
    return {
      id: row.id,
      exam: row.exam as Question["exam"],
      subjectId: row.subject_id,
      topic: row.topic,
      domain: row.domain ?? undefined,
      skill: row.skill ?? undefined,
      difficulty: row.difficulty as Question["difficulty"],
      createdAt: ms(row.created_at),
    };
  });

  return { ok: true, entries };
}

/* ----------------------------------------------------------------- bodies -- */

/**
 * Question content for the handful of questions actually on screen.
 *
 * Returns `Question` objects with `answer` and `explanation` absent — not
 * blanked, absent, because the function in the database never puts them in the
 * row. Callers get exactly the shape a student's browser is allowed to hold.
 */
export async function readBodies(
  client: SupabaseClient,
  ids: string[],
): Promise<{ ok: true; questions: Question[] } | Failure> {
  if (ids.length === 0) return { ok: true, questions: [] };
  if (ids.length > MAX_IDS_PER_REQUEST) {
    return {
      ok: false,
      status: 400,
      error: `At most ${MAX_IDS_PER_REQUEST} questions per request.`,
    };
  }

  const { data, error } = await client.rpc("question_bodies", { ids });
  if (error) return refusal(error, "Could not load the question.");

  const questions = (data ?? []).map((raw: unknown) => {
    const row = raw as BodyRow;
    return {
      id: row.id,
      exam: row.exam as Question["exam"],
      subjectId: row.subject_id,
      topic: row.topic,
      domain: row.domain ?? undefined,
      difficulty: row.difficulty as Question["difficulty"],
      passage: row.payload?.passage ?? undefined,
      figure: row.payload?.figure ?? undefined,
      prompt: row.payload?.prompt,
      choices: row.payload?.choices ?? [],
      skill: row.payload?.skill ?? undefined,
      generatedBy: row.payload?.generatedBy ?? undefined,
      custom: true,
    } satisfies Question;
  });

  return { ok: true, questions };
}

/* ------------------------------------------------------------------ grade -- */

export type Verdict = {
  correct: boolean;
  /** The right choice, revealed now that one has been submitted. */
  answer: number;
  explanation?: Question["explanation"];
};

/**
 * Grade one submitted choice.
 *
 * `choice` may be -1, which is how the practice UI reveals a question the
 * student gave up on. Anything outside the question's own choice range is
 * refused by the database rather than quietly marked wrong.
 */
export async function gradeAnswer(
  client: SupabaseClient,
  questionId: string,
  choice: number,
): Promise<{ ok: true; verdict: Verdict } | Failure> {
  const { data, error } = await client.rpc("check_answer", {
    question_id: questionId,
    choice,
  });
  if (error) return refusal(error, "Could not check that answer.");

  const row = (Array.isArray(data) ? data[0] : data) as
    | { correct?: boolean; answer?: number; explanation?: Question["explanation"] | null }
    | undefined;

  // A shape that cannot be read is a refusal, not a pass. Guessing "correct"
  // here would turn any future change to that function into a free mark.
  if (!row || typeof row.correct !== "boolean" || typeof row.answer !== "number") {
    return { ok: false, status: 502, error: "Could not check that answer." };
  }

  return {
    ok: true,
    verdict: {
      correct: row.correct,
      answer: row.answer,
      explanation: row.explanation ?? undefined,
    },
  };
}

/* ------------------------------------------------------------------ tutor -- */

/**
 * The answer and the worked solution for one question, for a server-side reader.
 *
 * This exists for the tutor's system prompt and nothing else. Elevate is a better
 * teacher when it knows which choice is right and how the bank explains it, and
 * the route that builds that prompt never sends either to the browser — it sends
 * the model's reply.
 *
 * It goes through the service client deliberately, and is deliberately not a
 * SECURITY DEFINER function granted to `authenticated`: a function like that would
 * be callable straight from a browser over RPC, which would hand out every answer
 * in the bank and undo the whole boundary. The service key is server-only and
 * already required in production for account deletion, so this adds no new
 * deployment requirement.
 *
 * Best effort by design. Without a service key configured this returns null and
 * the tutor still answers, just without the reference explanation to lean on —
 * which is a worse tutor, not a broken one.
 */
export async function readTutorContext(
  questionId: string,
): Promise<{ answer: number; explanation?: Question["explanation"] } | null> {
  const admin = adminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("custom_questions")
    .select("answer, payload")
    .eq("id", questionId)
    .maybeSingle();

  if (error || !data) return null;
  const payload = (data as { answer: number; payload: Payload }).payload;
  return {
    answer: (data as { answer: number }).answer,
    explanation: payload?.explanation ?? undefined,
  };
}

/* ------------------------------------------------------------------ admin -- */

/** Whole rows for the editor. The `is_admin()` check is inside the function. */
export async function readAdminBank(
  client: SupabaseClient,
): Promise<{ ok: true; questions: Question[] } | Failure> {
  const { data, error } = await client.rpc("question_bank_admin");
  if (error) return refusal(error, "Could not load the bank.");

  const questions = (data ?? []).map((raw: unknown) => {
    const row = raw as AdminRow;
    return {
      id: row.id,
      exam: row.exam as Question["exam"],
      subjectId: row.subject_id,
      topic: row.topic,
      domain: row.domain ?? undefined,
      difficulty: row.difficulty as Question["difficulty"],
      passage: row.payload?.passage ?? undefined,
      figure: row.payload?.figure ?? undefined,
      prompt: row.payload?.prompt,
      choices: row.payload?.choices ?? [],
      answer: row.answer,
      explanation: row.payload?.explanation ?? undefined,
      skill: row.payload?.skill ?? undefined,
      generatedBy: row.payload?.generatedBy ?? undefined,
      custom: true,
      authorEmail: row.author_email ?? undefined,
      createdAt: ms(row.created_at),
    } satisfies Question;
  });

  return { ok: true, questions };
}
