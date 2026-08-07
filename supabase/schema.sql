-- 1Elevate — database schema for Supabase (Postgres).
--
-- Run this once in the Supabase SQL Editor. It is written to be re-runnable:
-- every statement is guarded, so running it twice changes nothing.
--
-- The security model in one sentence: a student can only ever touch their own
-- rows, an admin can read everything, and the question bank is readable by any
-- signed-in student but writable only by an admin.
--
-- Row-level security is what enforces that, and it is enabled on every table
-- below. Without it, any key that reaches a browser can read the whole table.
--
-- ── On the order of this file ──────────────────────────────────────────────
-- Postgres resolves what a statement names at the moment it runs, so the order
-- here is load-bearing, not stylistic:
--
--   1. the profiles table       — is_admin() reads from it
--   2. is_admin()               — every policy below calls it
--   3. policies, other tables, and the signup trigger
--
-- Declaring the helper at the bottom, where it reads more naturally, fails with
-- "function public.is_admin() does not exist" on the first policy.
--
-- ── RLS is not the whole story ─────────────────────────────────────────────
-- A policy decides which ROWS a statement may touch. It cannot decide which
-- COLUMNS. Anything that must not be self-assigned — `role`, above all — needs
-- a column-level GRANT as well, and there is one further down. Policies alone
-- let a student send one PATCH to the REST API and make themselves an admin.

-- ---------------------------------------------------------------- profiles --
-- One row per signed-in student. `id` is the same id Supabase Auth issues, so
-- the profile and the login are the same person by construction; there are no
-- passwords here, because Supabase Auth owns them.

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  name         text not null default '',
  email        text not null default '',
  grade        text not null default '',
  role         text not null default 'student' check (role in ('student', 'admin')),
  target_score int  not null default 1400 check (target_score between 400 and 1600),
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------------ helper --
-- Defined here, before the first policy that calls it.
--
-- SECURITY DEFINER is a necessity, not a convenience: a policy on profiles that
-- asked "is this user an admin?" by selecting from profiles would re-enter that
-- same policy and recurse forever. A definer function runs as its owner, skips
-- RLS, and breaks the cycle.
--
-- `search_path` is pinned because a definer function that resolves names
-- through the caller's path can be pointed at tables the caller controls.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- --------------------------------------------------------- profile access --

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Deliberately no INSERT policy: profiles are created by the trigger at the
-- bottom, and no DELETE policy, because closing an account is not self-service.

-- The policy above says WHICH ROW a student may update — their own. It says
-- nothing about which columns, and on its own that is a privilege escalation:
--
--   PATCH /rest/v1/profiles?id=eq.<self>  {"role":"admin"}
--
-- succeeds, because the row is theirs. The API route drops `role` from its
-- payload, but the route is not the only way in — the publishable key ships in
-- every browser and PostgREST is reachable directly.
--
-- Column-level privileges are the fix, and they are checked independently of
-- RLS: revoke UPDATE wholesale, then grant it back only on the three columns a
-- student is allowed to edit. `role` is not among them, so the PATCH above now
-- fails with "permission denied for table profiles" no matter which row it
-- targets. INSERT and DELETE go too; the trigger below is SECURITY DEFINER and
-- is unaffected, as is anything using the service key.
--
-- SELECT is deliberately left alone — reading is already governed by the read
-- policy above.

revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (name, grade, target_score) on public.profiles to authenticated;

-- ---------------------------------------------------------------- attempts --
-- Append-only log of answered questions. Everything on the progress page is
-- derived from this table.

create table if not exists public.attempts (
  id          bigserial primary key,
  account_id  uuid not null references public.profiles (id) on delete cascade,
  question_id text not null,
  subject_id  text not null,
  exam        text not null,
  topic       text not null,
  difficulty  int,
  chosen      int  not null,
  correct     boolean not null,
  mode        text not null check (mode in ('practice', 'mock', 'review')),
  ms          int  not null default 0,
  at          timestamptz not null default now()
);

-- Every analytics query filters by student, newest first.
create index if not exists attempts_by_account on public.attempts (account_id, at desc);

-- An attempt carries no client-side id, so the sync layer identifies one by
-- who answered, which question, when, and in which mode. The unique index below
-- makes that identity real, which is what lets the API insert with ON CONFLICT
-- DO NOTHING: a retry after a dropped connection becomes a no-op instead of a
-- second copy of the same answer.
--
-- The delete runs first because CREATE UNIQUE INDEX fails outright if the table
-- already holds duplicates — which it will, on any database that synced before
-- this index existed. It keeps the lowest id of each group and removes the rest,
-- so it only ever deletes rows that are byte-for-byte repeats of a row it keeps.
-- On a clean table it matches nothing, which keeps this file re-runnable.
--
-- The same question cannot genuinely be answered twice in one millisecond in
-- one mode, so this never rejects a real attempt.

delete from public.attempts a
using public.attempts b
where a.id > b.id
  and a.account_id  = b.account_id
  and a.question_id = b.question_id
  and a.at          = b.at
  and a.mode        = b.mode;

create unique index if not exists attempts_unique_answer
  on public.attempts (account_id, question_id, at, mode);

alter table public.attempts enable row level security;

drop policy if exists "attempts: read own or admin" on public.attempts;
create policy "attempts: read own or admin"
  on public.attempts for select
  using (account_id = auth.uid() or public.is_admin());

-- `with check` and not `using`: this is the rule for rows being written, and it
-- is what stops a student posting an attempt under someone else's id.
drop policy if exists "attempts: insert own" on public.attempts;
create policy "attempts: insert own"
  on public.attempts for insert
  with check (account_id = auth.uid());

-- No update or delete policy: the log is append-only, so a student cannot
-- rewrite history to improve their own analytics.

-- ------------------------------------------------------------------- mocks --

create table if not exists public.mocks (
  id         text primary key,
  account_id uuid not null references public.profiles (id) on delete cascade,
  exam       text not null,
  score      int  not null,
  correct    int  not null,
  total      int  not null,
  sections   jsonb not null default '[]'::jsonb,
  wrong      jsonb not null default '[]'::jsonb,
  at         timestamptz not null default now()
);

create index if not exists mocks_by_account on public.mocks (account_id, at desc);

alter table public.mocks enable row level security;

drop policy if exists "mocks: read own or admin" on public.mocks;
create policy "mocks: read own or admin"
  on public.mocks for select
  using (account_id = auth.uid() or public.is_admin());

-- Insert only, and no update policy on purpose: a finished exam is a fact, not
-- a draft. The API relies on this — it writes with ON CONFLICT DO NOTHING, so a
-- re-sent mock is ignored rather than taking an UPDATE path that RLS refuses.
drop policy if exists "mocks: insert own" on public.mocks;
create policy "mocks: insert own"
  on public.mocks for insert
  with check (account_id = auth.uid());

-- -------------------------------------------------------- custom questions --
-- The shared bank written in the admin editor. Every student reads it; only an
-- admin writes it.

create table if not exists public.custom_questions (
  id         text primary key,
  exam       text not null,
  subject_id text not null,
  topic      text not null,
  domain     text,
  difficulty int  not null check (difficulty between 1 and 3),
  payload    jsonb not null,
  answer     int  not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.custom_questions enable row level security;

drop policy if exists "questions: read signed in" on public.custom_questions;
create policy "questions: read signed in"
  on public.custom_questions for select
  to authenticated
  using (true);

drop policy if exists "questions: write admin" on public.custom_questions;
create policy "questions: write admin"
  on public.custom_questions for all
  using (public.is_admin())
  with check (public.is_admin());

-- --------------------------------------------------------- signup trigger --
-- A profile for every new signup, filled from whatever the sign-up form passed
-- as metadata. Without this a student authenticates successfully and then has
-- nowhere to store a target score.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------ making admins --
-- There is no UI for this on purpose, and after the column grant above there
-- cannot be one: `role` is not writable by any signed-in user, only through the
-- SQL editor or the service key. Sign up normally, then run this once with your
-- own address:
--
--   update public.profiles set role = 'admin' where email = 'you@example.com';
--
-- To check nobody has escalated already, on a database that ran an earlier
-- version of this file:
--
--   select email, role from public.profiles where role = 'admin';
