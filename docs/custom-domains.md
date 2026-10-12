# Writers' own domains

A writer can show their public page (`/@handle`) at a domain they own, such as
`zikrul.dev`. Visitors stay on that domain: it points at this Netlify site, and the app
reads the hostname to know whose page to show (`src/lib/site-host.ts`). Pages sit at the
root there, so `zikrul.dev/catatan` is `/@zikrul/catatan`. Sign-in and the editor stay on
the app's own address.

## How a domain goes live

1. The writer types the domain under **Your own domain** on the Public page screen.
2. Notis shows the DNS records to add where they bought it:
   - a subdomain (`blog.zikrul.dev`): `CNAME` to this site's `*.netlify.app` address;
   - a root domain (`zikrul.dev`): `A` to `75.2.60.5`, plus `TXT` on `_notis.zikrul.dev`
     with `notis-verify=<account id>`. Netlify's IP is shared by every Netlify site, so the
     TXT record is what shows the writer controls the domain.
3. `/api/custom-domain` (`netlify/edge-functions/custom-domain.ts`) checks the records,
   adds the domain to this site's domain aliases through Netlify's API, asks Netlify to
   renew the certificate, and marks the row in `trellonotes_custom_domains` as verified.

## Setup (once)

1. Apply `supabase/migrations/20261012000000_create_trellonotes_custom_domains.sql`.
2. In Netlify, **Site configuration > Environment variables**, add:
   - `NETLIFY_API_TOKEN`: a personal access token (User settings > Applications).
   - `SUPABASE_SERVICE_ROLE_KEY`: the project's service role key or an `sb_secret_` key.
     Only the edge function sees it; it writes the domains table.
   - `NOTIS_SITE_ID`: the site's API ID (Site configuration > General > Site details).
3. Redeploy.

## Limits

Netlify recommends no more than 50 domain aliases per site. Past that, move writers'
domains to Cloudflare for SaaS (Custom Hostnames), which is built for many domains.

## Subdomains (`<handle>.notis.swegrowth.id`)

The app already reads the handle from such hostnames. To turn them on:

1. Add a wildcard domain alias `*.notis.swegrowth.id` to the Netlify site. Netlify issues
   a wildcard certificate only when the domain uses Netlify DNS, so delegate the
   `notis.swegrowth.id` zone to Netlify DNS (NS records at the swegrowth.id DNS provider).
2. Set `SUBDOMAINS_LIVE` to `true` in `src/lib/site-host.ts` so the Public page screen
   shows each writer their subdomain.
