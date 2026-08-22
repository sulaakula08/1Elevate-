import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { consumeRate } from "@/lib/rate-limit";
import { getSubject } from "@/data/exams";
import { readBodies, readTutorContext } from "@/lib/questions/server";
import { requireUser } from "@/lib/supabase/guard";

export const runtime = "nodejs";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

type Turn = { role: "user" | "assistant"; content: string };

/**
 * What the browser sends.
 *
 * Note what is missing: the question. It used to arrive in full — prompt, choices,
 * the correct index and the official explanation — which meant the client had to
 * know the answer in order to ask about it, and meant this route trusted a caller
 * to tell it what the right answer was. Now it sends an id and the route reads the
 * question itself.
 *
 * That fixes two things at once. The tutor can be asked about a question the
 * student has not answered without the answer being in their tab, and the system
 * prompt is built from the bank rather than from user input — so this route can no
 * longer be used as a general-purpose model by inventing a question to ask about.
 */
type Body = {
  /** Chat so far. The first user turn is usually "explain this to me". */
  messages: Turn[];
  /** Which question in the bank the conversation is about. */
  questionId: string;
  /** What the student picked, if they answered. */
  chosenIndex?: number | null;
};

/** The question as this route assembles it, from the bank. */
type Subject = {
  exam: string;
  subject: string;
  topic: string;
  passage?: string;
  prompt: string;
  choices: string[];
  /** Absent when no service key is configured; the prompt copes. */
  correctIndex?: number;
  officialExplanation?: string;
  chosenIndex?: number | null;
};

function systemPrompt(question: Subject): string {
  const letters = ["A", "B", "C", "D", "E", "F"];
  const choiceList = question.choices
    .map((choice, i) => `${letters[i]}. ${choice}`)
    .join("\n");
  const chosen =
    question.chosenIndex === null || question.chosenIndex === undefined
      ? "The student has not answered yet."
      : question.correctIndex === undefined
        ? `The student answered ${letters[question.chosenIndex]}.`
        : question.chosenIndex === question.correctIndex
          ? `The student answered ${letters[question.chosenIndex]}, which is correct.`
          : `The student answered ${letters[question.chosenIndex]}, which is wrong.`;

  return `You are Elevate, the 1Elevate tutor: a patient teacher helping a student prepare for the ${question.exam.toUpperCase()} exam.

Reply in English. Keep it short — 3 to 6 sentences, or a few numbered steps.

Formatting. The client renders a small, fixed subset and shows anything else as literal characters, so stay inside it:
- **bold**, *italic*, \`code\`, "1." numbered lists and "- " bulleted lists. No headings, no tables, no links, no HTML.
- Mathematics goes in \\( … \\) inside a sentence, or \\[ … \\] on its own line for a step worth setting apart. Never leave a formula bare and never open a delimiter you do not close.
- Inside a formula use only: \\frac{a}{b}, \\sqrt{x}, \\sqrt[3]{x}, ^ and _ for scripts, \\cdot \\times \\div \\pm, \\le \\ge \\ne \\approx, \\to \\infty \\angle \\perp \\degree, the Greek letters (\\pi, \\theta, \\Delta …), the standard function names (\\sin, \\cos, \\log, \\ln …), \\text{…} for words inside an expression, and ( ) [ ] | for grouping. Nothing else — no \\begin{}, no \\left/\\right, no alignment.
- Example of the expected shape: substitute \\(x = 3\\) into \\[y = \\frac{2x + 1}{x - 1}\\] to get \\(y = 3.5\\).

Teach, don't dump. Start from what the student is likely stuck on, walk through the reasoning one step at a time, and name the rule or fact that makes the answer work so it transfers to the next question. If the student got it wrong, say briefly why their choice is tempting before correcting it. End with one short question that checks they followed.

Never invent facts about the exam or the subject. If the student asks something the question does not cover, say so and answer from general knowledge.

The question the student is working on:
Subject: ${question.subject}
Topic: ${question.topic}
${question.passage ? `Passage: ${question.passage}\n` : ""}Question: ${question.prompt}
${choiceList}
${
  question.correctIndex === undefined
    ? "The correct answer is not available to you — reason it out, and say so if you are unsure."
    : `Correct answer: ${letters[question.correctIndex]}`
}
${question.officialExplanation ? `Reference explanation: ${question.officialExplanation}` : ""}
${chosen}`;
}

/*
 * Generous for a student working through a section; useless for a script.
 *
 * The minute figure was the only ceiling, which meant an account could hold the
 * tutor at 20 questions a minute indefinitely — 1,200 Anthropic calls an hour, on
 * the project's card. A person asking a tutor for help manages a handful a minute
 * and a few dozen in a sitting, so the hour is where the real bound belongs.
 */
const ASKS_PER_MINUTE = 12;
const ASKS_PER_HOUR = 100;

export async function POST(request: Request) {
  // Signed in, always. This route spends the project's Anthropic budget, and
  // the caller controls the whole question object that goes into the system
  // prompt — unauthenticated, it is a free general-purpose model on someone
  // else's card.
  const guarded = await requireUser(request);
  if (!guarded.ok) return guarded.response;

  const perMinute = await consumeRate(
    guarded.caller.client,
    "explain",
    guarded.caller.user.id,
    ASKS_PER_MINUTE,
    60,
  );
  if (!perMinute.ok) {
    return NextResponse.json(
      { error: "Too many questions in a row. Give it a moment." },
      { status: 429, headers: { "retry-after": String(perMinute.retryAfter) } },
    );
  }

  const perHour = await consumeRate(
    guarded.caller.client,
    "explain:hour",
    guarded.caller.user.id,
    ASKS_PER_HOUR,
    3_600,
  );
  if (!perHour.ok) {
    return NextResponse.json(
      { error: "You have asked Elevate a lot this hour. Try again shortly." },
      { status: 429, headers: { "retry-after": String(perHour.retryAfter) } },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.",
      },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const questionId = typeof body?.questionId === "string" ? body.questionId.trim() : "";
  if (!questionId || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "Missing question or messages." }, { status: 400 });
  }

  /*
   * The question, read from the bank rather than taken from the request.
   *
   * `readBodies` goes through the caller's own client, so a signed-in student can
   * only ever get a question that exists — and gets it without its answer.
   * `readTutorContext` adds the answer and the official explanation server-side,
   * for the system prompt only; neither is ever written to the response.
   */
  const found = await readBodies(guarded.caller.client, [questionId]);
  const question = found.ok ? found.questions[0] : undefined;
  if (!question) {
    return NextResponse.json({ error: "No such question." }, { status: 404 });
  }

  const reference = await readTutorContext(questionId);
  const subject = getSubject(question.subjectId);

  const asked: Subject = {
    exam: question.exam,
    subject: subject ? subject.name.en : question.subjectId,
    topic: question.skill || question.topic,
    passage: question.passage?.en,
    prompt: question.prompt?.en ?? "",
    choices: (question.choices ?? []).map((choice) => choice.en),
    correctIndex: reference?.answer,
    officialExplanation: reference?.explanation?.en,
    chosenIndex:
      typeof body.chosenIndex === "number" && Number.isInteger(body.chosenIndex)
        ? body.chosenIndex
        : null,
  };

  const client = new Anthropic();

  // Stream so the tutor's answer appears as it is written, rather than after a pause.
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system: systemPrompt(asked),
    messages: body.messages.slice(-12).map((turn) => ({
      role: turn.role,
      content: turn.content,
    })),
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(
            encoder.encode("\n\nI could not answer that one. Try rephrasing it."),
          );
        }
      } catch (error) {
        // The upstream message can carry request ids and internal detail, so it
        // stays in the server log; the student gets a sentence they can act on.
        if (process.env.NODE_ENV !== "production") console.error("[explain]", error);
        controller.enqueue(
          encoder.encode("\n\nThe connection dropped. Please ask again."),
        );
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
