-- ------------------------- delete own account: distinct codes, full grants --
--
-- Two corrections, both of which the last attempt got wrong.
--
-- ── 1. The refusals wore the same code as a real failure ───────────────────
-- The owner guard raised SQLSTATE 42501, which also means "insufficient
-- privilege". The route reads 42501 and says the function is missing
-- privileges — so an owner being correctly refused was told to re-run a
-- migration, and a genuine privilege failure and a deliberate refusal became
-- indistinguishable. They now raise codes of their own, in the P0xxx range
-- reserved for application-defined conditions:
--
--   P0401  not signed in
--   P0403  an owner may not delete themselves
--   P0422  the typed name does not match
--
-- ── 2. Only the parent table was granted ───────────────────────────────────
-- Deleting a user cascades into auth's own tables — identities, sessions,
-- refresh_tokens, mfa factors, one-time tokens — and the cascade runs as the
-- function's owner. Granting DELETE on auth.users alone leaves the cascade to
-- fail on the first child table, with 42501, which is what the diagnostics
-- could not see because they only asked about the parent.

create or replace function public.delete_own_account(confirm_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := auth.uid();
  actual_name text;
  actual_email text;
  actual_role text;
begin
  if who is null then
    raise exception 'Sign in first' using errcode = 'P0401';
  end if;

  select name, email, role into actual_name, actual_email, actual_role
  from public.profiles
  where id = who;

  if not found then
    raise exception 'No profile for this account' using errcode = 'P0404';
  end if;

  -- Trimmed, and the email's local part is accepted too, because that is what
  -- the interface shows when the name column is empty. Someone can only retype
  -- what they were shown.
  if btrim(confirm_name) is distinct from btrim(actual_name)
     and btrim(confirm_name) is distinct from split_part(coalesce(actual_email, ''), '@', 1)
  then
    raise exception 'The name does not match' using errcode = 'P0422';
  end if;

  -- Refused by design: roles are granted only by an owner, and owners are made
  -- only in the SQL editor, so the last one deleting themselves would leave a
  -- project nobody can administer.
  if actual_role = 'owner' then
    raise exception 'An owner cannot delete their own account' using errcode = 'P0403';
  end if;

  delete from storage.objects
  where bucket_id in ('avatars', 'feedback-shots')
    and (storage.foldername(name))[1] = who::text;

  update storage.objects set owner = null where owner = who;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'storage' and table_name = 'objects' and column_name = 'owner_id'
  ) then
    execute 'update storage.objects set owner_id = null where owner_id = $1' using who::text;
  end if;

  delete from auth.users where id = who;
end;
$$;

revoke execute on function public.delete_own_account(text) from anon, public;
grant execute on function public.delete_own_account(text) to authenticated;

-- ------------------------------------------------------------- privileges --
-- Every table the cascade can reach, not just the one named in the delete.
-- Reported rather than fatal: on a project where this role cannot grant them,
-- the function above is still installed and the notice says what is missing.

do $$
begin
  execute format('grant delete on all tables in schema auth to %I', current_user);
exception when others then
  raise notice 'Could not grant delete on schema auth to %: %', current_user, sqlerrm;
end;
$$;

do $$
begin
  execute format('grant delete, update on all tables in schema storage to %I', current_user);
exception when others then
  raise notice 'Could not grant delete/update on schema storage to %: %', current_user, sqlerrm;
end;
$$;
