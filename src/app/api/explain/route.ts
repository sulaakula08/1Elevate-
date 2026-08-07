import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

type Turn = { role: "user" | "assistant"; content: string };

type Body = {
  /** Chat so far. The first user turn is usually "explain this to me". */
  messages: Turn[];
  question: {
    exam: string;
    subject: string;
    topic: string;
    passage?: string;
    prompt: string;
    choices: string[];
    correctIndex: number;
    officialExplanation: string;
    /** What the student picked, if they answered. */
    chosenIndex?: number | null;
  };
};

function systemPrompt(body: Body): string {
  const { question } = body;
  const letters = ["A", "B", "C", "D", "E", "F"];
  const choiceList = question.choices
    .map((choice, i) => `${letters[i]}. ${choice}`)
    .join("\n");
  const chosen =
    question.chosenIndex === null || question.chosenIndex === undefined
      ? "The student has not answered yet."
      : question.chosenIndex === question.correctIndex
        ? `The student answered ${letters[question.chosenIndex]}, which is correct.`
        : `The student answered ${letters[question.chosenIndex]}, which is wrong.`;

  return `You are the 1Elevate tutor, a patient teacher helping a student prepare for the ${question.exam.toUpperCase()} exam.

Reply in English. Keep it short — 3 to 6 sentences, or a few numbered steps. Plain text only: no markdown headers, no bold, no LaTeX; write math as plain text (use / for division and ^ for powers).

Teach, don't dump. Start from what the student is likely stuck on, walk through the reasoning one step at a time, and name the rule or fact that makes the answer work so it transfers to the next question. If the student got it wrong, say briefly why their choice is tempting before correcting it. End with one short question that checks they followed.

Never invent facts about the exam or the subject. If the student asks something the question does not cover, say so and answer from general knowledge.

The question the student is working on:
Subject: ${question.subject}
Topic: ${question.topic}
${question.passage ? `Passage: ${question.passage}\n` : ""}Question: ${question.prompt}
${choiceList}
Correct answer: ${letters[question.correctIndex]}
Reference explanation: ${question.officialExplanation}
${chosen}`;
}

export async function POST(request: Request) {
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

  if (!body?.question?.prompt || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "Missing question or messages." }, { status: 400 });
  }

  const client = new Anthropic();

  // Stream so the tutor's answer appears as it is written, rather than after a pause.
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system: systemPrompt(body),
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
            encoder.encode("\n\n[The tutor could not answer this one. Try rephrasing.]"),
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(encoder.encode(`\n\n[Tutor error: ${message}]`));
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
