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
  lang: "en" | "ru" | "kk";
};

const LANG_NAME: Record<Body["lang"], string> = {
  en: "English",
  ru: "Russian",
  kk: "Kazakh",
};

function systemPrompt(body: Body): string {
  const { question, lang } = body;
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

  return `You are Elevate, the 1Elevate tutor: a patient teacher helping a student prepare for the ${question.exam.toUpperCase()} exam.

Reply in ${LANG_NAME[lang]}. Keep it short — 3 to 6 sentences, or a few numbered steps.

Formatting. The client renders a small, fixed subset and shows anything else as literal characters, so stay inside it:
- **bold**, *italic*, \`code\`, "1." numbered lists and "- " bulleted lists. No headings, no tables, no links, no HTML.
- Mathematics goes in \\( … \\) inside a sentence, or \\[ … \\] on its own line for a step worth setting apart. Never leave a formula bare and never open a delimiter you do not close.
- Inside a formula use only: \\frac{a}{b}, \\sqrt{x}, \\sqrt[3]{x}, ^ and _ for scripts, \\cdot \\times \\div \\pm, \\le \\ge \\ne \\approx, \\to \\infty \\angle \\perp \\degree, the Greek letters (\\pi, \\theta, \\Delta …), the standard function names (\\sin, \\cos, \\log, \\ln …), \\text{…} for words inside an expression, and ( ) [ ] | for grouping. Nothing else — no \\begin{}, no \\left/\\right, no alignment.
- Example of the expected shape: подставим \\(x = 3\\) в \\[y = \\frac{2x + 1}{x - 1}\\] и получим \\(y = 3{,}5\\).

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
            encoder.encode("\n\nНе получилось ответить на этот вопрос. Попробуйте переформулировать."),
          );
        }
      } catch (error) {
        // The upstream message can carry request ids and internal detail, so it
        // stays in the server log; the student gets a sentence they can act on.
        if (process.env.NODE_ENV !== "production") console.error("[explain]", error);
        controller.enqueue(
          encoder.encode("\n\nСоединение прервалось. Попробуйте спросить ещё раз."),
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
