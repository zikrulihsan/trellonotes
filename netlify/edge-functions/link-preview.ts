// Gives shared page links a preview with the page's own title and summary, since
// link previews read the HTML without running the app. See src/lib/link-preview.ts.
import { firstImage, summarize, withPreview, type Preview } from '../../src/lib/link-preview.ts';

// Public values, the same ones the app is built with (netlify.toml).
const SUPABASE_URL =
  Netlify.env.get('VITE_SUPABASE_URL') ?? 'https://vqtzmhfnyaujkbczibwu.supabase.co';
const SUPABASE_KEY =
  Netlify.env.get('VITE_SUPABASE_PUBLISHABLE_KEY') ??
  'sb_publishable_mnferSlOXnSwAxFkK-nMYg_3MPzYhYm';

interface PageRow {
  title: string;
  content: string;
  author_name: string | null;
}

/** One row from Supabase's REST API, or null. */
async function one<T>(table: string, query: Record<string, string>): Promise<T | null> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  url.searchParams.set('limit', '1');
  const response = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, accept: 'application/json' },
    signal: AbortSignal.timeout(2500),
  });
  if (!response.ok) return null;
  const rows = (await response.json()) as T[];
  return rows[0] ?? null;
}

const PAGE_COLUMNS = 'title,content,author_name';

function pagePreview(page: PageRow, url: string, author?: string | null): Preview {
  const name = author ?? page.author_name;
  const summary = summarize(page.content);
  return {
    title: page.title,
    description: summary || (name ? `By ${name}` : ''),
    url,
    image: firstImage(page.content),
    type: 'article',
  };
}

async function findPreview(url: URL): Promise<Preview | null> {
  let parts: string[];
  try {
    parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return null;
  }
  const href = url.href;
  if (parts[0] === 's' && parts.length === 2) {
    const page = await one<PageRow>('trellonotes_published_pages', {
      select: PAGE_COLUMNS,
      short_code: `eq.${parts[1].toLowerCase()}`,
    });
    return page && pagePreview(page, href);
  }
  if (parts[0]?.startsWith('@') && parts.length <= 2) {
    const profile = await one<{ user_id: string; display_name: string | null }>(
      'trellonotes_profiles',
      { select: 'user_id,display_name', handle: `eq.${parts[0].slice(1).toLowerCase()}` },
    );
    if (!profile) return null;
    if (parts.length === 1) {
      const name = profile.display_name;
      return {
        title: name ? `Writing by ${name}` : `${parts[0]} on Folio`,
        description: `Everything ${name ?? parts[0]} has published on Folio.`,
        url: href,
        type: 'profile',
      };
    }
    const page = await one<PageRow>('trellonotes_published_pages', {
      select: PAGE_COLUMNS,
      user_id: `eq.${profile.user_id}`,
      slug: `eq.${parts[1]}`,
    });
    return page && pagePreview(page, href, profile.display_name);
  }
  if (parts[0] === 'read' && parts.length === 3) {
    const page = await one<PageRow>('trellonotes_published_pages', {
      select: PAGE_COLUMNS,
      user_id: `eq.${parts[1]}`,
      slug: `eq.${parts[2]}`,
    });
    return page && pagePreview(page, href);
  }
  return null;
}

export default async function linkPreview(request: Request, context: Context) {
  const response = await context.next();
  if (!response.headers.get('content-type')?.includes('text/html')) return response;
  const preview = await findPreview(new URL(request.url)).catch(() => null);
  if (!preview) return response;
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(withPreview(await response.text(), preview), {
    status: response.status,
    headers,
  });
}

export const config = { path: ['/@*', '/s/*', '/read/*'] };
