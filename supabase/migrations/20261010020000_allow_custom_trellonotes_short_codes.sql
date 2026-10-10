-- Writers can now choose their own short link (/s/cv-2026), so codes may be
-- 3–40 characters and use dashes between words.
alter table public.trellonotes_published_pages
  drop constraint trellonotes_published_pages_short_code_format,
  add constraint trellonotes_published_pages_short_code_format
    check (short_code ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(short_code) between 3 and 40);
