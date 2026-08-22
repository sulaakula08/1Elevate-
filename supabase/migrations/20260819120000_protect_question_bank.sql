-- ============================================================================
-- Protect the question bank from bulk extraction — PHASE A of two.
--
-- ── Why this is split ───────────────────────────────────────────────────────
-- The hole this eventually closes, stated plainly: `custom_questions` has one
-- read policy —
--
--     create policy "questions: read signed in"
--       on public.custom_questions for select to authenticated using (true);
--
-- — and no column-level restriction, so any signed-in caller can currently
-- read the whole bank directly: prompts, passages, choices, every explanation
-- and every answer index, in one PostgREST request. That is real, and it is
-- what the rest of this file's sibling, Phase B, closes.
--
-- But the application code deployed to production today reads the table the
-- same unrestricted way — `GET /api/questions` does a plain
-- `.select("...answer, payload, ...author:profiles(email)")`, and the admin
-- editor's save path does `.select("id, created_by")` and an
-- `insert ... on conflict do update`. Revoking that access before the new
-- application code (which reads through the functions below instead) is live
-- would take down Practice, Mock, Review and the admin editor for every user
-- the moment this file committed — confirmed by testing the exact old queries
-- against a fully-migrated schema, not assumed. See the migration-compatibility
-- audit for the full trace.
--
-- So this file is deliberately additive only. It creates everything the NEW
-- application needs — the `skill` column and the four content/admin
-- functions — and grants them, without touching the OLD table-level access at
-- all. After this file: the old direct-select path still works exactly as it
-- does today, AND the new function-based path also works. Both are live at
-- once, which is the whole point of an additive phase — it is the window in
-- which the application can be redeployed with nothing at any moment depending
-- on access that has already been withdrawn.
--
-- Phase B — revoking the table-level access, restricting the grant to
-- taxonomy-only columns, and retiring the old permissive policy — is written
-- and reviewed, but is deliberately NOT a file in this repository yet. It goes
-- in once the new application is confirmed serving 100% of production traffic
-- from the functions this file adds, not before. Applying it earlier would
-- revoke access the still-running old code depends on.
--
-- ── Why column grants and not a policy, when Phase B lands ─────────────────
-- The same reason `profiles.role` and `community_posts.hidden_at` are handled
-- this way, and the note at the top of schema.sql says it: a policy decides
-- which ROWS a statement may touch, never which COLUMNS. "Students may read
-- questions but not their answers" is a statement about columns, so it has to
-- be a GRANT eventually — this file does not yet make that statement.
--
-- ── How the new application reaches content ────────────────────────────────
-- Four SECURITY DEFINER doorways, in the style of `moderate_hide` and
-- `consume_rate`: they run as owner, so — once Phase B lands — they will see
-- columns the caller cannot, and each checks on its first lines who is asking.
-- Right now, before Phase B, they are simply an additional legal path to the
-- same data the table grant already exposes; their access rules do not depend
-- on the table-level lockdown existing, because a SECURITY DEFINER function
-- owned by the table owner bypasses RLS and column grants regardless — this is
-- what makes them safe to ship before Phase A's sibling revoke, and correct
-- once it lands.
--
--   question_bodies(ids)          one page of question content, at most
--                                 MAX_BODIES ids per call, WITHOUT the answer
--                                 and WITHOUT the explanation.
--   check_answer(id, choice)      grades a single submitted choice and returns
--                                 the verdict, the answer and the explanation —
--                                 the only path by which those two are meant to
--                                 leave the database once Phase B lands.
--   question_bank_admin()         whole rows, for the editor. is_admin() only.
--   question_author_count()       one integer for the admin statistics page.
--
-- Rate limiting stays where it already is, in `consume_rate`, called by the API
-- routes in front of these. It is deliberately not enforced in here: these
-- functions answer "may this caller see this row", and mixing a counter into
-- that would make a read fail for two unrelated reasons with one error.
-- ============================================================================

-- ------------------------------------------------------------------- skill --
-- `skill` is taxonomy, so it belongs beside `topic` and `domain` where a
-- student can read it — but it was put inside `payload` on the grounds that
-- "nothing queries it in SQL". Something does now: the review queue groups by
-- `skill ?? topic`, over the student's whole answered history.
--
-- Purely additive and safe before Phase A's sibling lockdown exists: a
-- generated column nobody has granted or restricted yet is exactly as visible
-- as every other column already is — which is to say, fully, to any signed-in
-- caller, same as today. It changes nothing about who can read what; it only
-- gives the new application a place to read `skill` from without a jsonb
-- traversal. `toRow()` in the API keeps putting skill in the payload, this
-- mirrors it for reading, and the two cannot drift because Postgres derives
-- one from the other. `jsonb ->> text` is immutable, which is what makes it
-- legal here.

alter table public.custom_questions
  add column if not exists skill text
  generated always as (payload ->> 'skill') stored;

-- ------------------------------------------------------------------ bodies --
-- Question content for a bounded set of ids.
--
-- The cap is the point. An unbounded id list is `select *` with extra steps: a
-- scraper would pass every id it found in the index and be back where it
-- started. Thirty is comfortably more than any screen needs — a mock module is
-- 27 questions and a review session is 15 — and small enough that draining a
-- large bank means hundreds of rate-limited round trips rather than one. That
-- limit matters once Phase B lands and this becomes the only way to reach
-- content; until then it is simply already-correct behaviour for the day it
-- does.

create or replace function public.question_bodies(ids text[])
returns table (
  id          text,
  exam        text,
  subject_id  text,
  topic       text,
  domain      text,
  difficulty  int,
  payload     jsonb
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  wanted int := coalesce(array_length(ids, 1), 0);
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;

  if wanted = 0 then
    return;
  end if;

  if wanted > 30 then
    raise exception 'At most 30 questions per request (asked for %).', wanted
      using errcode = '22023';
  end if;

  return query
    select
      q.id,
      q.exam,
      q.subject_id,
      q.topic,
      q.domain,
      q.difficulty,
      -- The two keys a student has not earned yet are removed here, in the
      -- database, rather than in the route that calls this. A filter in
      -- TypeScript is a filter someone can forget to apply to a new caller;
      -- this one cannot be forgotten because there is no version of the row
      -- that ever contains them.
      (q.payload - 'explanation') as payload
    from public.custom_questions q
    where q.id = any(ids);
end;
$$;

revoke execute on function public.question_bodies(text[]) from anon, public;
grant execute on function public.question_bodies(text[]) to authenticated;

-- ------------------------------------------------------------------ answer --
-- Grade one submitted choice.
--
-- Once Phase B lands, this becomes the only route by which `answer` or
-- `explanation` leave the database for a student. Today it is an additional,
-- narrower way to learn them — the table grant still offers them directly —
-- but it is already written to the final, correct contract, so nothing about
-- its behaviour changes when Phase B does.
--
-- It does deliberately return the explanation on a wrong answer, because that
-- is the product: a miss is where the teaching happens. So yes — somebody
-- willing to call this once per question can accumulate explanations. That is
-- a rate-limiting problem, handled by `consume_rate` in the route.
--
-- `choice` is validated rather than trusted: -1 is how the caller says "reveal
-- without answering", which the practice UI needs for a skipped question, and
-- anything outside the choice range is rejected instead of silently grading as
-- wrong.

create or replace function public.check_answer(question_id text, choice int)
returns table (
  correct     boolean,
  answer      int,
  explanation jsonb
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  row_answer  int;
  row_choices int;
  row_payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;

  /*
   * -1 is the one negative the product means: "reveal it, I gave up", which
   * both practice and a timed-out mock question need. Anything below that is a
   * malformed call rather than an answer, and it is rejected here as well as
   * in the route — this function is granted to `authenticated`, so it is
   * reachable over RPC without the route in front of it and cannot rely on
   * that check.
   */
  if choice is not null and choice < -1 then
    raise exception 'That is not a choice.' using errcode = '22023';
  end if;

  select
    q.answer,
    /*
     * How many choices the row actually has, guarded by its own type.
     *
     * `jsonb_array_length` raises "cannot get array length of a non-array" on
     * a row whose `choices` is an object or a string, and an unhandled
     * Postgres error is not an answer a route can turn into a sentence. A
     * malformed row is a content bug; it should read as zero choices and be
     * refused cleanly.
     */
    case
      when jsonb_typeof(q.payload -> 'choices') = 'array'
        then jsonb_array_length(q.payload -> 'choices')
      else 0
    end,
    q.payload
    into row_answer, row_choices, row_payload
    from public.custom_questions q
   where q.id = question_id;

  if row_answer is null then
    raise exception 'No such question.' using errcode = 'P0002';
  end if;

  if row_choices = 0 then
    raise exception 'That question has no answer choices.' using errcode = '22023';
  end if;

  if choice is not null and choice >= row_choices then
    raise exception 'That choice does not exist on this question.'
      using errcode = '22023';
  end if;

  return query
    select
      coalesce(choice, -1) = row_answer,
      row_answer,
      row_payload -> 'explanation';
end;
$$;

revoke execute on function public.check_answer(text, int) from anon, public;
grant execute on function public.check_answer(text, int) to authenticated;

-- An earlier draft of this file added `question_authors(text[])` so the save
-- path could read `created_by` back through a privileged door. It turned out
-- not to be needed: edits are a plain UPDATE that leaves the column alone, so
-- authorship is preserved by never being written. Dropped rather than left
-- behind, so that a database which ran that draft ends up identical to one
-- that did not — and so that no granted function outlives the reason it
-- existed. Harmless here regardless of phase: nothing has ever depended on it
-- existing.
drop function if exists public.question_authors(text[]);

-- ------------------------------------------------------------------- admin --
-- Whole rows, including the author, for the admin editor.
--
-- Guarded on its first line by is_admin() — that check, not a table grant, is
-- what makes the full bank admin-only, both before and after Phase B. It is
-- the same shape the moderation functions use, for the same reason.
--
-- The new admin editor calls this instead of a plain select; the old admin
-- editor still uses the plain select directly, which the table grant still
-- allows until Phase B. Both work at once, which is exactly Phase A's job.

create or replace function public.question_bank_admin()
returns table (
  id           text,
  exam         text,
  subject_id   text,
  topic        text,
  domain       text,
  difficulty   int,
  answer       int,
  payload      jsonb,
  created_at   timestamptz,
  author_email text
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;

  return query
    select q.id, q.exam, q.subject_id, q.topic, q.domain, q.difficulty,
           q.answer, q.payload, q.created_at, p.email
      from public.custom_questions q
      left join public.profiles p on p.id = q.created_by
     order by q.created_at asc;
end;
$$;

revoke execute on function public.question_bank_admin() from anon, public;
grant execute on function public.question_bank_admin() to authenticated;

/**
 * How many distinct people have written questions.
 *
 * One number for the admin statistics page. Additive today: the old stats
 * route reads `created_by` directly, which the table grant still allows until
 * Phase B; the new stats route calls this instead. Once Phase B lands and
 * `created_by` leaves the column grant, this remains the only way to answer
 * the question at all — but that is Phase B's change to make, not this one's.
 */
create or replace function public.question_author_count()
returns int
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  total int;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;

  select count(distinct created_by)
    into total
    from public.custom_questions
   where created_by is not null;

  return coalesce(total, 0);
end;
$$;

revoke execute on function public.question_author_count() from anon, public;
grant execute on function public.question_author_count() to authenticated;
