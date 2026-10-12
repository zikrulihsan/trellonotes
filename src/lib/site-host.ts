// Which site a hostname is: the Notis app, a writer's subdomain (zikrul.notis.swegrowth.id)
// or a writer's own domain (zikrul.dev). Shared by the app and the Netlify edge functions,
// so it imports nothing.

/** Where the app itself is served. The first is the current address. */
export const APP_HOSTS = ['notis.swegrowth.id', 'notes.swegrowth.id'];

/** Writers' subdomains live under this domain: <handle>.notis.swegrowth.id. */
export const SUBDOMAIN_ROOT = APP_HOSTS[0];

/**
 * Whether <handle>.notis.swegrowth.id answers yet. It needs a wildcard DNS record and a
 * wildcard domain on Netlify (docs/custom-domains.md); until then the app doesn't show it.
 */
export const SUBDOMAINS_LIVE = false;

/** Netlify's address for root domains that can't use a CNAME. */
export const NETLIFY_APEX_IP = '75.2.60.5';

/** 3–30 lowercase letters, digits and dashes, not starting or ending with a dash. */
export const HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

/** Labels and a top-level domain, lowercase: "blog.zikrul.dev". */
export const DOMAIN_PATTERN = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export type SiteHost =
  { kind: 'app' } | { kind: 'subdomain'; handle: string } | { kind: 'custom'; domain: string };

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

export function classifyHost(hostname: string): SiteHost {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (
    !host.includes('.') ||
    IPV4.test(host) ||
    host.startsWith('[') ||
    host.endsWith('.netlify.app') ||
    host.endsWith('.localhost') ||
    APP_HOSTS.includes(host) ||
    APP_HOSTS.some((app) => host === `www.${app}`)
  )
    return { kind: 'app' };
  if (host.endsWith(`.${SUBDOMAIN_ROOT}`)) {
    const label = host.slice(0, -SUBDOMAIN_ROOT.length - 1);
    return HANDLE_PATTERN.test(label) && label !== 'www'
      ? { kind: 'subdomain', handle: label }
      : { kind: 'app' };
  }
  return { kind: 'custom', domain: host };
}

/** "zikrul.dev" from what a writer typed: "https://Zikrul.dev/", "www.zikrul.dev." … */
export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
}

/** Why a writer can't use this domain, or null when they can. */
export function domainProblem(domain: string): string | null {
  if (!domain) return 'Type your domain, like zikrul.dev or blog.zikrul.dev.';
  if (domain.length > 253 || !DOMAIN_PATTERN.test(domain))
    return 'That doesn’t look like a domain. Try something like zikrul.dev.';
  if (classifyHost(domain).kind !== 'custom')
    return 'That address belongs to Notis. Use a domain you own.';
  return null;
}

// Second-level suffixes under which the third label is the domain someone buys.
const SECOND_LEVEL = new Set([
  'co.id',
  'my.id',
  'web.id',
  'biz.id',
  'or.id',
  'ac.id',
  'sch.id',
  'net.id',
  'ponpes.id',
  'co.uk',
  'org.uk',
  'me.uk',
  'com.au',
  'net.au',
  'co.nz',
  'com.sg',
  'com.my',
  'co.jp',
  'com.br',
  'co.in',
  'co.za',
  'com.ph',
  'com.vn',
  'co.th',
]);

/**
 * True for a domain someone buys (zikrul.dev, zikrul.my.id), which DNS providers don't let
 * point somewhere with a CNAME; false for a subdomain of one (blog.zikrul.dev).
 */
export function isApexDomain(domain: string): boolean {
  const labels = domain.split('.');
  if (labels.length <= 2) return true;
  return labels.length === 3 && SECOND_LEVEL.has(labels.slice(1).join('.'));
}

/** The TXT record that proves a writer controls a root domain pointed at Netlify's shared IP. */
export const verifyRecordName = (domain: string) => `_notis.${domain}`;
export const verifyRecordValue = (userId: string) => `notis-verify=${userId}`;

// The handle whose page this site shows, once known; null on the app itself.
let siteHandle: string | null = null;

export const getSiteHandle = () => siteHandle;
export function setSiteHandle(handle: string | null) {
  siteHandle = handle;
}
