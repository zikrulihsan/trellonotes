import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Page } from '@/features/workspace/types';

const TABLE = 'trellonotes_published_pages';

export interface PublishedPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  author_name: string | null;
  published_at: string;
  updated_at: string;
}

/** "Catatan Minggu Ini: Rilis 2.0!" → "catatan-minggu-ini-rilis-2-0" */
export function slugify(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return slug || 'untitled';
}

export function publicWritingPath(authorId: string, slug?: string): string {
  return `/read/${authorId}${slug ? `/${slug}` : ''}`;
}

export function publicWritingUrl(authorId: string, slug?: string): string {
  return `${window.location.origin}${window.location.pathname}#${publicWritingPath(authorId, slug)}`;
}

/** Turns database errors into messages a writer can act on. */
function explain(error: PostgrestError): Error {
  if (error.code === 'PGRST205' || error.code === '42P01')
    return new Error(
      'Publishing is not set up yet: the published pages table is missing from the database.',
    );
  return new Error(error.message || 'Could not reach the server.');
}

/**
 * Publishes the page, or updates its public copy. A page keeps its first slug so
 * shared links keep working after the title changes.
 */
export async function publishPage(
  client: SupabaseClient,
  page: Page,
  authorName: string | null,
): Promise<NonNullable<Page['published']>> {
  const base = page.published?.slug ?? slugify(page.title);
  for (let attempt = 1; attempt <= 20; attempt++) {
    const slug = attempt === 1 ? base : `${base}-${attempt}`;
    const { error } = await client.from(TABLE).upsert(
      {
        id: page.id,
        slug,
        title: page.title.trim() || 'Untitled',
        content: page.content,
        author_name: authorName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
    if (!error) return { slug, at: Date.now() };
    // Another of this writer's pages already uses the slug: try the next one.
    if (error.code === '23505' && !page.published) continue;
    throw explain(error);
  }
  throw new Error('Could not find a free link for this page. Try a different title.');
}

export async function unpublishPage(client: SupabaseClient, pageId: string): Promise<void> {
  const { error } = await client.from(TABLE).delete().eq('id', pageId);
  if (error) throw explain(error);
}

export async function listPublishedPages(
  client: SupabaseClient,
  authorId: string,
): Promise<PublishedPage[]> {
  const { data, error } = await client
    .from(TABLE)
    .select('id, slug, title, content, author_name, published_at, updated_at')
    .eq('user_id', authorId)
    .order('published_at', { ascending: false });
  if (error) throw explain(error);
  return data;
}

export async function getPublishedPage(
  client: SupabaseClient,
  authorId: string,
  slug: string,
): Promise<PublishedPage | null> {
  const { data, error } = await client
    .from(TABLE)
    .select('id, slug, title, content, author_name, published_at, updated_at')
    .eq('user_id', authorId)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw explain(error);
  return data;
}
