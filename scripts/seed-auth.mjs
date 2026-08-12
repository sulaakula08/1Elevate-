#!/usr/bin/env node
/**
 * Creates the three development Auth users.
 *
 * Separate from seed-db.mjs because Auth users are not really SQL rows.
 * Creating one properly means a bcrypt password hash and a matching
 * auth.identities row, both of which are the Auth service's private business —
 * hand-rolling them with crypt() works until Supabase changes its internals, and
 * then sign-in fails with an error that points nowhere. The Admin API is the
 * supported way, so this calls it.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY from .env.local, and
 * refuses to do anything if that URL is the production project. The service key
 * bypasses row-level security completely, which is exactly why this script is
 * the one that most needs the check.
 *
 * The password comes from DEV_SEED_PASSWORD in .env.local. There is deliberately
 * no default: a password committed to a repo is a password, even a throwaway
 * one, and the moment it has a default someone will reuse it somewhere it
 * matters.
 *
 * Usage:  npm run db:seed:auth
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTION_PROJECT_REF = "mkxebolzrqwfuvpevtsu";

/** Minimal .env.local reader — no dependency, and it only needs three keys. */
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

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
const password = env.DEV_SEED_PASSWORD;

function die(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

if (!url) die("NEXT_PUBLIC_SUPABASE_URL is not set. See .env.example.");

const ref = /^https?:\/\/([a-z0-9-]+)\.supabase\.(co|in)/i.exec(url)?.[1] ?? null;

if (ref === PRODUCTION_PROJECT_REF) {
  die(
    "REFUSING TO RUN: NEXT_PUBLIC_SUPABASE_URL points at the PRODUCTION project.\n" +
      "  This script creates accounts. Point .env.local at the development project first.",
  );
}
if (ref === null) {
  die(`Could not read a Supabase project ref from ${url}. Refusing to guess.`);
}

const publishableKey =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Two ways to create the accounts, and the difference is worth knowing.
 *
 *   Admin API, with the service key — the better one. It confirms the address on
 *   creation, so the account works regardless of the project's confirmation
 *   setting, and re-running is idempotent.
 *
 *   Public signup, with the publishable key — the fallback. It is the same call
 *   the sign-up form makes, so it only works when the dev project has email
 *   confirmation switched off, which dev should have anyway.
 *
 * The fallback exists because the service key is the one credential a developer
 * has no other reason to put in .env.local, and being unable to seed for want of
 * it is a poor trade when the publishable key is already there and sufficient.
 *
 * Either way this cannot touch production: the ref check above ran first.
 */
const mode = serviceKey && !serviceKey.startsWith("<") ? "admin" : "signup";

if (mode === "signup" && !publishableKey) {
  die(
    "Neither SUPABASE_SECRET_KEY nor NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is usable.\n" +
      "  Set at least the publishable key of the DEVELOPMENT project in .env.local.",
  );
}
if (!password) {
  die(
    "DEV_SEED_PASSWORD is not set in .env.local.\n" +
      "  Choose any password of 6+ characters — these are throwaway accounts on a\n" +
      "  throwaway database. It is read from .env.local rather than hardcoded so it\n" +
      "  never lands in git.",
  );
}
if (password.length < 6) die("DEV_SEED_PASSWORD must be at least 6 characters (Supabase minimum).");

/**
 * The cast. Roles are not set here — seed-db.mjs promotes Olivia to owner,
 * because `role` is not something the Auth API knows about.
 */
const USERS = [
  { email: "ada.dev@1elevate.dev", name: "Ada Dev" },
  { email: "bruno.dev@1elevate.dev", name: "Bruno Dev" },
  { email: "olivia.dev@1elevate.dev", name: "Olivia Dev" },
];

const activeKey = mode === "admin" ? serviceKey : publishableKey;
const headers = {
  apikey: activeKey,
  authorization: `Bearer ${activeKey}`,
  "content-type": "application/json",
};

console.log(`\n  Development project: ${ref}`);
console.log(
  `  Creating ${USERS.length} test users via ${
    mode === "admin" ? "the Admin API" : "public signup (no service key set)"
  }…\n`,
);

let created = 0;
let existing = 0;

for (const user of USERS) {
  const endpoint = mode === "admin" ? "/auth/v1/admin/users" : "/auth/v1/signup";
  const payload =
    mode === "admin"
      ? {
          email: user.email,
          password,
          // Confirmed on creation, so a dev account can sign in immediately
          // without anyone opening a mailbox. Whether new sign-ups need
          // confirmation is a separate dashboard setting; this only concerns
          // these three.
          email_confirm: true,
          // Read by the handle_new_user trigger to populate profiles.name.
          user_metadata: { name: user.name },
        }
      : {
          email: user.email,
          password,
          // Same field the sign-up form sends, and the same field the trigger
          // reads. `data` rather than `user_metadata` is the public endpoint's
          // spelling of it.
          data: { name: user.name },
        };

  const response = await fetch(`${url}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    created++;
    console.log(`  created  ${user.email}`);
    continue;
  }

  const body = await response.json().catch(() => ({}));
  const message = String(body.msg ?? body.message ?? body.error_description ?? "");

  // Already there from a previous run. Re-running this script is meant to be
  // boring, so an existing user is a success, not a failure.
  if (response.status === 422 || /already been registered|already exists/i.test(message)) {
    existing++;
    console.log(`  exists   ${user.email}`);
    continue;
  }

  die(`Failed to create ${user.email}: ${response.status} ${message}`);
}

console.log(
  `\n  Done — ${created} created, ${existing} already present.\n` +
    `  All three share the DEV_SEED_PASSWORD from .env.local.\n` +
    `  Next: npm run db:seed   (attaches the Community and learning fixtures)\n`,
);
