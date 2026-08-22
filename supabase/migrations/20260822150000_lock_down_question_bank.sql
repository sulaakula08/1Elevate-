-- ============================================================================
-- Lock down the question bank — PHASE B of two.
--
-- ── What this closes ────────────────────────────────────────────────────────
-- `20260819120000_protect_question_bank.sql` (Phase A) added everything the new
-- application needs — the `skill` column and the `question_bodies` /
-- `check_answer` / `question_bank_admin` / `question_author_count` functions —
-- without touching the old table-level access, so that the old and new
-- application code could run side by side during the deploy window. That
-- window is over: production has been verified running the new application
-- (commit 14a49bb3), verified using the new functions for every read path, and
-- verified making zero use of the old direct-select path. See the production
-- verification report for the evidence. This file is what the whole split was
-- for — it revokes the table-level access nothing live still depends on.
--
-- ── Why a plain REVOKE/GRANT and not just relying on Phase A's functions ────
-- A policy decides which ROWS a statement may touch, never which COLUMNS —
-- the note at the top of schema.sql says so, and it is why `profiles.role` and
-- `community_posts.hidden_at` are already handled this way. "Students may read
-- questions but not their answers" is a statement about columns, so closing it
-- has to be a GRANT change, which is what this file makes.
--
-- ── What was verified before writing this file, not assumed ────────────────
-- Inspected production's live `pg_class.relacl` and `pg_policies` directly
-- rather than copying the originally-drafted SQL blind:
--
--   * The table's ACL has exactly four grantees — postgres, anon,
--     authenticated, service_role — no separate PUBLIC entry. So revoking
--     from anon and authenticated by name is the whole job; an additional
--     `revoke ... from public` would be a no-op, not defence in depth, because
--     there is nothing granted to PUBLIC to take back.
--   * `anon` currently also holds INSERT/UPDATE/DELETE/TRUNCATE on this table
--     (Supabase's default grant for every table it creates), but every write
--     is already behind `"questions: write admin"`, an ALL-commands policy
--     gated on `is_admin()` — untouched by this file, in either phase. An
--     anonymous caller's `is_admin()` is false, so those verbs were never
--     reachable regardless of the table grant, and revoking them here would
--     be a cosmetic no-op, not a security fix. Left alone on purpose.
--   * Confirmed against DEV, which already ran the original combined
--     migration and sits at this file's end state today: DEV's table ACL has
--     already lost `r` (SELECT) for anon and authenticated, its column grant
--     to authenticated is already exactly the eight taxonomy columns below,
--     and its read policy is already named "questions: read index". Every
--     statement here is REVOKE, GRANT, or DROP POLICY IF EXISTS / CREATE
--     POLICY specifically so this is a no-op there rather than an error — see
--     the note at each statement.
--
-- ── The end state ───────────────────────────────────────────────────────────
--   anon                    no read access to custom_questions at all.
--   authenticated student   the eight taxonomy columns only, direct from the
--                           table — id, exam, subject_id, topic, domain,
--                           skill, difficulty, created_at.
--   question content        question_bodies() / check_answer(), unchanged by
--                           this file — SECURITY DEFINER, owner-bypass, so
--                           this table-level revoke does not affect them.
--   admin full rows         question_bank_admin() / question_author_count(),
--                           same reason.
--   service_role / postgres unaffected — this file never mentions them, and
--                           the owner bypasses RLS regardless.
-- ============================================================================

-- ---------------------------------------------------------------- columns --
-- REVOKE is idempotent: taking back a privilege that is already gone is a
-- silent no-op, which is what this statement is on DEV today.
revoke select on public.custom_questions from anon, authenticated;

-- GRANT is idempotent the same way: DEV's authenticated role already holds
-- exactly this column set, so this restates the grant rather than changing
-- it there, and creates it fresh on production.
grant select (id, exam, subject_id, topic, domain, skill, difficulty, created_at)
  on public.custom_questions to authenticated;

-- ------------------------------------------------------------------ policy --
-- The row policy stays permissive — every row, not a `using` clause worth
-- writing — because the column grant above is now doing the actual work.
-- Renamed here rather than in Phase A because this is the moment the name
-- stops being aspirational and starts being true: a policy called
-- "read index" while every column was still open would have been misleading.
--
-- On production this drops "questions: read signed in" and creates
-- "questions: read index" in its place. On DEV, "questions: read signed in"
-- is already gone (the first DROP is a no-op) and "questions: read index"
-- already exists in this exact shape — the second DROP removes it and the
-- CREATE immediately after puts back the same policy, both inside this
-- migration's own transaction, so no external reader ever observes a moment
-- with no read policy at all.
drop policy if exists "questions: read signed in" on public.custom_questions;
drop policy if exists "questions: read index" on public.custom_questions;
create policy "questions: read index"
  on public.custom_questions
  for select
  to authenticated
  using (true);

-- `questions: write admin` is untouched, in both phases and by this file: it
-- is `for all`, already carries an admin's SELECT, and admins reach content
-- through question_bank_admin() rather than through the table grant either
-- way.
