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

## Step 5 — Make yourself the admin

There is no button for this on purpose — a student who could set their own role
could make themselves an admin. Sign up through the app normally, then run this
once in the SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

From then on `is_admin()` is true for you, which is what opens the whole
question bank for writing and every student's rows for reading.

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

Two details in `schema.sql` that look odd and are deliberate:

`is_admin()` is `SECURITY DEFINER`. A policy on `profiles` that asked "is this
user an admin?" by selecting from `profiles` would re-enter its own policy and
recurse forever. A definer function runs as its owner, skips RLS, and breaks the
cycle. Its `search_path` is pinned for the same reason such functions usually
are: one that resolves names through the caller's path can be hijacked.

The `handle_new_user` trigger creates a profile row on signup. Without it a
student authenticates successfully and then has nowhere to keep a target score.

## Two rules that keep this safe

**The service role key never reaches the browser.** No `NEXT_PUBLIC_` prefix, no
import from a `"use client"` file. It bypasses every rule above.

**Read through the app's own API routes, not straight from the browser.** The
handlers in `src/app/api/*` run as the student — `userClient(token)` — so the
policies still apply even if a handler has a bug. This gives one place to get
authorisation right instead of one per query.
