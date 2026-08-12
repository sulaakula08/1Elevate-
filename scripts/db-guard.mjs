#!/usr/bin/env node
/**
 * Refuses to let a destructive database command run against production.
 *
 * The problem this exists for: `supabase db reset --linked` and `supabase db
 * push` act on whichever project the repo is currently linked to, and the link
 * is a file in supabase/.temp that nobody looks at. Two developers, or the same
 * developer on two days, can have the same command in the same repo mean two
 * different databases. One of those databases has real students in it.
 *
 * So every npm script that can write to a remote database goes through here
 * first. It resolves what the command would actually target and exits non-zero
 * if that is production, before the CLI is invoked at all.
 *
 * Usage:
 *   node scripts/db-guard.mjs            # assert the target is not production
 *   node scripts/db-guard.mjs --print    # just report what it resolved
 *
 * Deliberately dependency-free and deliberately fail-closed: if it cannot work
 * out what the target is, that is a refusal too. A guard that waves through the
 * cases it does not understand is not a guard.
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Kept in step with PRODUCTION_PROJECT_REF in src/lib/environment.ts. */
const PRODUCTION_PROJECT_REF = "mkxebolzrqwfuvpevtsu";

/** The linked project ref, which is what the Supabase CLI will act on. */
function linkedRef() {
  const path = join(ROOT, "supabase", ".temp", "project-ref");
  if (!existsSync(path)) return null;
  const value = readFileSync(path, "utf8").trim();
  return value.length > 0 ? value : null;
}

/**
 * The ref in .env.local, which is what the *app* talks to.
 *
 * Not what the CLI uses, and reported separately for that reason — but a
 * mismatch between the two is worth seeing, because it means the database you
 * are about to migrate is not the one you have been testing against.
 */
function envRef() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return null;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+?)\s*$/.exec(line);
    if (!match) continue;
    const url = match[1].replace(/^["']|["']$/g, "");
    const ref = /^https?:\/\/([a-z0-9-]+)\.supabase\.(co|in)/i.exec(url);
    return ref ? ref[1] : null;
  }
  return null;
}

const linked = linkedRef();
const env = envRef();
const printOnly = process.argv.includes("--print");

const describe = (ref) =>
  ref === null
    ? "not set"
    : ref === PRODUCTION_PROJECT_REF
      ? `${ref}  <-- PRODUCTION`
      : ref;

console.log(`  Supabase CLI is linked to : ${describe(linked)}`);
console.log(`  .env.local points at      : ${describe(env)}`);

if (printOnly) {
  if (linked && env && linked !== env) {
    console.log(
      "\n  Note: these differ. Migrations would go to the linked project, but the\n" +
        "  app you are testing reads the other one.",
    );
  }
  process.exit(0);
}

if (linked === null) {
  console.error(
    "\n  Refusing to run: no project is linked, so there is no way to tell what\n" +
      "  this command would touch.\n\n" +
      "  Link the development project first:\n" +
      "    npx supabase link --project-ref djrnqwthwzzzcgjaxwel\n",
  );
  process.exit(1);
}

if (linked === PRODUCTION_PROJECT_REF) {
  console.error(
    "\n  ==================================================================\n" +
      "  REFUSING TO RUN. This repo is linked to the PRODUCTION project.\n" +
      "  ==================================================================\n\n" +
      "  The command you ran can write to, reset or seed the database it is\n" +
      "  pointed at, and it is pointed at the one with real students in it.\n\n" +
      "  If you meant to work on development, relink:\n" +
      "    npx supabase link --project-ref djrnqwthwzzzcgjaxwel\n\n" +
      "  If you genuinely need to apply a migration to production, do it\n" +
      "  deliberately and not through a convenience script — see DATABASE.md,\n" +
      "  'Getting a migration into production'.\n",
  );
  process.exit(1);
}

console.log(`\n  Target is not production. Proceeding.\n`);
