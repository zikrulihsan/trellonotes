-- Unlisted pages stay readable by anyone with the link but are left out of the
-- writer's public list. Pages published before this stay listed.
alter table public.trellonotes_published_pages
  add column unlisted boolean not null default false;
