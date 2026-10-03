-- Pages published from TrelloNotes. Drafts stay private in trellonotes_workspaces;
-- publishing copies a page here, where anyone with the link can read it.
create table public.trellonotes_published_pages (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  slug text not null,
  title text not null,
  content text not null,
  author_name text,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trellonotes_published_pages_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  constraint trellonotes_published_pages_title_length check (length(title) <= 200),
  constraint trellonotes_published_pages_content_length check (length(content) <= 500000),
  constraint trellonotes_published_pages_author_length check (length(author_name) <= 120),
  constraint trellonotes_published_pages_user_slug unique (user_id, slug)
);

create index trellonotes_published_pages_user_published
  on public.trellonotes_published_pages (user_id, published_at desc);

alter table public.trellonotes_published_pages enable row level security;

create policy "Anyone can read published TrelloNotes pages"
  on public.trellonotes_published_pages for select to anon, authenticated
  using (true);

create policy "Users can publish their own TrelloNotes pages"
  on public.trellonotes_published_pages for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own published TrelloNotes pages"
  on public.trellonotes_published_pages for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can unpublish their own TrelloNotes pages"
  on public.trellonotes_published_pages for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.trellonotes_published_pages from anon, authenticated;
grant select on public.trellonotes_published_pages to anon, authenticated;
grant insert, update, delete on public.trellonotes_published_pages to authenticated;
