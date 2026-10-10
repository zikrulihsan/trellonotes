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
  /** Left out of the public list; missing on a database that predates unlisted pages. */
  unlisted?: boolean;
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

/** Lowercase letters and digits that can't be mistaken for each other (no 0/o, 1/l/i). */
const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function newShortCode(length = 7): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

/** A short link a writer picks: 3–40 lowercase letters or digits, with dashes between words. */
export const SHORT_CODE_PATTERN = /^(?=.{3,40}$)[a-z0-9]+(-[a-z0-9]+)*$/;

/** Turns what a writer types into a short code: "CV 2026!" → "cv-2026". */
export const toShortCode = (text: string) => slugify(text, 40);

const SHORT_LINKS_MISSING = new Error(
  'Short links are not set up yet: the database needs its latest update.',
);
const lacksShortCode = (error: PostgrestError) =>
  (error.code === 'PGRST204' || error.code === '42703') && error.message.includes('short_code');

/** "/s/k7m2xq9": a short link that opens the page wherever it lives. */
export const shortPath = (code: string) => `/s/${code}`;
export const shortUrl = (code: string) => `${window.location.origin}${shortPath(code)}`;

/**
 * Gives a live page its short link, the first time one is asked for. Returns the
 * code to keep on the page.
 */
export async function ensureShortCode(client: SupabaseClient, page: Page): Promise<string> {
  if (!page.published) throw new Error('Publish this page to get a short link.');
  if (page.published.code) return page.published.code;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const code = newShortCode();
    // Only fills an empty code, so a link already handed out (maybe from another device) keeps working.
    const { data, error } = await client
      .from(TABLE)
      .update({ short_code: code })
      .eq('id', page.id)
      .is('short_code', null)
      .select('short_code');
    if (!error && data.length) return code;
    if (!error) {
      const existing = await client
        .from(TABLE)
        .select('short_code')
        .eq('id', page.id)
        .maybeSingle<{ short_code: string | null }>();
      if (existing.error) throw explain(existing.error);
      if (existing.data?.short_code) return existing.data.short_code;
      throw new Error('This page is no longer published.');
    }
    // Another page already has this code: draw again.
    if (error.code === '23505') continue;
    if (lacksShortCode(error)) throw SHORT_LINKS_MISSING;
    throw explain(error);
  }
  throw new Error('Could not make a short link. Try again.');
}

/**
 * Sets a short link the writer chose. The previous short link stops working, since
 * a page has one short link at a time.
 */
export async function setShortCode(
  client: SupabaseClient,
  pageId: string,
  code: string,
): Promise<string> {
  if (!SHORT_CODE_PATTERN.test(code))
    throw new Error('Use 3–40 lowercase letters or numbers, with dashes between words.');
  const { data, error } = await client
    .from(TABLE)
    .update({ short_code: code })
    .eq('id', pageId)
    .select('short_code');
  if (error?.code === '23505') throw new Error(`/s/${code} is already taken.`);
  // The older format check (random codes only) rejects dashes and other lengths.
  if (error?.code === '23514') throw SHORT_LINKS_MISSING;
  if (error) throw lacksShortCode(error) ? SHORT_LINKS_MISSING : explain(error);
  if (!data.length) throw new Error('This page is no longer published.');
  return code;
}

/** Where a short link points: the author and the page's slug, or null when it's gone. */
export async function resolveShortCode(
  client: SupabaseClient,
  code: string,
): Promise<{ userId: string; slug: string } | null> {
  const { data, error } = await client
    .from(TABLE)
    .select('user_id, slug')
    .eq('short_code', code.toLowerCase())
    .maybeSingle<{ user_id: string; slug: string }>();
  if (error) throw explain(error);
  return data && { userId: data.user_id, slug: data.slug };
}

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
    if (!error) {
      const code = page.published?.code;
      return { slug, at: Date.now(), ...(unlisted && { unlisted }), ...(code && { code }) };
    }
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
  const query = (columns: string) =>
    client
      .from(TABLE)
      .select(columns)
      .eq('user_id', authorId)
      .eq('slug', slug)
      .maybeSingle<PublishedPage>();
  const columns = 'id, slug, title, content, author_name, published_at, updated_at';
  const { data, error } = await query(`${columns}, unlisted`);
  if (!error) return data;
  if (!lacksUnlisted(error)) throw explain(error);
  // Before unlisted pages existed, every published page was listed.
  const fallback = await query(columns);
  if (fallback.error) throw explain(fallback.error);
  return fallback.data;
}
