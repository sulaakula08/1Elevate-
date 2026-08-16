-- Why account deletion is failing. Read-only; run the whole thing at once.
--
-- Each row is one question with a yes/no answer. Send me the output and the
-- error code the app now shows, and the cause is determined rather than guessed.

select
  'function exists' as check,
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'delete_own_account'
  )::text as answer

union all
select
  'function owner',
  coalesce(
    (
      select pg_get_userbyid(p.proowner)
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'delete_own_account'
      limit 1
    ),
    '(no function)'
  )

union all
select
  'owner may delete from auth.users',
  coalesce(
    (
      select has_table_privilege(pg_get_userbyid(p.proowner), 'auth.users', 'delete')::text
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'delete_own_account'
      limit 1
    ),
    '(no function)'
  )

union all
select
  'owner may delete from storage.objects',
  coalesce(
    (
      select has_table_privilege(pg_get_userbyid(p.proowner), 'storage.objects', 'delete')::text
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'delete_own_account'
      limit 1
    ),
    '(no function)'
  )

union all
select 'who owns auth.users', (
  select pg_get_userbyid(relowner) from pg_class
  where oid = 'auth.users'::regclass
)

union all
select 'who owns storage.objects', (
  select pg_get_userbyid(relowner) from pg_class
  where oid = 'storage.objects'::regclass
)

union all
select 'current role in the SQL editor', current_user;
