// Connects a writer's own domain to their public page. Checks the domain's DNS points at
// Notis, adds it to this Netlify site as a domain alias (Netlify then issues its HTTPS
// certificate), and records it so the app knows whose page the domain shows.
//
// Needs in Netlify's environment: NETLIFY_API_TOKEN (a personal access token),
// SUPABASE_SERVICE_ROLE_KEY (or a sb_secret_ key), and NOTIS_SITE_ID when Netlify's own
// SITE_ID isn't visible to edge functions. See docs/custom-domains.md.
import {
  NETLIFY_APEX_IP,
  domainProblem,
  isApexDomain,
  normalizeDomain,
  verifyRecordName,
  verifyRecordValue,
} from '../../src/lib/site-host.ts';

// Public values, the same ones the app is built with (netlify.toml).
const SUPABASE_URL =
  Netlify.env.get('VITE_SUPABASE_URL') ?? 'https://vqtzmhfnyaujkbczibwu.supabase.co';
const SUPABASE_KEY =
  Netlify.env.get('VITE_SUPABASE_PUBLISHABLE_KEY') ??
  'sb_publishable_mnferSlOXnSwAxFkK-nMYg_3MPzYhYm';
const TABLE = 'trellonotes_custom_domains';

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

class Problem extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/** The signed-in writer's account id, or null. */
async function signedInUser(request: Request): Promise<string | null> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, authorization },
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  if (!response?.ok) return null;
  const user = (await response.json()) as { id?: string };
  return user.id ?? null;
}

interface Row {
  user_id: string;
  domain: string;
  verified_at: string | null;
}

/** Reads and writes the domains table as the server, past row level security. */
async function database(method: string, query: string, body?: unknown): Promise<Row[]> {
  const key = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?${query}`, {
    method,
    headers: {
      apikey: key,
      // Older service role keys are JWTs; the newer sb_secret_ keys go in `apikey` alone.
      ...(key.startsWith('eyJ') && { authorization: `Bearer ${key}` }),
      'content-type': 'application/json',
      prefer: 'return=representation,resolution=merge-duplicates',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    console.error('Supabase error', response.status, await response.text());
    if (response.status === 409) throw new Problem('That domain is already live on another page.');
    throw new Problem('Could not save your domain. Try again.', 502);
  }
  return method === 'DELETE' && response.status === 204 ? [] : ((await response.json()) as Row[]);
}

const ownRow = async (userId: string) =>
  (await database('GET', `select=user_id,domain,verified_at&user_id=eq.${userId}`))[0] ?? null;

/** Calls Netlify's API for this site. */
async function netlify(method: string, path: string, body?: unknown) {
  const token = Netlify.env.get('NETLIFY_API_TOKEN');
  const site = Netlify.env.get('NOTIS_SITE_ID') ?? Netlify.env.get('SITE_ID');
  const response = await fetch(`https://api.netlify.com/api/v1/sites/${site}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const why = await response.text();
    console.error('Netlify error', response.status, path, why);
    throw new Problem(
      response.status === 422
        ? 'Netlify won’t take this domain. It may already be connected to another site.'
        : 'Could not reach Netlify to connect your domain. Try again.',
      502,
    );
  }
  return response.json() as Promise<Record<string, unknown>>;
}

interface Site {
  /** "notis.netlify.app": where a subdomain's CNAME points. */
  target: string;
  aliases: string[];
}

async function site(): Promise<Site> {
  const data = await netlify('GET', '');
  const aliases = Array.isArray(data.domain_aliases) ? (data.domain_aliases as string[]) : [];
  return { target: `${String(data.name)}.netlify.app`, aliases };
}

async function setAliases(aliases: string[]) {
  await netlify('PATCH', '', { domain_aliases: aliases });
  // Asks Netlify to renew the certificate so it covers the new list. Netlify also does this
  // on its own, so a failure here only means HTTPS takes a little longer.
  await netlify('POST', '/ssl').catch(() => {});
}

/** DNS answers for a name, read through Cloudflare's DNS over HTTPS. */
async function lookup(name: string, type: 'CNAME' | 'A' | 'TXT'): Promise<string[]> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
  const response = await fetch(url, {
    headers: { accept: 'application/dns-json' },
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  if (!response?.ok) return [];
  const result = (await response.json()) as { Answer?: { type: number; data: string }[] };
  const code = { CNAME: 5, A: 1, TXT: 16 }[type];
  return (result.Answer ?? [])
    .filter((answer) => answer.type === code)
    .map((answer) => answer.data.toLowerCase().replace(/\.$/, '').replace(/^"|"$/g, ''));
}

/** Why the domain's DNS doesn't prove it is the writer's and points at Notis yet; null when it does. */
async function dnsProblem(domain: string, userId: string, target: string): Promise<string | null> {
  const cname = await lookup(domain, 'CNAME');
  if (cname.includes(target)) return null;
  if (isApexDomain(domain) || cname.length === 0) {
    const [a, txt] = await Promise.all([
      lookup(domain, 'A'),
      lookup(verifyRecordName(domain), 'TXT'),
    ]);
    // Netlify's IP is shared by every Netlify site, so a root domain also needs the TXT
    // record to show this writer controls it.
    if (a.includes(NETLIFY_APEX_IP) && txt.includes(verifyRecordValue(userId))) return null;
    if (isApexDomain(domain)) {
      if (!a.includes(NETLIFY_APEX_IP)) return `${domain} doesn’t point to ${NETLIFY_APEX_IP} yet.`;
      return `The TXT record on ${verifyRecordName(domain)} isn’t there yet.`;
    }
  }
  return cname.length
    ? `${domain} points to ${cname[0]}, not ${target}.`
    : `${domain} doesn’t have a CNAME record pointing to ${target} yet.`;
}

/** Checks DNS and, once it is right, puts the domain live. */
async function check(row: Row, target: string): Promise<Record<string, unknown>> {
  if (row.verified_at) return { domain: row.domain, live: true, target };
  const problem = await dnsProblem(row.domain, row.user_id, target);
  if (problem) return { domain: row.domain, live: false, problem, target };
  const taken = await database(
    'GET',
    `select=user_id&domain=eq.${row.domain}&verified_at=not.is.null&user_id=neq.${row.user_id}`,
  );
  if (taken.length) throw new Problem('That domain is already live on another Notis page.');
  const { aliases } = await site();
  if (!aliases.includes(row.domain)) await setAliases([...aliases, row.domain]);
  await database('PATCH', `user_id=eq.${row.user_id}`, {
    verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return { domain: row.domain, live: true, target };
}

/** Takes a domain the writer no longer uses off this site. */
async function release(domain: string) {
  const { aliases } = await site();
  if (aliases.includes(domain)) await setAliases(aliases.filter((alias) => alias !== domain));
}

interface DomainRequest {
  action?: unknown;
  domain?: unknown;
}

export default async function customDomain(request: Request) {
  if (request.method !== 'POST') return reply(405, { error: 'Use POST.' });
  if (
    !Netlify.env.get('NETLIFY_API_TOKEN') ||
    !Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
    !(Netlify.env.get('NOTIS_SITE_ID') ?? Netlify.env.get('SITE_ID'))
  )
    return reply(503, { error: 'Custom domains are not set up on this server yet.' });
  const userId = await signedInUser(request);
  if (!userId) return reply(401, { error: 'Sign in to set up your domain.' });

  let body: DomainRequest;
  try {
    body = (await request.json()) as DomainRequest;
  } catch {
    return reply(400, { error: 'Send the request as JSON.' });
  }

  try {
    const row = await ownRow(userId);
    if (body.action === 'remove') {
      if (row?.verified_at) await release(row.domain);
      if (row) await database('DELETE', `user_id=eq.${userId}`);
      return reply(200, { domain: null, live: false });
    }
    const { target } = await site();
    if (body.action === 'check') {
      if (!row) return reply(200, { domain: null, live: false, target });
      return reply(200, await check(row, target));
    }
    if (body.action !== 'connect' || typeof body.domain !== 'string')
      return reply(400, { error: 'Unknown request.' });
    const domain = normalizeDomain(body.domain);
    const problem = domainProblem(domain);
    if (problem) return reply(400, { error: problem });
    if (row?.domain === domain) return reply(200, await check(row, target));
    if (row?.verified_at) await release(row.domain);
    const [saved] = await database('POST', 'on_conflict=user_id', {
      user_id: userId,
      domain,
      verified_at: null,
      updated_at: new Date().toISOString(),
    });
    return reply(200, await check(saved, target));
  } catch (reason) {
    if (reason instanceof Problem) return reply(reason.status, { error: reason.message });
    console.error('Custom domain error', reason);
    return reply(500, { error: 'Something went wrong. Try again.' });
  }
}

export const config = { path: '/api/custom-domain' };
