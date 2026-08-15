-- ------------------------------------------------- avatar upload limits ----
--
-- The avatars bucket was created with neither a size cap nor a type list, while
-- feedback-shots next to it has both. The policies were never the problem: a
-- student may only write into their own folder, and that part is exact.
--
-- What was missing is a limit on *what* they may put there. The app downscales
-- a picture to 1600px JPEG before uploading, but that runs in the browser, and
-- the browser is not where a rule is enforced — the publishable key ships to
-- every visitor and the storage API answers it directly. So any signed-in
-- account could put a file of any size and any type into this bucket.
--
-- That matters more here than it would elsewhere, because this bucket is
-- public: whatever lands in it is served to anyone with the URL, under the
-- project's own domain. A size cap alone would leave that open; the type list
-- is what keeps it to pictures.
--
-- 2 MB against a ~300 KB downscaled JPEG is deliberate headroom. The cap is
-- there to stop abuse, not to second-guess a phone camera, and a limit that
-- rejects a legitimate photo would be reported as "the site is broken".

update storage.buckets
set
  file_size_limit = 2097152, -- 2 MiB
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'avatars';

-- Should the bucket not exist yet — a database that has not had the avatar
-- migration applied — create it complete rather than leaving the fix to depend
-- on the order the two were run in.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
