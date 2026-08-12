# The database (Supabase)

**If you only read one section, read [Environments](#environments).** It says
which database you are about to write to, and how to check before you do.

The rest of this document is in three parts:

| Part | What it answers |
| --- | --- |
| [Environments](#environments) | dev vs production, migrations, seeding, Vercel, safety |
| [How the access rules work](#how-the-access-rules-work) | why the policies are shaped the way they are |
| [Appendix: standing a project up from nothing](#appendix-standing-a-project-up-from-nothing) | the original one-time setup, kept for reference |

---

# Environments

**There are two Supabase projects. Which one you are talking to is the single
most important thing to know before you type anything.**

| Where the code runs | Supabase project | Contains |
| --- | --- | --- |
| `localhost` | `1elevate-dev` | fake students, safe to destroy |
| Vercel **Preview** (every branch and PR) | `1elevate-dev` | the same |
| Vercel **Production** | `1elevate-prod` — ref `mkxebolzrqwfuvpevtsu` | real students |

Project refs:

| Project | Ref |
| --- | --- |
| Production | `mkxebolzrqwfuvpevtsu` |
| Development | `djrnqwthwzzzcgjaxwel` — `ap-northeast-2`, Postgres 17.6 |

Refs are not secrets — they are the subdomain of a URL that ships in every
browser bundle. Keys are secrets and appear nowhere in this repo.

Nothing in the code picks a project. `src/lib/supabase/client.ts` and
`server.ts` each read one `NEXT_PUBLIC_SUPABASE_URL` and one key, so the choice
is made entirely by which values are present — `.env.local` locally, and the
Vercel dashboard's per-environment variables when deployed.

## How to tell which one you are on

Three ways, in increasing order of how much you should trust them:

1. **The badge beside the wordmark.** `DEV` on localhost, `PREVIEW` on a preview
   deployment, nothing at all on production. If it says **`PROD DATA`** in red,
   stop: you are running a development build against the real database. Hover it
   for the project ref.
2. **`npm run db:which`** — prints the project the Supabase CLI is linked to and
   the one `.env.local` points at, and flags either if it is production. These
   two can differ, and the command says so, because migrations go to the first
   and the app you are testing reads the second.
3. **The network tab.** Whatever the requests actually go to is the truth.

The badge is implemented in `src/lib/environment.ts`. It compares the configured
project ref against a hardcoded production ref rather than trusting an
environment variable to describe itself, so it stays correct however the
variables were set.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Fill in the **development** project's URL and publishable key from
   **Project Settings → API** of `1elevate-dev`.
3. Add `DEV_SEED_PASSWORD=` — any 6+ characters. The seeded accounts share it.
   It lives in `.env.local` and not in git.
4. `SUPABASE_SECRET_KEY` is only needed to run the seed scripts. Use the
   **development** project's secret key. Never put the production one here.
5. `npm run dev`, and check the badge says `DEV`.

`.env.local` is git-ignored and must stay that way. `.env.example` carries the
variable names and never a value.

## Migrations

`supabase/migrations/` is the authoritative history. `supabase/schema.sql` is
frozen — it is still the best prose explanation of the security model, but it is
no longer where changes go.

The history starts with a baseline, `20260811000000_baseline_schema.sql`, which
is a copy of `schema.sql` as production already stood. The two databases reached
that state by different routes on purpose: dev **ran** it, production was
**marked as having run it**. See the header of that file.

### Making a change

```bash
npm run db:new add_follow_graph      # creates supabase/migrations/<ts>_add_follow_graph.sql
```

Write the change in that file. Additive and guarded where it can be — the rest of
this schema is, and it is a habit worth keeping.

### Applying it to development

```bash
npm run db:which     # confirm the link is dev, not production
npm run db:push      # refuses outright if the linked project is production
```

`db:push` runs `scripts/db-guard.mjs` first. The guard fails closed: no link, or a
link it cannot identify, is a refusal too.

### Getting a migration into production

Deliberately not a script. There is no `npm run` that can touch production,
because the entire point of the guard is that no convenience command can.

When a migration has been applied to dev, reviewed, and merged to `main`:

```bash
npx supabase link --project-ref mkxebolzrqwfuvpevtsu
npx supabase migration list          # read it. confirm exactly what is pending
npx supabase db push                 # applies only what production has not had
npx supabase link --project-ref djrnqwthwzzzcgjaxwel   # link back, immediately
```

Relink to dev in the same sitting. A repo left linked to production is the
loaded gun this whole arrangement exists to unload.

## Seeding

Seeding is a **development-only** operation. There is no supported way to seed
production and there must never be one.

```bash
npm run db:seed:auth    # creates the three @1elevate.dev Auth users
npm run db:seed         # attaches Community + learning fixtures to them
```

In that order — the fixtures look their authors up by email and raise a clear
error if the accounts are missing.

The split exists because Auth users are not really SQL rows: a working account
needs a password hash and an `auth.identities` row, both internal to the Auth
service. `scripts/seed-auth.mjs` calls the Admin API instead of guessing at the
internals.

Seeded accounts, all sharing `DEV_SEED_PASSWORD`:

| Email | Role | For |
| --- | --- | --- |
| `ada.dev@1elevate.dev` | student | Student A. Has 40 days of history, so the dashboard, heatmap and weak areas are populated |
| `bruno.dev@1elevate.dev` | student | Student B. The other side of every cross-user permission test |
| `olivia.dev@1elevate.dev` | **owner** | Admin surfaces: Moderation, People, Sections |

No mail is ever sent to these addresses: `seed-auth.mjs` creates them through the
Admin API with `email_confirm` set, which sends nothing, and they exist only in
the dev project's `auth.users`.

`@1elevate.test` would have been the tidier choice — `.test` is reserved by RFC
2606 and cannot resolve — but Supabase's address validator rejects both `.test`
and `example.com`, so a seed built on either cannot create a single account.

The fixtures cover one post of every type the model allows, comments, reactions,
a save, an open report so the moderation queue is not empty, two bank questions,
two mock results and forty days of attempts.

### Resetting development

There is no `db:reset` script, on purpose. `supabase db reset` is local-only in
the installed CLI version, and adding a remote-reset convenience is exactly the
footgun this phase was asked to avoid. To start dev over: delete the rows you
care about in the dev SQL Editor, or delete and recreate the dev project, then
re-run migrations and the seed.

## Vercel

One variable name per environment, three different values. **Settings →
Environment Variables**, and each variable is scoped by ticking environments:

| Variable | Production | Preview | Development |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | prod URL | **dev URL** | **dev URL** |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | prod key | **dev key** | **dev key** |
| `SUPABASE_SECRET_KEY` | prod secret, if ever needed | dev secret | dev secret |
| `ANTHROPIC_API_KEY` | same in all three | | |

`NEXT_PUBLIC_APP_ENV` should be left unset. Vercel already exposes
`NEXT_PUBLIC_VERCEL_ENV`, which is `production` on the production deployment and
`preview` on every branch build, and the app reads it.

### Preview URLs and auth redirects

`sendPasswordReset` sends `${window.location.origin}/auth/reset`, so a reset link
only works if that exact origin is on the dev project's redirect list —
**Authentication → URL Configuration**. Preview URLs contain a per-deployment
hash, so they cannot be listed individually; the wildcard in
`supabase/config.toml` pins the project scope so it matches this project's
previews and nothing else on `vercel.app`.

Do not add preview or localhost URLs to the **production** project's redirect
list. Production only ever needs its own domain.

## Safety — before you run a destructive test

Ask the three questions in order, and stop at the first "production":

1. What does the badge say? `DEV` or `PREVIEW` is fine. `PROD DATA` means stop.
2. What does `npm run db:which` say?
3. Is the thing you are about to run capable of writing? If you are unsure what
   a Supabase CLI command targets, run `npx supabase projects list` and look,
   rather than assuming the link is where you left it.

What is guarded, and what is not:

- `npm run db:push`, `npm run db:seed` — guarded. They refuse when the target is
  production, and refuse when they cannot tell.
- `npm run db:seed:auth` — guarded separately, against `.env.local`, because it
  uses the service key rather than the CLI link.
- **Raw `npx supabase ...`** — not guarded. Nothing can guard it. This is why the
  production procedure above ends by relinking to dev.
- **The SQL Editor** — not guarded, and the most dangerous surface there is,
  because the project is a dropdown and the tabs look identical. Check the
  project name in the corner every single time.

Production is never reset, never seeded, and never copied into dev. If a
realistic dataset is ever needed in dev, generate a bigger synthetic one; do not
clone student data.

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

---

## Two rules that keep this safe

**The service role key never reaches the browser.** No `NEXT_PUBLIC_` prefix, no
import from a `"use client"` file. It bypasses every rule above.

**Read through the app's own API routes, not straight from the browser.** The
handlers in `src/app/api/*` run as the student — `userClient(token)` — so the
policies still apply even if a handler has a bug. This gives one place to get
authorisation right instead of one per query.

---

## Appendix: standing a project up from nothing

Historical. Both projects already exist, so nothing in this section is a task —
it is here because it is the only written record of how the pieces fit together,
and it is what you would follow to create a third.

The one part that is **not** historical: step 2 is no longer how schema changes
are applied. Use migrations. See [Environments](#environments).

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

