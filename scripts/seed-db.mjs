#!/usr/bin/env node
/**
 * Applies the development fixtures to the dev project.
 *
 * Run scripts/db-guard.mjs first — the npm script does — so by the time this
 * executes the linked project is known not to be production. This script then
 * checks the same thing again against its own target, because it resolves that
 * target differently (from .env.local, not from the CLI link) and a guard that
 * checks a different thing from the one it protects is decoration.
 *
 * Why this is JavaScript and not the SQL file it started as:
 *
 *   There is no way to run arbitrary SQL against a hosted Supabase project from
 *   this repo. `db push` applies migrations and nothing else; `db reset` is
 *   local-only; `db push --include-seed` crashes the installed CLI outright
 *   (a Bun panic, not a usage error); the Management API's query endpoint needs
 *   a personal access token, which `supabase login` stores in the OS keyring
 *   where nothing here can read it; and a direct Postgres connection needs the
 *   database password, which the CLI does not expose either.
 *
 *   What is available is the service key, which the developer already needs for
 *   seed-auth.mjs. It bypasses row-level security, so PostgREST can write every
 *   table these fixtures touch — including profiles.role, which is otherwise
 *   unwritable by anyone and is why the dev owner could not be made any other
 *   way.
 *
 * Seeds must never become migrations. A migration reaches production
 * eventually, and fake students reaching production is the precise thing this
 * phase exists to prevent.
 *
 * Usage:  npm run db:seed
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTION_PROJECT_REF = "mkxebolzrqwfuvpevtsu";

function readEnvLocal() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    out[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...readEnvLocal(), ...process.env };

function die(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
if (!url) die("NEXT_PUBLIC_SUPABASE_URL is not set. See .env.example.");

const ref = /^https?:\/\/([a-z0-9-]+)\.supabase\.(co|in)/i.exec(url)?.[1] ?? null;
if (ref === null) die(`Could not read a project ref from ${url}. Refusing to guess.`);
if (ref === PRODUCTION_PROJECT_REF) {
  die(
    "REFUSING TO RUN: .env.local points at the PRODUCTION project.\n" +
      "  These fixtures are fake students. Point it at development first.",
  );
}

const serviceKey = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey || serviceKey.startsWith("<")) {
  die(
    "SUPABASE_SECRET_KEY is not set in .env.local (or is still the placeholder).\n" +
      "  The fixtures need it: promoting the dev owner writes profiles.role, which\n" +
      "  no ordinary key may touch. Use the DEVELOPMENT project's secret key.",
  );
}

const REST = `${url}/rest/v1`;
const headers = {
  apikey: serviceKey,
  authorization: `Bearer ${serviceKey}`,
  "content-type": "application/json",
};

/** POST rows, ignoring ones that already exist so re-running is boring. */
async function insert(table, rows, { onConflict } = {}) {
  if (rows.length === 0) return [];
  const query = onConflict ? `?on_conflict=${onConflict}` : "";
  const response = await fetch(`${REST}/${table}${query}`, {
    method: "POST",
    headers: {
      ...headers,
      Prefer: `return=representation,resolution=ignore-duplicates`,
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    die(`Insert into ${table} failed: ${response.status} ${detail.slice(0, 400)}`);
  }
  return response.json().catch(() => []);
}

async function patch(table, filter, values) {
  const response = await fetch(`${REST}/${table}?${filter}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify(values),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    die(`Update on ${table} failed: ${response.status} ${detail.slice(0, 400)}`);
  }
}

async function select(table, query) {
  const response = await fetch(`${REST}/${table}?${query}`, { headers });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    die(`Select from ${table} failed: ${response.status} ${detail.slice(0, 400)}`);
  }
  return response.json();
}

const ago = (days, hours = 0) =>
  new Date(Date.now() - days * 86_400_000 - hours * 3_600_000).toISOString();

console.log(`\n  Seeding development project ${ref}…\n`);

/* ------------------------------------------------------------ identities -- */
// Looked up by email rather than hardcoded, so this stays independent of
// whatever ids seed-auth.mjs happened to generate.
const wanted = {
  ada: "ada.dev@1elevate.dev",
  bruno: "bruno.dev@1elevate.dev",
  olivia: "olivia.dev@1elevate.dev",
};
const profiles = await select(
  "profiles",
  `select=id,email&email=in.(${Object.values(wanted).join(",")})`,
);
const idFor = (email) => profiles.find((p) => p.email === email)?.id ?? null;
const ada = idFor(wanted.ada);
const bruno = idFor(wanted.bruno);
const olivia = idFor(wanted.olivia);

if (!ada || !bruno || !olivia) {
  die(
    "Seed users missing. Run `npm run db:seed:auth` first — it creates the three\n" +
      "  @1elevate.dev accounts these fixtures attach to.",
  );
}

/* -------------------------------------------------------------- profiles -- */
// The signup trigger already made these rows; this fills in what the form would
// have collected, and makes one an owner so the admin surfaces can be tested at
// all. `role` is the reason this script needs the service key.
await patch("profiles", `id=eq.${ada}`, { name: "Ada Dev", grade: "11", target_score: 1450 });
await patch("profiles", `id=eq.${bruno}`, { name: "Bruno Dev", grade: "12", target_score: 1350 });
await patch("profiles", `id=eq.${olivia}`, {
  name: "Olivia Dev",
  grade: "",
  target_score: 1600,
  role: "owner",
});
console.log("  profiles      3 (olivia promoted to owner)");

/* --------------------------------------------------------- question bank -- */
const text = (en) => ({ en });
await insert(
  "custom_questions",
  [
    {
      id: "sat-math-dev-001",
      exam: "sat",
      subject_id: "sat-math",
      topic: "Linear equations in one variable",
      domain: "Algebra",
      difficulty: 1,
      answer: 2,
      payload: {
        passage: null,
        prompt: text("If $3x + 6 = 21$, what is the value of $x$?"),
        choices: [text("3"), text("4"), text("5"), text("9")],
        explanation: text("Subtract 6 from both sides to get $3x = 15$, then divide by 3."),
        skill: "Linear equations in one variable",
        generatedBy: null,
      },
      created_by: olivia,
    },
    {
      id: "sat-rw-dev-001",
      exam: "sat",
      subject_id: "sat-rw",
      topic: "Words in context",
      domain: "Craft and Structure",
      difficulty: 2,
      answer: 1,
      payload: {
        passage: text(
          "The committee's report was measured, declining to assign blame while still naming every failure it had found.",
        ),
        prompt: text('As used in the sentence, "measured" most nearly means'),
        choices: [text("timed"), text("restrained"), text("hostile"), text("brief")],
        explanation: text(
          'The report avoids blame while still being complete, so "measured" means restrained.',
        ),
        skill: "Words in context",
        generatedBy: null,
      },
      created_by: olivia,
    },
  ],
  { onConflict: "id" },
);
console.log("  questions     2");

/* -------------------------------------------------------------- attempts -- */
// Forty days for Ada so the dashboard, heatmap, streak and weak-areas panels
// have something real to draw, with Math deliberately weaker than Reading so
// "weak areas" has a visible answer. Ten for Bruno, so the two are
// distinguishable and the admin usage figures are not one person's data.
const attempts = [];
for (let d = 0; d < 40; d++) {
  attempts.push({
    account_id: ada,
    question_id: "sat-math-dev-001",
    subject_id: "sat-math",
    exam: "sat",
    topic: "Linear equations in one variable",
    difficulty: 1,
    chosen: d % 3 === 0 ? 0 : 2,
    correct: d % 3 !== 0,
    mode: "practice",
    ms: 32000 + d * 40,
    at: ago(d, 3),
  });
  attempts.push({
    account_id: ada,
    question_id: "sat-rw-dev-001",
    subject_id: "sat-rw",
    exam: "sat",
    topic: "Words in context",
    difficulty: 2,
    chosen: d % 7 === 0 ? 3 : 1,
    correct: d % 7 !== 0,
    mode: "practice",
    ms: 41000 + d * 25,
    at: ago(d, 2),
  });
}
for (let d = 0; d < 10; d++) {
  attempts.push({
    account_id: bruno,
    question_id: "sat-math-dev-001",
    subject_id: "sat-math",
    exam: "sat",
    topic: "Linear equations in one variable",
    difficulty: 1,
    chosen: d % 2 === 0 ? 1 : 2,
    correct: d % 2 !== 0,
    mode: "practice",
    ms: 50000,
    at: ago(d, 5),
  });
}
await insert("attempts", attempts, { onConflict: "account_id,question_id,at,mode" });
console.log(`  attempts      ${attempts.length}`);

/* ----------------------------------------------------------------- mocks -- */
await insert(
  "mocks",
  [
    {
      id: "mock-dev-ada-1",
      account_id: ada,
      exam: "sat",
      score: 1290,
      correct: 78,
      total: 98,
      sections: [
        { subjectId: "sat-rw", score: 650, correct: 41, total: 54 },
        { subjectId: "sat-math", score: 640, correct: 37, total: 44 },
      ],
      wrong: ["sat-math-dev-001"],
      at: ago(18),
    },
    {
      id: "mock-dev-ada-2",
      account_id: ada,
      exam: "sat",
      score: 1380,
      correct: 85,
      total: 98,
      sections: [
        { subjectId: "sat-rw", score: 700, correct: 45, total: 54 },
        { subjectId: "sat-math", score: 680, correct: 40, total: 44 },
      ],
      wrong: ["sat-rw-dev-001"],
      at: ago(4),
    },
  ],
  { onConflict: "id" },
);
console.log("  mocks         2");

/* ------------------------------------------------------------- community -- */
// One post of every type the model allows: the feed renders each through its own
// component, and a seed covering only 'post' and 'question' leaves five card
// layouts untested. Payload shapes mirror payloadFor() in lib/community-state.
/*
 * Posts have no natural unique key, so a second run would simply add another
 * seven. Unlike every other table here — which has an id or a composite key and
 * an ignore-duplicates conflict target — this section has to check first.
 */
const existingPosts = await select("community_posts", "select=id&limit=1");
if (existingPosts.length > 0) {
  console.log("  posts         already present, skipping community fixtures");
  console.log(`\n  Seeded. Sign in as ada.dev@1elevate.dev with your DEV_SEED_PASSWORD.\n`);
  process.exit(0);
}

/*
 * Every object in a PostgREST bulk insert must carry the same keys — it builds
 * one INSERT statement with one column list — so the optional fields are spelled
 * out as null rather than omitted. Leaving them out gives PGRST102 "All object
 * keys must match", which reads like a validation error and is really a shape
 * mismatch between rows.
 */
const post = (row) => ({ topic: null, text: null, ...row });

const posts = await insert("community_posts", [
  post({
    author_id: ada,
    type: "post",
    exam: "sat",
    text: "Started doing twenty minutes before school instead of an hour at night. Sticking to it much better.",
    payload: {},
    created_at: ago(0, 0.6),
  }),
  post({
    author_id: bruno,
    type: "question",
    exam: "sat",
    topic: "Linear equations in one variable",
    text: "I keep getting this one wrong and I cannot see why. Where am I going astray?",
    payload: {
      question: {
        subjectId: "sat-math",
        prompt: "If $3x + 6 = 21$, what is the value of $x$?",
        myAnswer: "A",
        correctAnswer: "C",
        explanationCount: 0,
      },
    },
    created_at: ago(0, 3),
  }),
  post({
    author_id: ada,
    type: "progress",
    exam: "sat",
    text: "Four weeks between these two.",
    payload: {
      progress: {
        fromScore: 1290,
        toScore: 1380,
        mathScore: 680,
        readingWritingScore: 700,
        mockLabel: "Mock Test #2",
      },
    },
    created_at: ago(0, 9),
  }),
  post({
    author_id: ada,
    type: "achievement",
    exam: "sat",
    payload: {
      achievement: {
        emoji: "🔥",
        title: "30-Day Streak",
        detail: "Did not miss a day this month.",
        startScore: 1290,
        currentScore: 1380,
      },
    },
    created_at: ago(1),
  }),
  post({
    author_id: olivia,
    type: "explanation",
    exam: "sat",
    topic: "Words in context",
    payload: {
      explanation: {
        subjectId: "sat-rw",
        title: "Read the sentence before you read the options",
        body: "Cover the four choices, decide what word you would put in the blank yourself, then find the option closest to it. It stops the wrong-but-plausible option from anchoring you.",
      },
    },
    created_at: ago(2),
  }),
  post({
    author_id: bruno,
    type: "study-update",
    exam: "sat",
    topic: "Algebra",
    payload: {
      studyUpdate: {
        subjectId: "sat-math",
        questionsCompleted: 24,
        accuracy: 0.79,
        accuracyDelta: 0.06,
      },
    },
    created_at: ago(3),
  }),
  post({
    author_id: olivia,
    type: "resource",
    exam: "sat",
    topic: "Punctuation",
    payload: {
      resource: {
        title: "One-page comma and semicolon sheet",
        note: "Every punctuation rule that actually shows up, on one side of A4.",
        subjectId: "sat-rw",
      },
    },
    created_at: ago(5),
  }),
]);

const byType = Object.fromEntries(posts.map((p) => [p.type, p.id]));
console.log(`  posts         ${posts.length} (one of each type)`);

const comments = await insert("community_comments", [
  {
    post_id: byType.question,
    author_id: ada,
    text: "Subtract 6 first, then divide by 3 — you are dividing before subtracting.",
    created_at: ago(0, 2),
  },
  {
    post_id: byType.question,
    author_id: olivia,
    text: "Ada has it. Do the same operation to both sides and keep the order.",
    created_at: ago(0, 1),
  },
  {
    post_id: byType.progress,
    author_id: bruno,
    text: "Ninety points in a month is excellent.",
    created_at: ago(0, 7),
  },
  {
    post_id: byType.post,
    author_id: bruno,
    text: "Mornings work far better for me too.",
    created_at: ago(0, 0.3),
  },
  // Exists to be reported, so the moderation queue is not empty on a fresh dev
  // database — an empty queue proves nothing about whether moderation works.
  {
    post_id: byType.post,
    author_id: bruno,
    text: "BUY CHEAP SAT ANSWERS -- CLICK MY PROFILE",
    created_at: ago(0, 0.2),
  },
]);
const reportedComment = comments[comments.length - 1].id;
console.log(`  comments      ${comments.length}`);

await insert(
  "community_reactions",
  [
    { post_id: byType.explanation, account_id: ada, kind: "helpful" },
    { post_id: byType.explanation, account_id: bruno, kind: "helpful" },
    { post_id: byType.question, account_id: olivia, kind: "helpful" },
    { post_id: byType.progress, account_id: bruno, kind: "congrats" },
    { post_id: byType.progress, account_id: olivia, kind: "congrats" },
    { post_id: byType.achievement, account_id: bruno, kind: "congrats" },
  ],
  { onConflict: "post_id,account_id,kind" },
);
await insert(
  "community_saves",
  [
    { post_id: byType.explanation, account_id: ada },
    { post_id: byType.resource, account_id: bruno },
  ],
  { onConflict: "post_id,account_id" },
);
console.log("  reactions     6, saves 2");

await insert(
  "community_reports",
  [
    {
      reporter_id: ada,
      target_type: "comment",
      target_id: reportedComment,
      reason: "spam",
      details: "Selling answers in the replies.",
    },
  ],
  { onConflict: "reporter_id,target_type,target_id" },
);
console.log("  reports       1 (open)");

await insert("feedback", [
  {
    account_id: ada,
    message: "The timer on the Math module keeps its own count when I switch tabs. Is that intended?",
    category: "bug",
  },
  {
    account_id: bruno,
    message: "Could the review queue show which skill each question belongs to?",
    category: "idea",
  },
]);
console.log("  feedback      2");

console.log(
  `\n  Seeded. Sign in as ada.dev@1elevate.dev with your DEV_SEED_PASSWORD.\n`,
);
