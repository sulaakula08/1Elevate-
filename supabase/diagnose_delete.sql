-- Why account deletion is failing. Read-only; run the whole thing at once.
--
-- Part 1 answered the privilege question: postgres owns the function and may
-- delete from both tables. So the failure is not permission — it is something
-- refusing the delete itself, and the usual candidate is a foreign key from
-- outside the cascade.

-- ---------------------------------------------------------------- part 1 --
-- Kept because it is worth re-checking after any change.

select
  'function exists' as check,
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'delete_own_account'
  )::text as answer
union all
select 'current role in the SQL editor', current_user;

-- ---------------------------------------------------------------- part 2 --
-- Everything that points at auth.users, and what each does when a user goes.
--
-- `a` — NO ACTION, `r` — RESTRICT: either of these raises 23503 and is the
-- deletion failing. `c` — CASCADE and `n` — SET NULL are fine.
--
-- storage.objects.owner is the one to look for: on several Supabase versions it
-- references auth.users with no cascade, so any file a person ever uploaded
-- blocks their account from being deleted.

select
  con.conrelid::regclass::text as referencing_table,
  att.attname                  as column_name,
  case con.confdeltype
    when 'a' then 'NO ACTION — blocks the delete'
    when 'r' then 'RESTRICT — blocks the delete'
    when 'c' then 'CASCADE — fine'
    when 'n' then 'SET NULL — fine'
    when 'd' then 'SET DEFAULT'
  end                          as on_delete
from pg_constraint con
join unnest(con.conkey) as k(attnum) on true
join pg_attribute att
  on att.attrelid = con.conrelid and att.attnum = k.attnum
where con.contype = 'f'
  and con.confrelid = 'auth.users'::regclass
order by
  case con.confdeltype when 'a' then 0 when 'r' then 0 else 1 end,
  referencing_table;

-- ---------------------------------------------------------------- part 3 --
-- Which storage columns this project actually has. Older schemas carry only
-- `owner uuid`; newer ones add `owner_id text`, and a fix has to cover both.

select column_name, data_type
from information_schema.columns
where table_schema = 'storage'
  and table_name = 'objects'
  and column_name in ('owner', 'owner_id');

-- ---------------------------------------------------------------- part 4 --
-- Whether the account being deleted actually owns any files. If this is 0,
-- storage is not the cause and the answer is in part 2's first rows.

select bucket_id, count(*) as files
from storage.objects
group by bucket_id
order by files desc;
