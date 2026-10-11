-- The writer's public landing page (/@handle): hero, links, "helps people to"
-- columns, projects and the notes heading. Stored as one JSON object the app
-- validates; a profile without it shows the plain list of published pages.
alter table public.trellonotes_profiles
  add column landing jsonb,
  add constraint trellonotes_profiles_landing_shape
    check (landing is null or (jsonb_typeof(landing) = 'object' and octet_length(landing::text) <= 40000));
