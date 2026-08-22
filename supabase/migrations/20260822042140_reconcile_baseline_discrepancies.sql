-- ============================================================================
-- Reconcile two ways production drifted from the baseline migration.
--
-- Found by a read-only audit of the live production schema (introspection
-- queries against information_schema/pg_catalog, not inference from "the app
-- works"), after discovering production had never run any migration through
-- the CLI's own tracking and the baseline file's `create table if not exists`
-- branches are no-ops against a table that already existed. Both gaps are in
-- baseline's intent, neither is a new requirement, and this file is additive —
-- it does not touch 20260811000000_baseline_schema.sql, which stays the
-- historical record of what was *meant* to happen.
-- ============================================================================

-- ---------------------------------------------------------- feedback.shots --
-- The check that "at most 3 screenshots" lived only in the browser.
--
-- Baseline declares this constraint inline inside `create table if not exists
-- public.feedback (...)`. That whole statement is a no-op on a database where
-- the table already exists — which production's did, from before this repo's
-- migration history began — so the constraint was never added. The follow-up
-- `alter table ... add column if not exists shots ...` a few lines later only
-- adds the column; it does not carry the check with it. Verified directly: a
-- production audit found the table with `feedback_account_id_fkey`,
-- `feedback_category_check`, `feedback_message_check` and `feedback_pkey`, and
-- nothing constraining `shots` at all.
--
-- Effect until this runs: any signed-in account can attach an unlimited number
-- of screenshot paths to a feedback row over the API/PostgREST directly. The
-- app's own `MAX_SHOTS = 3` (src/lib/shots.ts) is the only thing enforcing the
-- limit today.

-- Existing rows first, or `ADD CONSTRAINT` refuses to run against any that
-- violate it. `shots[1:3]` keeps the first three — the order they were
-- originally attached in — rather than the most recent three; there is no
-- signal in the column for which matters more, and "the ones attached first"
-- is at least a predictable, stated rule rather than a silent one.
--
-- In practice this should touch zero rows: the upload path has enforced the
-- same limit client-side since the feature shipped, and PostgREST is the only
-- other way to have written more. The notice below says so either way, rather
-- than truncating silently.
do $$
declare
  affected int;
begin
  update public.feedback
     set shots = shots[1:3]
   where array_length(shots, 1) > 3;

  get diagnostics affected = row_count;

  if affected > 0 then
    raise notice 'reconcile_baseline_discrepancies: trimmed % feedback row(s) to 3 screenshots', affected;
  end if;
end;
$$;

-- Drop-then-add, matching the idempotent pattern the rest of this schema
-- uses (see custom_questions_id_present in the baseline): safe to run again
-- against a database that already has it, including production once this
-- reconciliation has landed there.
alter table public.feedback
  drop constraint if exists feedback_shots_check;
alter table public.feedback
  add constraint feedback_shots_check
  check (array_length(shots, 1) is null or array_length(shots, 1) <= 3);

-- --------------------------------------------------------- reset_statistics --
-- `anon` still had EXECUTE on a function that deletes every student's
-- attempts and mocks.
--
-- Baseline already writes `revoke all on function public.reset_statistics()
-- from public; grant execute ... to authenticated;` — the intent has been
-- correct since day one. Production's audit found `anon`, `authenticated`,
-- `postgres` and `service_role` all still holding EXECUTE (checked with
-- `has_function_privilege`, not just a grants listing), meaning that revoke
-- never actually took hold there, however it happened.
--
-- This was NOT exploitable: `reset_statistics()` calls `is_owner()` before
-- doing anything, which is `exists (select 1 from profiles where id =
-- auth.uid() and role = 'owner')` — and `auth.uid()` is null for an anonymous
-- caller, so that check already refuses anon regardless of the grant. The
-- grant was still wrong, and defence-in-depth means fixing it rather than
-- relying on the one guard that happened to be doing the job of two.
--
-- Restated explicitly rather than assumed to already hold: the point of this
-- file is that assuming baseline's intent had landed is exactly the mistake
-- that put the app in this position.
revoke execute on function public.reset_statistics() from anon, public;
grant execute on function public.reset_statistics() to authenticated;
