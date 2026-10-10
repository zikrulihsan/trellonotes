import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Page } from '@/features/workspace/types';
import { slugify } from '@/lib/slug';

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

/** Who public pages belong to: the handle when one is set, else the account id (older links). */
export interface PublicAuthor {
  userId: string;
  handle: string | null;
}

/** "/@zikrul/catatan-rilis", or "/read/<account id>/catatan-rilis" without a handle. */
export function writerPath(author: PublicAuthor, slug?: string): string {
  const base = author.handle ? `/@${author.handle}` : `/read/${author.userId}`;
  return slug ? `${base}/${slug}` : base;
}

export function writerUrl(author: PublicAuthor, slug?: string): string {
  return `${window.location.origin}${writerPath(author, slug)}`;
}

/** Turns database errors into messages a writer can act on. */
function explain(error: PostgrestError): Error {
  if (error.code === 'PGRST205' || error.code === '42P01')
    return new Error(
      'Publishing is not set up yet: the published pages table is missing from the database.',
    );
  return new Error(error.message || 'Could not reach the server.');
}

/** True when the database predates unlisted pages (the `unlisted` column is missing). */
const lacksUnlisted = (error: PostgrestError) =>
  (error.code === 'PGRST204' || error.code === '42703') && error.message.includes('unlisted');

const UNLISTED_MISSING = new Error(
  'Unlisted pages are not set up yet: the database needs its latest update.',
);

/**
 * Publishes the page, or updates its public copy. A page keeps its first slug so
 * shared links keep working after the title changes.
 */
export async function publishPage(
  client: SupabaseClient,
  page: Page,
  authorName: string | null,
  unlisted = page.published?.unlisted ?? false,
): Promise<NonNullable<Page['published']>> {
  const base = page.published?.slug ?? (slugify(page.title) || 'untitled');
  // Listed pages still publish on a database that predates unlisted pages.
  let sendUnlisted = true;
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
        ...(sendUnlisted && { unlisted }),
      },
      { onConflict: 'id' },
    );
    if (!error) return { slug, at: Date.now(), ...(unlisted && { unlisted }) };
    if (lacksUnlisted(error)) {
      if (unlisted) throw UNLISTED_MISSING;
      sendUnlisted = false;
      attempt--;
      continue;
    }
    // Another of this writer's pages already uses the slug: try the next one.
    if (error.code === '23505' && !page.published) continue;
    throw explain(error);
  }
  throw new Error('Could not find a free link for this page. Try a different title.');
}

/** Moves a live page on or off the public list without republishing its content. */
export async function setPageUnlisted(
  client: SupabaseClient,
  pageId: string,
  unlisted: boolean,
): Promise<void> {
  const { error } = await client.from(TABLE).update({ unlisted }).eq('id', pageId);
  if (error) throw lacksUnlisted(error) ? UNLISTED_MISSING : explain(error);
}

export async function unpublishPage(client: SupabaseClient, pageId: string): Promise<void> {
  const { error } = await client.from(TABLE).delete().eq('id', pageId);
  if (error) throw explain(error);
}

export async function listPublishedPages(
  client: SupabaseClient,
  authorId: string,
): Promise<PublishedPage[]> {
  const query = (listedOnly: boolean) => {
    const pages = client
      .from(TABLE)
      .select('id, slug, title, content, author_name, published_at, updated_at')
      .eq('user_id', authorId);
    return (listedOnly ? pages.eq('unlisted', false) : pages).order('published_at', {
      ascending: false,
    });
  };
  // Unlisted pages open from their link only, so they stay off the public list.
  const { data, error } = await query(true);
  if (!error) return data;
  if (!lacksUnlisted(error)) throw explain(error);
  // Before unlisted pages existed, every published page was listed.
  const fallback = await query(false);
  if (fallback.error) throw explain(fallback.error);
  return fallback.data;
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
