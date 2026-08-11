#!/usr/bin/env node
/**
 * Applies supabase/seed.sql to the development project.
 *
 * Run scripts/db-guard.mjs first — the npm script does — so by the time this
 * executes, the linked project is known not to be production. This script then
 * checks the same thing again against its own target, because it resolves that
 * target differently (from .env.local, not from the CLI link) and a guard that
 * checks a different thing from the one it protects is decoration.
 *
 * There is no Supabase CLI command that runs arbitrary SQL against a hosted
 * project — `db push` applies migrations, and `db reset` is local-only in the
 * installed version. Seeds must not be migrations: a migration reaches
 * production eventually, and fake students reaching production is the precise
 * thing this whole phase exists to prevent.
 *
 * So this uses the Management API's query endpoint, which needs a personal access
 * token rather than the project's service key. If no token is available it says
 * so and prints the two-line manual alternative instead of failing obscurely.
 *
 * Usage:  npm run db:seed
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTION_PROJECT_REF = "mkxebolzrqwfuvpevtsu";
const SEED_PATH = join(ROOT, "supabase", "seed.sql");

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
      "  This script inserts fake students. Point it at development first.",
  );
}

if (!existsSync(SEED_PATH)) die(`No seed file at ${SEED_PATH}.`);
const sql = readFileSync(SEED_PATH, "utf8");

const token = env.SUPABASE_ACCESS_TOKEN;

function manualInstructions(reason) {
  console.log(
    `\n  ${reason}\n\n` +
      `  Apply the seed by hand instead — it is one paste:\n\n` +
      `    1. Open the SQL Editor for project ${ref}\n` +
      `       https://supabase.com/dashboard/project/${ref}/sql/new\n` +
      `    2. Paste the whole of supabase/seed.sql and run it.\n\n` +
      `  Run \`npm run db:seed:auth\` first if you have not: the seed attaches its\n` +
      `  fixtures to those three accounts and raises a clear error without them.\n`,
  );
}

if (!token) {
  manualInstructions(
    "SUPABASE_ACCESS_TOKEN is not set, so the Management API is not reachable from here.",
  );
  process.exit(0);
}

console.log(`\n  Seeding development project ${ref}…`);

const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({ query: sql }),
});

if (!response.ok) {
  const detail = await response.text().catch(() => "");
  // A 404 here usually means the token is valid but has no access to this
  // project, which is worth distinguishing from the seed SQL itself failing.
  if (response.status === 404) {
    manualInstructions(
      `The Management API returned 404 for project ${ref} — the token may not have access to it.`,
    );
    process.exit(0);
  }
  die(`Seed failed: ${response.status} ${detail.slice(0, 500)}`);
}

console.log(
  `\n  Seeded. Sign in as ada.dev@1elevate.test with your DEV_SEED_PASSWORD.\n`,
);
