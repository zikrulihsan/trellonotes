-- Short links (/s/<code>) for published pages. The code is random, so it can't be
-- guessed from the title the way the regular link can.
alter table public.trellonotes_published_pages
  add column short_code text unique,
  add constraint trellonotes_published_pages_short_code_format
    check (short_code ~ '^[a-z0-9]{6,12}$');
