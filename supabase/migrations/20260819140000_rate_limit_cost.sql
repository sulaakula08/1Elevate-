-- ============================================================================
-- Let a rate limit be charged by weight, not by request.
--
-- The question-bank limits were counting requests, and a request is the wrong
-- unit for the thing being protected. Measured against the real app:
--
--   practice, per Next        1 question   (the window advances by one)
--   practice, opening a set   8-10 questions
--   review, one page          6-12 questions
--   a mock module             27 questions  (the largest legitimate request)
--
-- So a student navigating practice spends one request per question, while a
-- scraper spends one request per thirty. Counting requests charges them the same
-- and therefore has to be set loose enough for the scraper — 30 requests a minute
-- at 30 ids each was 900 questions a minute, which is not a limit on extraction.
--
-- Charging by question makes the two cost what they actually take, and lets the
-- ceiling be expressed in the unit that matters: questions per window.
--
-- ── Why an overload and not a fourth parameter with a default ──────────────
-- `consume_rate(text, int, int)` is already in production and already called by
-- /api/explain and /api/generate. Adding a defaulted fourth parameter to it would
-- make every existing three-argument call ambiguous between the old function and
-- the new one, and Postgres resolves that by refusing. Adding an overload with
-- the fourth parameter *required* is unambiguous in both directions: three
-- arguments can only mean the old signature, four can only mean the new one.
--
-- Nothing is dropped, so there is no window during a deploy where the function a
-- running instance is calling does not exist. The old signature stays as the
-- one-line delegate below, which keeps a single implementation of the locking.
-- ============================================================================

create or replace function public.consume_rate(
  bucket_name text,
  max_count int,
  window_seconds int,
  cost int
)
returns table (allowed boolean, retry_after int)
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := auth.uid();
  window_length interval := make_interval(secs => greatest(window_seconds, 1));
  -- A request always costs something. Zero would let an unbounded number of
  -- them through, and a negative would refund allowance a caller had spent.
  charge int := greatest(coalesce(cost, 1), 1);
  row_window_start timestamptz;
  row_count int;
begin
  if who is null then
    -- No caller, no allowance. The routes check this before getting here; this
    -- is the backstop for anything that forgets to.
    return query select false, window_seconds;
    return;
  end if;

  -- One statement decides everything, so two requests arriving together cannot
  -- both read "count = limit - 1" and both be allowed. The row is locked by the
  -- upsert itself; there is no read-then-write gap to lose.
  insert into public.rate_limits as existing (bucket, subject, window_start, count)
  values (bucket_name, who, now(), charge)
  on conflict (bucket, subject) do update
    set
      -- A window that has run out starts again rather than accumulating.
      window_start = case
        when existing.window_start + window_length <= now() then now()
        else existing.window_start
      end,
      count = case
        when existing.window_start + window_length <= now() then charge
        else existing.count + charge
      end
  returning existing.window_start, existing.count
  into row_window_start, row_count;

  if row_count > max_count then
    return query
      select
        false,
        greatest(
          1,
          ceil(extract(epoch from (row_window_start + window_length - now())))::int
        );
  else
    return query select true, 0;
  end if;
end;
$$;

/**
 * The original three-argument form, kept so that nothing already calling it has
 * to change, and reduced to a request that costs one.
 */
create or replace function public.consume_rate(
  bucket_name text,
  max_count int,
  window_seconds int
)
returns table (allowed boolean, retry_after int)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select *
      from public.consume_rate(bucket_name, max_count, window_seconds, 1);
end;
$$;

-- Same posture as the three-argument form: not for `anon`, not for PUBLIC, and
-- reachable by a signed-in caller only through the function.
revoke execute on function public.consume_rate(text, int, int, int) from anon, public;
grant execute on function public.consume_rate(text, int, int, int) to authenticated;
revoke execute on function public.consume_rate(text, int, int) from anon, public;
grant execute on function public.consume_rate(text, int, int) to authenticated;
