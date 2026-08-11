# Connecting the database (Supabase)

Right now 1Elevate keeps everything in the browser (`src/lib/storage.ts`, under
the `elevate.*` prefix in `localStorage`). That is why the footer says the data
lives in this browser: clear the browser and the profile is gone, and a student
cannot open their progress on a second device.

This is how it moves to a real database. Supabase is Postgres with a login
system attached, which matters here because the app has a second problem to
solve — the PIN is not real authentication — and one service covers both.

Everything below is already written into the repo. What is left is creating the
project and doing the switch-over table by table.

---

## What is in the repo already

| File | What it does |
| --- | --- |
| `supabase/schema.sql` | Tables, indexes and every access rule. Re-runnable. |
| `src/lib/supabase/server.ts` | Server-side clients. Never import from a client component. |
| `src/lib/supabase/client.ts` | Browser client: sign in, sign out, `apiFetch`. |
| `src/app/api/attempts/route.ts` | Save and read the attempt log. |
| `src/app/api/profile/route.ts` | Read and update the signed-in profile. |
| `.env.example` | The variables to fill in. |

Until the environment variables exist, every one of those routes answers `503`
with a clear message and the app keeps working exactly as it does today.

## Step 1 — Create the project

1. Sign up at [supabase.com](https://supabase.com) and create a project.
2. Region: the closest one to your students (Frankfurt for Kazakhstan/Europe).
3. Save the database password it gives you — it is shown once. The app does not
   use it, but the dashboard does.

## Step 2 — Create the tables

Open **SQL Editor** in the Supabase dashboard, paste the whole of
[`supabase/schema.sql`](supabase/schema.sql), and run it.

It creates four tables — `profiles`, `attempts`, `mocks`, `custom_questions` —
and turns on row-level security for all of them. Running it twice is safe.

## Step 3 — Fill in the environment

**Project Settings → API** has the values. Copy `.env.example` to `.env.local`
and paste in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The anon key is meant to be public — it grants nothing by itself, because the
policies still apply to whoever the access token says you are. The **service
role** key is the dangerous one: it bypasses every policy. Leave it blank;
nothing in the app needs it today.

Then add the same two variables in Vercel under **Settings → Environment
Variables**, for all three environments, and redeploy.

## Step 4 — Turn on the login methods

**Authentication → Providers**:

- **Email** is on by default. For a school, turn *off* "Confirm email" while
  testing and back on before real students use it.
- **Google** is worth adding — students have an account already and there is no
  password to forget.

Then **Authentication → URL Configuration**: add your Vercel URL and
`http://localhost:3000` to the redirect list, or the sign-in link will bounce.

## Step 5 — Make yourself the owner

There are three roles:

| Role | Can do |
| --- | --- |
| `student` | Practise. Read the shared question bank. Read and write only their own rows. |
| `admin` | Everything a student can, plus write and delete questions in the shared bank. |
| `owner` | Everything an admin can, plus appoint and remove admins. |

Exactly one step is manual, and deliberately so: the first owner is what every
other permission is derived from, so there is no way to become one through the
app. Sign up normally, then run this once in the SQL Editor:

```sql
update public.profiles set role = 'owner' where email = 'you@example.com';
```

Everything else happens in the app, under **Admin → People**: appoint admins,
who can then paste questions that every student sees, and demote them again.

Roles change through one function, `set_role()`, and nothing else can write the
column — see the `profiles` note under [Who can read what](#who-can-read-what).
It is `SECURITY DEFINER`, so it runs as its owner and is not bound by the column
grant that blocks everyone else. Its guards are the real rules:

- only an owner may call it;
- only `student` and `admin` can be assigned, so the UI cannot mint an owner;
- you cannot change your own role, so the last owner cannot demote themselves
  and lock the project out of its own admin controls;
- an existing owner cannot be demoted through it, so two owners cannot strip
  each other in a race.

A second owner is therefore also a SQL Editor job. Worth doing for one trusted
person: if the only owner loses their account, nobody can appoint anyone.

```sql
select email, role from public.profiles where role <> 'student';
```

## Step 6 — Switch the app over, one table at a time

`src/lib/app-state.tsx` is the only place the app reads and writes storage. That
is the seam. Do this in order, smallest risk first:

1. **`attempts`** — append-only. `recordAttempts` also POSTs to `/api/attempts`.
   Nothing can be lost; the worst case is a missing row.
2. **`mocks`** — same shape, written once at the end of a test.
3. **`custom_questions`** — the admin editor writes to the database instead of
   `localStorage`, so every student sees the same bank.
4. **`profiles` and sign-in** — last, because it is the only one that changes
   how a student gets into the app at all.

Keeping the `localStorage` write alongside the network call is a reasonable
intermediate step: the app then still works with no connection, and the database
becomes the copy that survives.

## Step 7 — Deploy

```bash
git push
```

---

## How the access rules work

This is the part worth understanding, because it is what stands between one
student and everybody else's results.

Every table has **row-level security** switched on. That is not a filter the app
applies — it is a rule Postgres enforces on every query, including one sent from
a browser with the anon key. The rules are:

- **`profiles`** — you can read your own row, and update your own `name`,
  `grade` and `target_score`. An admin can read all of them. Nobody can change
  their own `role`, so only the SQL editor can.

  Worth understanding, because it is the one place row-level security is not
  enough on its own: a policy restricts which **rows** a statement may touch,
  never which **columns**. `profiles: update own` says "your row", and `role`
  lives in your row — so under policies alone, `PATCH /rest/v1/profiles` with
  `{"role":"admin"}` succeeded. Sanitising the payload in the API route did not
  help, because the publishable key is in every browser and PostgREST answers
  directly. The fix is a column-level `GRANT`, checked independently of RLS:
  `UPDATE` is revoked on the table and granted back on exactly those three
  columns. That is the `revoke`/`grant` pair in `schema.sql`.
- **`attempts` / `mocks`** — you can read your own rows and insert rows under
  your own id. An admin can read everyone's. Nobody can insert under someone
  else's id, because the check is on the row being written, not on the request.
- **`custom_questions`** — any signed-in student can read; only an admin can
  write.
- **`community_posts` / `community_comments`** — any signed-in student reads
  anything not hidden; you insert only under your own id; you delete only your
  own, and an admin deletes anyone's.

  `hidden_at` is the moderation column, and it is the second place in this file
  where row-level security is not enough on its own. `posts: update own` says
  "your row", and `hidden_at` lives in your row — so under policies alone an
  author whose post had been hidden could send `PATCH
  /rest/v1/community_posts?id=eq.<their own post>` with `{"hidden_at":null}` and
  put it straight back. That is a moderation bypass, so the same column-level
  `GRANT` trick the `profiles` table uses applies here: `UPDATE` is revoked and
  granted back on `text`, `topic` and `payload` only. The one thing that writes
  `hidden_at` is `moderate_hide()`.
- **`community_reports`** — you insert a report under your own id and can read
  your own back; only an admin reads everyone's, and only an admin resolves one.
  Nobody can delete one, because a resolved report is the audit trail.

  A unique index on `(reporter_id, target_type, target_id)` is the duplicate
  defence. It is in the database and not in the API because a script calling the
  endpoint in a loop has to hit something that cannot be raced; the API turns the
  resulting `23505` into a friendly "already reported". A second report of the
  same content by a *different* person is deliberately a separate row — how many
  people reported something is the most useful signal in the queue.

`moderate_hide()` and `moderate_dismiss()` are `SECURITY DEFINER` for the same
reason `set_role()` is: the column grant above leaves `hidden_at` unwritable by
anyone signed in, and these are the single audited doorway that may set it. Each
checks `is_admin()` on its first line, and that check — not anything in the admin
page or the API route — is what makes moderation admin-only. Hiding also settles
the target's open reports in the same statement, so the queue cannot end up
holding open reports against content that is already gone.

Two details in `schema.sql` that look odd and are deliberate:

`is_admin()` is `SECURITY DEFINER`. A policy on `profiles` that asked "is this
user an admin?" by selecting from `profiles` would re-enter its own policy and
recurse forever. A definer function runs as its owner, skips RLS, and breaks the
cycle. Its `search_path` is pinned for the same reason such functions usually
are: one that resolves names through the caller's path can be hijacked.

The `handle_new_user` trigger creates a profile row on signup. Without it a
student authenticates successfully and then has nowhere to keep a target score.

## Environments — one database, and why that is now a problem

Audited August 2026, at the end of Phase 4A. Written down because it is the kind
of thing everyone half-knows and nobody has stated.

**There is one Supabase project, and every environment points at it.**

| Where | Supabase project | How it gets there |
| --- | --- | --- |
| `localhost` | `mkxebolzrqwfuvpevtsu` | `.env.local`, git-ignored, on each developer's machine |
| Vercel preview | `mkxebolzrqwfuvpevtsu` | Vercel env vars, set for all environments |
| Vercel production | `mkxebolzrqwfuvpevtsu` | the same variables |

Next reads `.env.local` only when running locally; on Vercel the dashboard's
variables win. `.env.example` documents the names and holds no values. Nothing in
the app selects a project per environment — `src/lib/supabase/{client,server}.ts`
each read one `NEXT_PUBLIC_SUPABASE_URL` and one key, so "which database" is
decided entirely by which value is present.

The consequence is the thing worth fixing: **running the app locally, or opening a
preview deployment, writes to the database real students use.** A browser test
that publishes a post publishes it to the feed. During this phase that is exactly
what happened — the test rows are listed in the Phase 4A notes and were removed
afterwards — but "remember to clean up" is not a safety model, and a preview
branch with a half-finished migration in it can do worse than add a row.

Two further details found while auditing:

- The local `.env.local` sets no `SUPABASE_SECRET_KEY`, which is correct and worth
  keeping: nothing in the app needs it, and its absence is why a developer's
  machine cannot bypass row-level security even by accident.
- Schema changes are applied by pasting `schema.sql` into the SQL Editor. There is
  no migration history, so "which database is on which version" is answered by
  querying it. That is survivable with one database and stops being survivable
  with two.

### What Phase 4B should do

1. **Create a second Supabase project** — `1elevate-dev`, same region. Run
   `schema.sql` in it; the file is re-runnable and creates everything, so a fresh
   project reaches the current shape in one paste.
2. **Point local and preview at it.** Change each developer's `.env.local`, and in
   Vercel set the variables **per environment** — dev project for Preview and
   Development, production project for Production only. Vercel supports this on
   the same variable name, so no code changes.
3. **Make the app say which one it is on.** A build-time banner or a line in
   Settings showing the project ref, visible to an admin. The current situation is
   dangerous partly because nothing on screen distinguishes the two.
4. **Seed instead of copy.** A small script writing a handful of fake students and
   posts into dev. Do not clone production: it is student data, and the point of
   the exercise is to stop touching it.
5. **Then adopt migrations.** Once there are two databases, `supabase/schema.sql`
   as the single re-runnable file stops being enough. The Supabase CLI's
   `migrations/` directory plus `supabase db push` gives an ordered history and a
   way to know what a project has had applied. Worth doing at the same time as
   step 1, and not before — one database does not need it.

Owner-level access to both the Supabase and Vercel projects is required for steps
1 and 2, so this is not something a coding agent can complete unattended.

## Two rules that keep this safe

**The service role key never reaches the browser.** No `NEXT_PUBLIC_` prefix, no
import from a `"use client"` file. It bypasses every rule above.

**Read through the app's own API routes, not straight from the browser.** The
handlers in `src/app/api/*` run as the student — `userClient(token)` — so the
policies still apply even if a handler has a bug. This gives one place to get
authorisation right instead of one per query.
