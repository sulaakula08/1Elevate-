-- ------------------------------------------------------------ rate limits --
--
-- A ceiling on the two routes that spend money, counted in the database rather
-- than in one server's memory.
--
-- The in-memory version it replaces could be walked around simply by being
-- unlucky for it: Vercel runs several instances and recycles them, so the count
-- an attacker met depended on which instance answered and how recently it had
-- started. Counting here, every instance consults the same number.
--
-- ── Why a function and not a table the app writes ──────────────────────────
-- The table has row-level security on and *no policies at all*, which means no
-- signed-in caller can read it, write it, or clear their own row. The only way
-- in is `consume_rate`, which is SECURITY DEFINER and therefore not bound by
-- that. A limiter a caller can reset is decoration.
--
-- The subject is always `auth.uid()`, taken inside the function. It is never a
-- parameter, because a parameter is something a caller can set to somebody
-- else's id and spend their allowance instead of their own.

create table if not exists public.rate_limits (
  bucket       text not null,
  subject      uuid not null references auth.users (id) on delete cascade,
  window_start timestamptz not null default now(),
  count        int not null default 0,
  primary key (bucket, subject)
);

alter table public.rate_limits enable row level security;

-- Deliberately no policies. See above.

-- Old windows are dead weight; nothing reads a window that has expired.
create index if not exists rate_limits_window on public.rate_limits (window_start);

/**
 * Records one use and says whether it was allowed.
 *
 * Returns the seconds left in the window when it was not, so the caller can
 * answer with a Retry-After a client can actually obey.
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
declare
  who uuid := auth.uid();
  window_length interval := make_interval(secs => greatest(window_seconds, 1));
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
  values (bucket_name, who, now(), 1)
  on conflict (bucket, subject) do update
    set
      -- A window that has run out starts again rather than accumulating.
      window_start = case
        when existing.window_start + window_length <= now() then now()
        else existing.window_start
      end,
      count = case
        when existing.window_start + window_length <= now() then 1
        else existing.count + 1
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

-- Signed-in callers only, and only through the function.
revoke all on table public.rate_limits from anon, authenticated;
revoke execute on function public.consume_rate(text, int, int) from anon, public;
grant execute on function public.consume_rate(text, int, int) to authenticated;
