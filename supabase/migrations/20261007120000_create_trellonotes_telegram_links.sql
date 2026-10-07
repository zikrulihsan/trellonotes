-- Links a TrelloNotes account to a Telegram chat, so messages sent to the bot
-- become notes. The bot (a Netlify function using the service role key) reads and
-- writes this table; signed-in users only read their own row, ask for a one-time
-- link code, pick where new notes go, and unlink.
create table public.trellonotes_telegram_links (
  user_id uuid primary key references auth.users (id) on delete cascade,
  chat_id bigint unique,
  link_code text unique,
  link_code_expires_at timestamptz,
  -- Where new notes land; the bot falls back to the first list of the first board.
  board_id text,
  list_id text,
  updated_at timestamptz not null default now()
);

alter table public.trellonotes_telegram_links enable row level security;

create policy "Users can read their own TrelloNotes Telegram link"
  on public.trellonotes_telegram_links for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can choose where their Telegram notes go"
  on public.trellonotes_telegram_links for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.trellonotes_telegram_links from anon, authenticated;
grant select on public.trellonotes_telegram_links to authenticated;
-- Users never set chat_id or link codes themselves: those go through the functions below.
grant update (board_id, list_id, updated_at) on public.trellonotes_telegram_links to authenticated;

-- A fresh one-time code, valid for 15 minutes, that the bot accepts as "/start <code>".
create function public.trellonotes_new_telegram_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  code text := replace(gen_random_uuid()::text, '-', '');
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  insert into public.trellonotes_telegram_links (user_id, link_code, link_code_expires_at, updated_at)
  values (uid, code, now() + interval '15 minutes', now())
  on conflict (user_id) do update
    set link_code = excluded.link_code,
        link_code_expires_at = excluded.link_code_expires_at,
        updated_at = excluded.updated_at;
  return code;
end;
$$;

create function public.trellonotes_unlink_telegram()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.trellonotes_telegram_links
    set chat_id = null, link_code = null, link_code_expires_at = null, updated_at = now()
    where user_id = auth.uid();
$$;

revoke all on function public.trellonotes_new_telegram_code() from public, anon;
revoke all on function public.trellonotes_unlink_telegram() from public, anon;
grant execute on function public.trellonotes_new_telegram_code() to authenticated;
grant execute on function public.trellonotes_unlink_telegram() to authenticated;
