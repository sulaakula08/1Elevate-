-- Why account deletion is failing. Read-only; run the whole thing at once.
--
-- Part 1 said the function exists, is owned by postgres, and that postgres may
-- delete from auth.users and storage.objects. So the refusal is not there.
--
-- What it did not check: deleting a user CASCADES into auth's other tables —
-- identities, sessions, refresh_tokens, mfa factors — and the cascade runs as
-- the same role. Lacking DELETE on any one of them raises 42501, which is the
-- message the app is showing.

-- ---------------------------------------------------------------- part 1 --
-- Every table in auth and storage, and whether the function's owner may delete
-- from it. Any `false` here is the answer.

select
  n.nspname || '.' || c.relname as table_name,
  has_table_privilege('postgres', c.oid, 'delete') as owner_may_delete
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('auth', 'storage')
  and c.relkind = 'r'
order by owner_may_delete, table_name;

-- ---------------------------------------------------------------- part 2 --
-- The other way a delete is refused: a reference from outside the cascade.
-- `a` (NO ACTION) or `r` (RESTRICT) against auth.users blocks it.

select
  con.conrelid::regclass::text as referencing_table,
  att.attname                  as column_name,
  case con.confdeltype
    when 'a' then 'NO ACTION — blocks the delete'
    when 'r' then 'RESTRICT — blocks the delete'
    when 'c' then 'CASCADE — fine'
    when 'n' then 'SET NULL — fine'
    when 'd' then 'SET DEFAULT'
  end as on_delete
from pg_constraint con
join unnest(con.conkey) as k(attnum) on true
join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.attnum
where con.contype = 'f'
  and con.confrelid = 'auth.users'::regclass
order by
  case con.confdeltype when 'a' then 0 when 'r' then 0 else 1 end,
  referencing_table;

-- ---------------------------------------------------------------- part 3 --
-- Which account is being deleted, and its role. An owner is refused by design
-- — the function raises rather than leaving a project nobody can administer —
-- and that refusal currently arrives wearing the same error code as a missing
-- privilege, which is why the message may be misleading.

select email, role from public.profiles order by role, email;
