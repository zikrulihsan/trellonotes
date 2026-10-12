-- A writer's own domain for their public page (zikrul.dev instead of /@zikrul).
-- Rows are written only by the /api/custom-domain Netlify function, which checks the
-- domain's DNS and registers it with Netlify before setting `verified_at`. Visitors'
-- browsers read verified rows to find whose page a domain shows.
create table public.trellonotes_custom_domains (
  user_id uuid primary key references auth.users (id) on delete cascade,
  domain text not null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trellonotes_custom_domains_domain_format check (
    length(domain) <= 253
    and domain ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$'
  )
);

-- Many writers may be waiting on the same domain's DNS; only one can have it live.
create unique index trellonotes_custom_domains_verified_domain
  on public.trellonotes_custom_domains (domain)
  where verified_at is not null;

alter table public.trellonotes_custom_domains enable row level security;

create policy "Anyone can read live TrelloNotes custom domains"
  on public.trellonotes_custom_domains for select to anon, authenticated
  using (verified_at is not null or (select auth.uid()) = user_id);

revoke all on public.trellonotes_custom_domains from anon, authenticated;
grant select on public.trellonotes_custom_domains to anon, authenticated;
