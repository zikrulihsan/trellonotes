-- Public handles for TrelloNotes writers, so published pages live at
-- /@handle/page-slug instead of /read/<account id>/page-slug.
create table public.trellonotes_profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  handle text not null,
  display_name text,
  updated_at timestamptz not null default now(),
  constraint trellonotes_profiles_handle_format check (handle ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$'),
  constraint trellonotes_profiles_display_name_length check (length(display_name) <= 120),
  constraint trellonotes_profiles_handle_unique unique (handle)
);

alter table public.trellonotes_profiles enable row level security;

create policy "Anyone can read TrelloNotes writer handles"
  on public.trellonotes_profiles for select to anon, authenticated
  using (true);

create policy "Users can create their own TrelloNotes profile"
  on public.trellonotes_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own TrelloNotes profile"
  on public.trellonotes_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.trellonotes_profiles from anon, authenticated;
grant select on public.trellonotes_profiles to anon, authenticated;
grant insert, update on public.trellonotes_profiles to authenticated;
