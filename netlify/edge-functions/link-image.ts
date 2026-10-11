// Answers with a website's icon, for projects on a landing page that link to a site instead
// of a write-up. Results are cached at Netlify's edge.
import { defaultIcon, isPublicWebUrl, siteIcon } from '../../src/lib/link-image.ts';

const reply = (body: { image: string | null }, maxAge: number) =>
  new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json',
      'cache-control': `public, max-age=${maxAge}`,
      'netlify-cdn-cache-control': `public, s-maxage=${maxAge * 7}, durable`,
    },
  });

/** Reads the start of the page only; icon links live in its head. */
async function readHead(response: Response, limit = 300_000) {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let html = '';
  while (html.length < limit) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: true });
    if (/<\/head>/i.test(html)) break;
  }
  await reader.cancel().catch(() => {});
  return html;
}

export default async function linkImage(request: Request) {
  const target = isPublicWebUrl(new URL(request.url).searchParams.get('url') ?? '');
  if (!target) return new Response('Give a public web address as ?url=', { status: 400 });
  try {
    let url = target;
    let response: Response | null = null;
    // Follow redirects by hand so each hop is checked too.
    for (let hop = 0; hop < 4; hop++) {
      response = await fetch(url, {
        redirect: 'manual',
        headers: {
          'user-agent':
            'Mozilla/5.0 (compatible; NotisLinkPreview/1.0; +https://notis.swegrowth.id)',
          accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(5000),
      });
      const next = response.headers.get('location');
      if (response.status < 300 || response.status >= 400 || !next) break;
      const checked = isPublicWebUrl(new URL(next, url).href);
      if (!checked) return reply({ image: defaultIcon(target.href) }, 3600);
      url = checked;
    }
    if (!response?.ok || !response.headers.get('content-type')?.includes('html'))
      return reply({ image: defaultIcon(url.href) }, 3600);
    return reply({ image: siteIcon(await readHead(response), url.href) }, 86400);
  } catch {
    return reply({ image: defaultIcon(target.href) }, 600);
  }
}

export const config = { path: '/api/link-image' };
