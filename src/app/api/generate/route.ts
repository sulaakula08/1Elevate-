import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getSubject } from "@/data/exams";
import {
  MAX_AVOID,
  MAX_BATCH,
  MAX_CHOICES,
  MAX_TOPICS,
  MIN_CHOICES,
  normalizePrompt,
  validateDraft,
  type GenerateRequest,
  type GenerateResponse,
  type LevelRequest,
  type QuestionDraft,
} from "@/lib/generation/schema";
import type { Difficulty, Question } from "@/data/types";

export const runtime = "nodejs";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

const LEVEL_NAME: Record<Difficulty, string> = {
  1: "easy",
  2: "medium",
  3: "hard",
};

/**
 * One object, one array, flat string fields. The model never writes the id, the
 * exam or the subject — those are ours, and letting it guess them would be a way
 * for a generated item to end up filed under the wrong module.
 */
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topic: { type: "string" },
          domain: { type: "string" },
          difficulty: { type: "integer", enum: [1, 2, 3] },
          passage: { type: "string" },
          prompt: { type: "string" },
          choices: { type: "array", items: { type: "string" } },
          answer: { type: "integer", enum: [0, 1, 2, 3, 4, 5] },
          explanation: { type: "string" },
        },
        required: [
          "topic",
          "domain",
          "difficulty",
          "passage",
          "prompt",
          "choices",
          "answer",
          "explanation",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
} as const;

function systemPrompt(request: GenerateRequest, subjectName: string, total: number): string {
  const mix = request.wanted
    .map((level) => `${level.count} ${LEVEL_NAME[level.difficulty]} (difficulty ${level.difficulty})`)
    .join(", ");

  return `You write practice questions for the digital SAT, in the style of the official College Board blueprint. You are writing for the 1Elevate platform, whose students are preparing in Kazakhstan.

Write exactly ${total} new ${subjectName} questions: ${mix}.

Format rules — the response is parsed by a program, so every field matters:
- Every field is written in English: the real exam is in English and so is the interface.
- Between ${MIN_CHOICES} and ${MAX_CHOICES} answer choices, four unless the item type calls for otherwise. Exactly one is correct; "answer" is its zero-based index. No two choices may say the same thing.
- "passage" is the stimulus a Reading & Writing item is built on. Write an original passage — never reproduce a real exam text or a copyrighted source. Use an empty string when the question needs no passage.
- "topic" must be one of the topics listed below. "domain" must be one of the official content domains listed below.
${request.wantFigures ? `- A question may carry a figure, and some skills need one — reading a trend, comparing series, interpolating from a graph. Write it as a fenced chart block inside "prompt", on its own lines:

  \`\`\`chart
  type: line
  title: Wheat exported by three countries
  x: 2019/2020, 2020/2021, 2021/2022, 2022/2023
  xLabel: Marketing year
  yLabel: Percent
  series: Kazakhstan = 64, 68, 79, 71
  series: Ukraine = 22, 17, 33, 30
  \`\`\`

  "type" is line, bar or scatter. One "series" line per data set; a blank value is a gap. Invent your own scenario and your own numbers — never transcribe a figure from a real exam.
- Only include a figure when the skill genuinely requires reading one. A question that can be asked in a sentence must be asked in a sentence.
- Anything the figure does not show must be stated in words: a question can only be answered from the figure plus the stem.
- No other images or diagrams. Geometry figures are not supported yet, so do not write a question that needs one.` : "- Every question must be answerable from text alone: no images, diagrams, graphs or tables."}
- "explanation" teaches the rule that makes the answer work, in two to four sentences, so it transfers to the next question. Write math as plain text: / for division, ^ for powers, no LaTeX.

Setting — the students are in Kazakhstan, so the questions should be about their world:
- Use Kazakhstani people, places and data: Almaty, Astana, Shymkent, Turkestan, the steppe, the Caspian, the Altai; tenge for money; metric units throughout; Kazakh and Russian given names — Aisha, Dias, Aruzhan, Nurlan, Salimzhan, Madina.
- Draw scenarios from things a student here recognises: wheat and barley yields, rail freight on the Trans-Caspian route, apple orchards in the Almaty region, Kok-Tobe, the metro, the Aral Sea, Baikonur, winter temperatures in Karaganda, a school in Kyzylorda.
- Write them as ordinary settings, not as landmarks being explained. A student solving a rate problem about the Almaty metro should feel it was written for them, not that Kazakhstan is the subject of the question.
- Never rely on local knowledge to answer. Everything needed is in the stem or the figure; the setting is context, never a hidden step.

Register — inspired by how official SAT items are built, not by any particular one:
- Reading & Writing keeps the exam's academic register: a short informational or literary passage of 25 to 150 words, then one question about it. The exam draws on science, history and literature, and Central Asian subject matter belongs there naturally — Abai and Auezov, Silk Road trade, Aral Sea hydrology, steppe archaeology, snow leopard conservation — treated as scholarship, not as travel writing.
- Use the exam's own question types and their plain phrasing: which choice best states the main purpose of the text; which choice completes the text with the most logical transition; which quotation best supports the claim; which choice conforms to the conventions of Standard English.
- Math is one or two sentences of setup and a single question. No preamble, no story, no invented character speaking.
- Do not imitate a specific published question. Take the shape of the item type and write your own.

Quality rules:
- Distractors must be wrong for a reason a real student would fall for — a sign error, a misread of scope, a plausible but unsupported inference — never filler.
- Difficulty 1 is one step; difficulty 2 takes two or three; difficulty 3 combines ideas or hides the step that matters.${
    request.calibration && request.calibration.length
      ? `
- Calibrate against what this platform's own students actually score, which is better evidence than a label. Questions already in the bank, with the share of students answering each correctly:
${request.calibration.map((c) => `  - ${LEVEL_NAME[c.difficulty]}: ${Math.round(c.accuracy * 100)}% correct — "${c.prompt.slice(0, 120)}"`).join("\n")}
  Aim for the same accuracy band at each level.`
      : ""
  }
- Check the arithmetic and the answer index before you return. An item you are unsure of is worse than one fewer item.

Topics available: ${request.topics.join("; ") || "standard SAT topics for this section"}.
Content domains available: ${request.domains.join("; ") || "the official SAT content domains for this section"}.

Do not write a question whose stem repeats any of these existing ones:
${request.avoid.map((prompt) => `- ${prompt.slice(0, 160)}`).join("\n") || "- (the bank is empty)"}`;
}

function levelRequests(value: unknown): LevelRequest[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const out: LevelRequest[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) return null;
    const record = entry as Record<string, unknown>;
    const difficulty = record.difficulty;
    const count = record.count;
    if (difficulty !== 1 && difficulty !== 2 && difficulty !== 3) return null;
    if (typeof count !== "number" || !Number.isInteger(count) || count <= 0) return null;
    out.push({ difficulty, count });
  }
  return out;
}

function stringList(value: unknown, limit: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .slice(0, limit)
    .map((entry) => entry.trim().slice(0, maxLength));
}

function parseBody(raw: unknown): GenerateRequest | null {
  if (typeof raw !== "object" || raw === null) return null;
  const body = raw as Record<string, unknown>;

  const subjectId = typeof body.subjectId === "string" ? body.subjectId : null;
  const subject = subjectId ? getSubject(subjectId) : undefined;
  if (!subject || subject.exam !== "sat") return null;

  const wanted = levelRequests(body.wanted);
  if (!wanted) return null;

  // Trim the mix down to one batch rather than rejecting it: the caller asks for
  // what it is short of, and the batch size is ours to enforce.
  let room = MAX_BATCH;
  const capped: LevelRequest[] = [];
  for (const level of wanted) {
    if (room <= 0) break;
    const count = Math.min(level.count, room);
    capped.push({ difficulty: level.difficulty, count });
    room -= count;
  }
  if (capped.length === 0) return null;

  return {
    subjectId: subject.id,
    wanted: capped,
    topics: stringList(body.topics, MAX_TOPICS, 80),
    domains: stringList(body.domains, MAX_TOPICS, 80),
    avoid: stringList(body.avoid, MAX_AVOID, 200),
    // Only entries that carry a real measured accuracy are passed on: a made-up
    // number would be worse than no calibration at all.
    wantFigures: body.wantFigures === true,
    calibration: Array.isArray(body.calibration)
      ? (body.calibration as unknown[])
          .flatMap((entry) => {
            const row = entry as { prompt?: unknown; difficulty?: unknown; accuracy?: unknown };
            const level = Number(row.difficulty);
            const accuracy = Number(row.accuracy);
            if (typeof row.prompt !== "string" || !row.prompt.trim()) return [];
            if (![1, 2, 3].includes(level)) return [];
            if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 1) return [];
            return [{
              prompt: row.prompt.trim().slice(0, 200),
              difficulty: level as Difficulty,
              accuracy,
            }];
          })
          .slice(0, 12)
      : undefined,
  };
}

function readDrafts(text: string): QuestionDraft[] | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    const questions = (parsed as { questions?: unknown }).questions;
    return Array.isArray(questions) ? (questions as QuestionDraft[]) : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error: "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.",
        code: "no-key",
      },
      { status: 503 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "bad-request" }, { status: 400 });
  }

  const body = parseBody(raw);
  if (!body) {
    return NextResponse.json(
      { error: "Unknown subject or empty difficulty mix.", code: "bad-request" },
      { status: 400 },
    );
  }

  const subject = getSubject(body.subjectId)!;
  const total = body.wanted.reduce((sum, level) => sum + level.count, 0);
  const client = new Anthropic();

  let text = "";
  try {
    // Streamed so a long batch cannot trip the SDK's request timeout; the route
    // still answers in one piece, because a half-written question is unusable.
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: OUTPUT_SCHEMA as unknown as Record<string, unknown> },
      },
      system: systemPrompt(body, subject.name.en, total),
      messages: [
        {
          role: "user",
          content: `Write the ${total} questions now.`,
        },
      ],
    });

    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "The model declined this request.", code: "upstream" },
        { status: 502 },
      );
    }
    text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");
  } catch (error) {
    // The upstream message can carry request ids and account detail, so it stays
    // in the server log. The client maps `code` to a sentence a student can act
    // on and never renders this string.
    if (process.env.NODE_ENV !== "production") console.error("[generate]", error);
    return NextResponse.json(
      { error: "Generation failed upstream.", code: "upstream" },
      { status: 502 },
    );
  }

  const drafts = readDrafts(text);
  if (!drafts) {
    return NextResponse.json(
      { error: "The model did not return usable JSON.", code: "upstream" },
      { status: 502 },
    );
  }

  // Validate before anything leaves the server: a malformed draft is dropped,
  // never patched into shape, and a repeat of an existing prompt is dropped too.
  const seen = new Set(body.avoid.map(normalizePrompt));
  const questions: Question[] = [];
  let rejected = 0;

  for (const draft of drafts) {
    if (questions.length >= total) {
      rejected += 1;
      continue;
    }
    const question = validateDraft(draft, {
      subjectId: body.subjectId,
      id: `sat-ai-${Math.random().toString(36).slice(2, 10)}`,
    });
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
    questions.push(question);
  }

  const payload: GenerateResponse = { questions, model: MODEL, rejected };
  return NextResponse.json(payload, { headers: { "cache-control": "no-store" } });
}
