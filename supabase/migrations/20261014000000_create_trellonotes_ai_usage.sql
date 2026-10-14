-- How many Gemini requests each writer made on the app's own key, per day, so the free
-- allowance has a limit. Writers who add their own Gemini key are not counted.
create table public.trellonotes_ai_usage (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  requests integer not null default 0,
  primary key (user_id, day),
  constraint trellonotes_ai_usage_requests_positive check (requests >= 0)
);

alter table public.trellonotes_ai_usage enable row level security;

-- Writers may read their own counts, but never change them: only the functions below do.
create policy "Users can read their own TrelloNotes AI usage"
  on public.trellonotes_ai_usage for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.trellonotes_ai_usage from anon, authenticated;
grant select on public.trellonotes_ai_usage to authenticated;

-- Today's request count for the signed-in writer (UTC day).
create function public.trellonotes_ai_used_today()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select requests from public.trellonotes_ai_usage
      where user_id = (select auth.uid()) and day = (now() at time zone 'utc')::date),
    0
  );
$$;

-- Counts one request for the signed-in writer today, and answers the new total.
create function public.trellonotes_count_ai_use()
returns integer
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.trellonotes_ai_usage (user_id, day, requests)
  values ((select auth.uid()), (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day)
    do update set requests = public.trellonotes_ai_usage.requests + 1
  returning requests;
$$;

revoke all on function public.trellonotes_ai_used_today() from public, anon;
revoke all on function public.trellonotes_count_ai_use() from public, anon;
grant execute on function public.trellonotes_ai_used_today() to authenticated;
grant execute on function public.trellonotes_count_ai_use() to authenticated;
