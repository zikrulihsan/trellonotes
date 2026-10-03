import { useEffect, useState } from 'react';
import { Link, Route, Routes, useParams } from 'react-router-dom';
import { ArrowLeft, Feather } from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';
import { supabase } from '@/lib/supabase/client';
import { plainText } from '@/lib/text';
import {
  getPublishedPage,
  listPublishedPages,
  publicWritingPath,
  type PublishedPage,
} from '@/lib/supabase/published-pages';
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

/** Public pages anyone can open without signing in. */
export function PublicReader() {
  return (
    <div className="reader">
      <Routes>
        <Route path=":authorId" element={<AuthorPage />} />
        <Route path=":authorId/:slug" element={<ArticlePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <footer className="reader-footer">
        <Feather size={13} />
        Written with folio
      </footer>
    </div>
  );
}

function AuthorPage() {
  const { authorId = '' } = useParams();
  const result = usePublicData(
    () =>
      supabase && UUID.test(authorId)
        ? listPublishedPages(supabase, authorId)
        : Promise.resolve([] as PublishedPage[]),
    [authorId],
  );
  const author = result.status === 'ready' ? result.data[0]?.author_name : null;
  useEffect(() => {
    document.title = author ? `Writing by ${author}` : 'Writing';
  }, [author]);
  if (result.status !== 'ready') return <Status result={result} />;
  return (
    <main className="reader-column">
      <header className="reader-header">
        <p className="eyebrow">WRITING</p>
        <h1>{author ? `Writing by ${author}` : 'Writing'}</h1>
      </header>
      {result.data.length ? (
        <ul className="reader-list">
          {result.data.map((page) => (
            <li key={page.id}>
              <Link to={publicWritingPath(authorId, page.slug)}>
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

function ArticlePage() {
  const { authorId = '', slug = '' } = useParams();
  const result = usePublicData(
    () =>
      supabase && UUID.test(authorId)
        ? getPublishedPage(supabase, authorId, slug)
        : Promise.resolve(null),
    [authorId, slug],
  );
  const page = result.status === 'ready' ? result.data : null;
  useEffect(() => {
    if (page) document.title = page.title;
  }, [page]);
  if (result.status !== 'ready') return <Status result={result} />;
  if (!page) return <NotFound />;
  return (
    <main className="reader-column">
      <Link className="reader-back" to={publicWritingPath(authorId)}>
        <ArrowLeft size={15} />
        {page.author_name ? `More from ${page.author_name}` : 'More writing'}
      </Link>
      <article>
        <header className="reader-header">
          <h1>{page.title}</h1>
          <p className="reader-byline">
            {page.author_name && <span>{page.author_name} · </span>}
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
