import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Feather } from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';
import { supabase } from '@/lib/supabase/client';
import { plainText } from '@/lib/text';
import {
  getPublishedPage,
  listPublishedPages,
  writerPath,
  type PublicAuthor,
} from '@/lib/supabase/published-pages';
import { getProfile } from '@/lib/supabase/profiles';
import { writingExtensions } from '@/features/editor/extensions';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

type Load<T> =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T };

/** Loads public data for the current route; `null` data means not found. */
function usePublicData<T>(load: () => Promise<T>, deps: unknown[]): Load<T> {
  const [state, setState] = useState<Load<T> & { key: string }>({ status: 'loading', key: '' });
  const key = JSON.stringify(deps);
  useEffect(() => {
    let active = true;
    load().then(
      (data) => active && setState({ status: 'ready', data, key }),
      (reason: unknown) =>
        active &&
        setState({
          status: 'error',
          message: reason instanceof Error ? reason.message : 'Could not load this page.',
          key,
        }),
    );
    return () => {
      active = false;
    };
    // `key` captures the inputs `load` depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state.key === key ? state : { status: 'loading' };
}

type Address = { handle: string; slug?: string } | { userId: string; slug?: string };

function parseAddress(pathname: string): Address | null {
  let parts: string[];
  try {
    parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return null;
  }
  if (parts[0]?.startsWith('@')) return { handle: parts[0].slice(1), slug: parts[1] };
  if (parts[0] === 'read' && UUID.test(parts[1] ?? '')) return { userId: parts[1], slug: parts[2] };
  return null;
}

type Author = PublicAuthor & { name: string | null };
/** `redirect` is set when an older account-id link now has a handle address. */
type Resolved = { author: Author; redirect?: string } | null;

async function resolveAuthor(address: Address): Promise<Resolved> {
  if (!supabase) return null;
  const profile = await getProfile(
    supabase,
    'handle' in address ? { handle: address.handle } : { userId: address.userId },
  );
  if (!profile)
    return 'handle' in address
      ? null
      : { author: { userId: address.userId, handle: null, name: null } };
  const author = { userId: profile.user_id, handle: profile.handle, name: profile.display_name };
  return 'handle' in address ? { author } : { author, redirect: writerPath(author, address.slug) };
}

/** Public pages anyone can open without signing in. */
export function PublicReader() {
  const { pathname } = useLocation();
  const address = parseAddress(pathname);
  const result = usePublicData(
    () => (address ? resolveAuthor(address) : Promise.resolve(null)),
    [pathname],
  );
  let body;
  if (result.status !== 'ready') body = <Status result={result} />;
  else if (!result.data || !address) body = <NotFound />;
  else if (result.data.redirect) body = <Navigate to={result.data.redirect} replace />;
  else if (address.slug) body = <ArticlePage author={result.data.author} slug={address.slug} />;
  else body = <AuthorPage author={result.data.author} />;
  return (
    <div className="reader">
      {body}
      <footer className="reader-footer">
        <Feather size={13} />
        Written with folio
      </footer>
    </div>
  );
}

function AuthorPage({ author }: { author: Author }) {
  const result = usePublicData(
    () => (supabase ? listPublishedPages(supabase, author.userId) : Promise.resolve([])),
    [author.userId],
  );
  const name =
    author.name ?? (result.status === 'ready' ? result.data[0]?.author_name : null) ?? null;
  useEffect(() => {
    document.title = name ? `Writing by ${name}` : 'Writing';
  }, [name]);
  if (result.status !== 'ready') return <Status result={result} />;
  return (
    <main className="reader-column">
      <header className="reader-header">
        <p className="eyebrow">{author.handle ? `@${author.handle}` : 'WRITING'}</p>
        <h1>{name ? `Writing by ${name}` : 'Writing'}</h1>
      </header>
      {result.data.length ? (
        <ul className="reader-list">
          {result.data.map((page) => (
            <li key={page.id}>
              <Link to={writerPath(author, page.slug)}>
                <time dateTime={page.published_at}>{longDate(page.published_at)}</time>
                <h2>{page.title}</h2>
                <p>{plainText(page.content).slice(0, 220)}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="reader-empty">Nothing has been published here yet.</p>
      )}
    </main>
  );
}

function ArticlePage({ author, slug }: { author: Author; slug: string }) {
  const result = usePublicData(
    () => (supabase ? getPublishedPage(supabase, author.userId, slug) : Promise.resolve(null)),
    [author.userId, slug],
  );
  const page = result.status === 'ready' ? result.data : null;
  useEffect(() => {
    if (page) document.title = page.title;
  }, [page]);
  if (result.status !== 'ready') return <Status result={result} />;
  if (!page) return <NotFound />;
  const name = author.name ?? page.author_name;
  return (
    <main className="reader-column">
      <Link className="reader-back" to={writerPath(author)}>
        <ArrowLeft size={15} />
        {name ? `More from ${name}` : 'More writing'}
      </Link>
      <article>
        <header className="reader-header">
          <h1>{page.title}</h1>
          <p className="reader-byline">
            {name && <span>{name} · </span>}
            <time dateTime={page.published_at}>{longDate(page.published_at)}</time>
          </p>
        </header>
        <ReadOnlyContent html={page.content} />
      </article>
    </main>
  );
}

/**
 * Renders published HTML through the editor schema, which keeps only the formatting
 * the editor supports and drops scripts, event handlers and unsafe links.
 */
function ReadOnlyContent({ html }: { html: string }) {
  const editor = useEditor(
    {
      extensions: writingExtensions(),
      content: html,
      editable: false,
      editorProps: { attributes: { class: 'writing-content reader-content' } },
    },
    [html],
  );
  return <EditorContent editor={editor} />;
}

function Status({ result }: { result: Load<unknown> }) {
  return (
    <main className="reader-column reader-status" role="status">
      {result.status === 'error' ? result.message : 'Loading…'}
    </main>
  );
}

function NotFound() {
  return (
    <main className="reader-column reader-status">
      <h1>Page not found</h1>
      <p>It may have been unpublished, or the link is incomplete.</p>
    </main>
  );
}
