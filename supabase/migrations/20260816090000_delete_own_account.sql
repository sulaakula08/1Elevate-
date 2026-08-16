-- ------------------------------------------------------ delete own account --
--
-- Closing an account, performed by the person closing it.
--
-- ── Why a function and not the admin API ───────────────────────────────────
-- Removing a row from auth.users normally means the service-role key, and this
-- application deliberately does not carry one: nothing in it can bypass row
-- level security today, and adding a key that can — so that a student may
-- delete themselves — would be a poor trade. A SECURITY DEFINER function does
-- the one privileged thing needed and nothing else.
--
-- ── Why one delete is enough ───────────────────────────────────────────────
-- profiles.id references auth.users on delete cascade, and every table holding
-- a student's own data references profiles the same way: attempts, mocks,
-- community posts, comments, reactions, saves, reports, feedback, follows and
-- their rate-limit row all go with it.
--
-- What deliberately does NOT go is authored content that belongs to the
-- product rather than to the person: custom_questions.created_by, hidden_by,
-- reviewed_by and updated_by are `on delete set null`, so an admin closing
-- their account does not take the shared question bank with them.
--
-- Storage is the exception the database cannot express. Objects in `avatars`
-- and `feedback-shots` have no foreign key to anything, so they are removed
-- here by hand; without this a deleted account leaves its picture on a public
-- URL forever.

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

  -- The typed name is checked here as well as in the browser, because the
  -- browser is not where a rule is enforced: the publishable key reaches this
  -- function directly, and a confirmation only the UI performs is a
  -- confirmation an API call skips.
  if confirm_name is distinct from actual_name then
    raise exception 'The name does not match' using errcode = '22023';
  end if;

  -- The last owner deleting themselves would leave a project nobody can
  -- administer: roles are granted only by an owner, and owners are made only in
  -- the SQL editor. Same reasoning as set_role's self-demotion guard.
  if actual_role = 'owner' then
    raise exception 'An owner cannot delete their own account' using errcode = '42501';
  end if;

  -- No cascade reaches storage.
  delete from storage.objects
  where bucket_id in ('avatars', 'feedback-shots')
    and (storage.foldername(name))[1] = who::text;

  -- Everything else follows from this one row.
  delete from auth.users where id = who;
end;
$$;

revoke execute on function public.delete_own_account(text) from anon, public;
grant execute on function public.delete_own_account(text) to authenticated;

-- ------------------------------------------------------------- privileges --
--
-- SECURITY DEFINER means the function runs as whoever owns it, and that is the
-- role which ran this migration — normally `postgres`. It does NOT mean the
-- function can do anything it likes: `auth.users` belongs to
-- supabase_auth_admin and `storage.objects` to supabase_storage_admin, so the
-- owner still needs to have been granted a way in. Without these the function
-- exists, is called, and raises 42501 — which is what "Could not delete the
-- account" was hiding.
--
-- Wrapped in a block that reports rather than aborts: on a project where the
-- migration runner cannot grant these, the rest of this file has still been
-- applied and the notice says exactly what to hand to a database owner.

do $$
begin
  execute format('grant delete on table auth.users to %I', current_user);
exception when others then
  raise notice
    'Could not grant delete on auth.users to %: %. Account deletion will fail with 42501 until a role that owns auth.users runs that grant.',
    current_user, sqlerrm;
end;
$$;

do $$
begin
  execute format('grant delete on table storage.objects to %I', current_user);
exception when others then
  raise notice
    'Could not grant delete on storage.objects to %: %. Avatars and screenshots will survive a deleted account until that grant is made.',
    current_user, sqlerrm;
end;
$$;
