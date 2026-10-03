create table public.trellonotes_workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  workspace jsonb not null default '{"boards":[],"cards":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint trellonotes_workspace_is_object check (jsonb_typeof(workspace) = 'object')
);

alter table public.trellonotes_workspaces enable row level security;

create policy "Users can read their own TrelloNotes workspace"
  on public.trellonotes_workspaces for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own TrelloNotes workspace"
  on public.trellonotes_workspaces for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own TrelloNotes workspace"
  on public.trellonotes_workspaces for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.trellonotes_workspaces from anon;
grant select, insert, update on public.trellonotes_workspaces to authenticated;
