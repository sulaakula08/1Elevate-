-- ---------------------------------------------------------------- avatars --
--
-- A profile picture, and the bucket it lives in.
--
-- The column is nullable-by-default-empty rather than null, matching every
-- other text column on profiles, so "no picture" is one value ('') instead of
-- two ('' and null) that every reader would have to handle separately.
--
-- The application is written to run against a database that has *not* had this
-- applied: the profile route selects the whole row and treats a missing
-- avatar_url as empty, so an un-migrated project keeps working with the picture
-- feature simply inert. Applying this turns it on; nothing else has to change.

alter table public.profiles
  add column if not exists avatar_url text not null default '';

-- ------------------------------------------------------------------ bucket --
--
-- Public, for the same reason question figures are: an avatar is shown beside
-- every post in a feed, and a signed URL per face would mean a round trip per
-- row and an expiry that can blank a timeline mid-scroll. Nothing private is
-- inferable from the file itself — the student chose it to be seen.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "avatars: read" on storage.objects;
create policy "avatars: read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Own folder only. Unlike figures this is not admin-gated — every student may
-- have a picture — so the folder check is the whole of the authorisation and
-- has to be exact: it is what stops one account writing into another's.
drop policy if exists "avatars: write own folder" on storage.objects;
create policy "avatars: write own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars: update own folder" on storage.objects;
create policy "avatars: update own folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Changing a picture leaves the old file behind, so delete is what lets a
-- student actually remove a photo rather than only stop pointing at it.
drop policy if exists "avatars: delete own folder" on storage.objects;
create policy "avatars: delete own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
