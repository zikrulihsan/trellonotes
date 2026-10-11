/**
 * Finds the preview image a website shares for itself (Open Graph or Twitter card), so a
 * project linked to a site can show it. Used by the `link-image` edge function; kept free
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

/** The page's preview image as an absolute https address, or null. */
export function previewImage(html: string, pageUrl: string): string | null {
  const head = html.slice(0, 200_000);
  const found: Record<string, string> = {};
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const key = (ATTRIBUTE('property').exec(tag) ?? ATTRIBUTE('name').exec(tag))?.[2]
      ?.toLowerCase()
      .trim();
    const content = ATTRIBUTE('content').exec(tag)?.[2]?.trim();
    if (key && content && !(key in found)) found[key] = content.replace(/&amp;/g, '&');
  }
  const raw =
    found['og:image:secure_url'] ??
    found['og:image'] ??
    found['og:image:url'] ??
    found['twitter:image'] ??
    found['twitter:image:src'];
  if (!raw) return null;
  try {
    const image = new URL(raw, pageUrl);
    // The page is served over https, so the image must be too.
    if (image.protocol === 'http:') image.protocol = 'https:';
    return image.protocol === 'https:' ? image.href : null;
  } catch {
    return null;
  }
}
