# Adding a database on Vercel

Right now 1Elevate stores everything in the browser (`src/lib/storage.ts`, `localStorage`
under the `elevate.*` prefix). That is why the footer says "Local build — everything is
stored in this browser": clear the browser and the profile is gone, and a student cannot
open their progress on a second device.

This is the shortest path from that to a real database, using Postgres on Vercel. Every
step is something you do once.

---

## Step 1 — Create the database (2 minutes, no card)

1. Push this repo to GitHub and import it at [vercel.com/new](https://vercel.com/new), if
   it is not deployed already.
2. Open the project → **Storage** tab → **Create Database**.
3. Pick **Neon — Serverless Postgres** (this is what "Vercel Postgres" is today). The free
   plan is enough for a school-sized user base.
4. Region: choose the one closest to your users (`eu-central` for Kazakhstan/Europe).
5. Click **Connect** and tick the environments (Production, Preview, Development).

Vercel now injects the connection variables into the project automatically — you never
paste a connection string by hand. The one you will use is `DATABASE_URL`.

## Step 2 — Get the same variables locally

```bash
npx vercel link
```

```bash
npx vercel env pull .env.local
```

`.env.local` is already git-ignored by the Next.js default `.gitignore`. Keep it that way —
that file is a live credential.

## Step 3 — Install the driver

```bash
npm install @neondatabase/serverless
```

That is enough on its own. Add an ORM only if you want one; `drizzle-orm` is the lightest
fit for this project if you do.

## Step 4 — Create the tables

In Vercel: **Storage → your database → Query** (Neon calls it the SQL Editor). Paste this
and run it. The columns mirror the types in `src/lib/storage.ts`, so the app's existing
shapes carry over unchanged.

```sql
create table accounts (
  id            text primary key,
  name          text not null unique,
  email         text not null,
  grade         text not null default '',
  pin_hash      text not null,
  role          text not null default 'student',
  target_score  int  not null default 1400,
  created_at    timestamptz not null default now()
);

create table attempts (
  id           bigserial primary key,
  account_id   text not null references accounts(id) on delete cascade,
  question_id  text not null,
  subject_id   text not null,
  exam         text not null,
  topic        text not null,
  difficulty   int,
  chosen       int  not null,
  correct      boolean not null,
  mode         text not null,          -- practice | mock | review
  ms           int  not null default 0,
  at           timestamptz not null default now()
);

-- Every analytics query in src/lib/stats.ts filters by account, newest first.
create index attempts_by_account on attempts (account_id, at desc);

create table mocks (
  id          text primary key,
  account_id  text not null references accounts(id) on delete cascade,
  exam        text not null,
  score       int  not null,
  correct     int  not null,
  total       int  not null,
  sections    jsonb not null,          -- MockSectionResult[]
  wrong       jsonb not null,          -- question ids, for the review queue
  at          timestamptz not null default now()
);

create table custom_questions (
  id          text primary key,
  exam        text not null,
  subject_id  text not null,
  topic       text not null,
  domain      text,
  difficulty  int  not null,
  payload     jsonb not null,          -- passage / prompt / choices / explanation
  answer      int  not null,
  created_at  timestamptz not null default now()
);
```

## Step 5 — Talk to it from the app

One module, imported only by server code:

```ts
// src/lib/db.ts
import { neon } from "@neondatabase/serverless";

/** Server-only. Importing this from a "use client" file will (correctly) fail. */
export const sql = neon(process.env.DATABASE_URL!);
```

Then a route handler per operation, next to the existing `src/app/api/explain/route.ts`:

```ts
// src/app/api/attempts/route.ts
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
  const { accountId, attempts } = await request.json();
  for (const a of attempts) {
    await sql`
      insert into attempts
        (account_id, question_id, subject_id, exam, topic, difficulty, chosen, correct, mode, ms)
      values
        (${accountId}, ${a.questionId}, ${a.subjectId}, ${a.exam}, ${a.topic},
         ${a.difficulty ?? null}, ${a.chosen}, ${a.correct}, ${a.mode}, ${a.ms})
    `;
  }
  return NextResponse.json({ ok: true });
}
```

Tagged-template values are sent as bound parameters, so this is not string concatenation
and is not open to SQL injection.

## Step 6 — Point the app at it

`src/lib/app-state.tsx` is the only place the app reads and writes storage — that is the
single seam you change. `recordAttempts` currently writes to `localStorage`; make it POST
to `/api/attempts` and keep the local write as an offline cache if you want the app to
survive a dropped connection.

Do it one table at a time. Attempts first (it is append-only and the least risky), then
mock results, then custom questions, and accounts last.

## Step 7 — Deploy

```bash
git push
```

Vercel builds on push, and the database variables are already in the environment. Nothing
else to configure.

---

## One thing to decide before accounts move

The current PIN is deliberately not real authentication — `hashPin` says so in the code,
and any user of the browser can open any local profile. That is fine while the data is
local. The moment profiles live in a shared database, a stolen or guessed PIN reaches
another student's data from anywhere.

So when you get to the accounts table, use a real auth provider rather than moving the PIN
check to the server. [Auth.js](https://authjs.dev) with a Google or email provider drops
into Next.js and removes the need to store any password yourself. Keep `accounts` as the
profile table (target score, grade, role) and let the provider own identity.
