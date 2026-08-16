-- ------------------------------- delete own account: release storage links --
--
-- The first version deleted a person's own files and then deleted the user, on
-- the assumption that nothing else pointed at them. Diagnostics showed the
-- privileges were fine, which leaves the other way a delete gets refused: a
-- foreign key outside the cascade.
--
-- `storage.objects` carries the uploader — `owner`, and on newer projects
-- `owner_id` as well — referencing auth.users. On several Supabase versions
-- that reference has no ON DELETE action at all, so any file the account ever
-- uploaded raises 23503 and the deletion fails. Deleting the two personal
-- buckets was not enough: a question figure uploaded by an admin lives in
-- another bucket and still points at them.
--
-- The rule that resolves it is the one already used for authored content:
-- what belongs to the person goes, what belongs to the product stays and loses
-- its author. custom_questions.created_by is `set null` for exactly this
-- reason; a figure inside a question every student can see should not vanish
-- because the person who uploaded it closed their account.

create or replace function public.delete_own_account(confirm_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := auth.uid();
  actual_name text;
  actual_role text;
begin
  if who is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;

  select name, role into actual_name, actual_role
  from public.profiles
  where id = who;

  if not found then
    raise exception 'No profile for this account' using errcode = 'P0002';
  end if;

  -- Checked here as well as in the browser: the publishable key reaches this
  -- function directly, so a confirmation only the UI performs is one an API
  -- call skips.
  --
  -- Trimmed on both sides because the interface does not display this column
  -- raw — it shows `name.trim()`, falling back to the email's local part when
  -- the column is empty. Someone can only retype what they were shown, and a
  -- rule they cannot satisfy is a rule that has failed, not one they broke.
  if btrim(confirm_name) is distinct from btrim(actual_name)
     and btrim(confirm_name) is distinct from split_part(
       (select email from public.profiles where id = who), '@', 1
     )
  then
    raise exception 'The name does not match' using errcode = '22023';
  end if;

  if actual_role = 'owner' then
    raise exception 'An owner cannot delete their own account' using errcode = '42501';
  end if;

  -- Personal files: gone. No cascade reaches storage.
  delete from storage.objects
  where bucket_id in ('avatars', 'feedback-shots')
    and (storage.foldername(name))[1] = who::text;

  -- Everything else they uploaded is product content. Keep the file, drop the
  -- link — otherwise the reference blocks the delete below.
  update storage.objects set owner = null where owner = who;

  -- `owner_id` exists only on newer storage schemas, so it is set through
  -- dynamic SQL: naming a column that is not there fails at parse time, before
  -- any check of whether the branch would run.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'storage' and table_name = 'objects' and column_name = 'owner_id'
  ) then
    execute 'update storage.objects set owner_id = null where owner_id = $1' using who::text;
  end if;

  -- Everything else follows from this one row.
  delete from auth.users where id = who;
end;
$$;

revoke execute on function public.delete_own_account(text) from anon, public;
grant execute on function public.delete_own_account(text) to authenticated;
