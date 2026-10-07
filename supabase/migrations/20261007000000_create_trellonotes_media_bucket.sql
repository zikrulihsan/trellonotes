-- Images in notes and Pages. Notes keep only a "media:<user id>/<file>" key, never
-- the storage URL, so the files can move to another object store later without
-- rewriting any writing. The bucket is public so published Pages can show their
-- images; file names are random, and only the owner can add or remove files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trellonotes-media',
  'trellonotes-media',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "Users can add TrelloNotes images to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'trellonotes-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can remove TrelloNotes images from their own folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'trellonotes-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
