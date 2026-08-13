-- Phase 5 — the follow graph.
--
-- One row per "A follows B". Deliberately the smallest thing that can support a
-- Following feed, and deliberately not a social network: there is no counter, no
-- follower list, and no way for anyone to read whom anyone else follows.
--
-- Modelled on community_saves, which is the closest existing relation — a
-- private, per-student edge with a composite key and no update path.

create table if not exists public.community_follows (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),

  -- The primary key is the uniqueness rule. Following someone twice is the same
  -- row, so a double tap or a retry after a dropped connection cannot create a
  -- duplicate edge and the API can insert with ignore-duplicates.
  primary key (follower_id, following_id)
);

-- Self-following is refused by the database, not by the button.
--
-- The UI never offers it — the menu on your own post has no Follow item — but
-- "the UI does not offer it" is not a rule, it is a habit of the current client.
-- A check constraint is the rule, and it holds for anything that reaches
-- PostgREST directly with a publishable key.
--
-- Added separately from the table so this migration is re-runnable against a
-- database that already has the table: `create table if not exists` leaves an
-- existing table's constraints untouched, the same trap profiles_role_check and
-- community_posts_type_check are written around in the baseline.
alter table public.community_follows
  drop constraint if exists community_follows_no_self;
alter table public.community_follows
  add constraint community_follows_no_self check (follower_id <> following_id);

alter table public.community_follows enable row level security;

-- Read your own follows and nobody else's.
--
-- This is the policy that keeps the graph private, and it is worth being explicit
-- about what it costs: because a student can only read rows where they are the
-- follower, there is no query anyone can write — from the app or from PostgREST —
-- that returns "who follows X". Follower counts are therefore not merely absent
-- from the interface, they are unavailable, which is the intended shape. Adding
-- them later would take a policy change and a deliberate decision.
drop policy if exists "follows: read own" on public.community_follows;
create policy "follows: read own"
  on public.community_follows for select
  using (follower_id = auth.uid());

-- `with check` and not `using`: this is the rule for the row being written, and
-- it is what stops one student following somebody on another student's behalf.
drop policy if exists "follows: write own" on public.community_follows;
create policy "follows: write own"
  on public.community_follows for insert
  with check (follower_id = auth.uid());

-- You can only ever unfollow as yourself. A delete aimed at someone else's edge
-- matches no row, exactly as the community delete policies behave.
drop policy if exists "follows: remove own" on public.community_follows;
create policy "follows: remove own"
  on public.community_follows for delete
  using (follower_id = auth.uid());

-- No update policy, so RLS refuses every UPDATE: an edge has nothing to amend,
-- and changing `following_id` in place would be a way to redirect a follow
-- without creating or destroying one. The revoke says the same thing a second
-- way, so that adding an update policy later cannot quietly hand over the two
-- columns that define who the edge belongs to.
revoke update on public.community_follows from anon, authenticated;
