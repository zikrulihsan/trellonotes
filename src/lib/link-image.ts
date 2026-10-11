/**
 * Finds a website's icon, so a project linked
 * to a site can show it. Used by the `link-image` edge function; kept free
 * of app imports so the edge function can use it as is.
 */

/** Only public web pages: no local or private network addresses. */
export function isPublicWebUrl(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password || (url.port && url.port !== '80' && url.port !== '443'))
    return null;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    !host.includes('.') ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.includes(':') ||
    /^(0|10|127)\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host)
  )
    return null;
  return url;
}

const ATTRIBUTE = (name: string) => new RegExp(`${name}\\s*=\\s*(["'])(.*?)\\1`, 'i');

/** The site's own /favicon.ico, the icon browsers fall back to. */
export function defaultIcon(pageUrl: string) {
  return new URL('/favicon.ico', pageUrl.replace(/^http:/i, 'https:')).href;
}

/**
 * The page's best icon as an absolute https address: the largest one it declares (the
 * apple-touch-icon is usually 180px), else its /favicon.ico.
 */
export function siteIcon(html: string, pageUrl: string): string {
  const head = html.slice(0, 200_000);
  let best: { href: string; score: number } | null = null;
  for (const [tag] of head.matchAll(/<link\b[^>]*>/gi)) {
    const rel = ATTRIBUTE('rel').exec(tag)?.[2]?.toLowerCase() ?? '';
    const href = ATTRIBUTE('href').exec(tag)?.[2]?.trim().replace(/&amp;/g, '&');
    if (!href || !/(^|\s)(icon|apple-touch-icon(-precomposed)?)(\s|$)/.test(rel)) continue;
    const sizes = ATTRIBUTE('sizes').exec(tag)?.[2]?.toLowerCase() ?? '';
    const size = Math.max(0, ...[...sizes.matchAll(/(\d+)x\d+/g)].map((m) => Number(m[1])));
    const score =
      sizes === 'any' || /\.svg(\?|$)/i.test(href)
        ? 512
        : size || (rel.includes('apple-touch-icon') ? 180 : 16);
    try {
      const icon = new URL(href, pageUrl);
      if (icon.protocol === 'http:') icon.protocol = 'https:';
      if (icon.protocol !== 'https:') continue;
      if (!best || score > best.score) best = { href: icon.href, score };
    } catch {
      /* Not a usable address. */
    }
  }
  return best?.href ?? defaultIcon(pageUrl);
}
