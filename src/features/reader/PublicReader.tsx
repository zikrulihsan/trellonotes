import { useEffect, useState, type CSSProperties } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Feather } from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';
import { supabase } from '@/lib/supabase/client';
import { plainText } from '@/lib/text';
import {
  getPublishedPage,
  listPublishedPages,
  resolveShortCode,
  SHORT_CODE_PATTERN,
  writerPath,
  type PublicAuthor,
  type PublishedPage,
} from '@/lib/supabase/published-pages';
import { defaultLanding, getLanding, type Landing } from '@/lib/supabase/landing';
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

type Address =
  { handle: string; slug?: string } | { userId: string; slug?: string } | { code: string };

function parseAddress(pathname: string): Address | null {
  let parts: string[];
  try {
    parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return null;
  }
  if (parts[0] === 's' && parts.length === 2 && SHORT_CODE_PATTERN.test(parts[1].toLowerCase()))
    return { code: parts[1] };
  if (parts[0]?.startsWith('@')) return { handle: parts[0].slice(1), slug: parts[1] };
  if (parts[0] === 'read' && UUID.test(parts[1] ?? '')) return { userId: parts[1], slug: parts[2] };
  return null;
}

type Author = PublicAuthor & { name: string | null };
/**
 * `redirect` is set when an older account-id link now has a handle address; `slug`
 * is the page a short link points to.
 */
type Resolved = { author: Author; redirect?: string; slug?: string } | null;

async function resolveAuthor(address: Address): Promise<Resolved> {
  if (!supabase) return null;
  if ('code' in address) {
    // A short link shows the page in place, keeping the short address in the bar.
    const target = await resolveShortCode(supabase, address.code);
    if (!target) return null;
    const resolved = await resolveAuthor({ userId: target.userId });
    return resolved && { author: resolved.author, slug: target.slug };
  }
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
  else if (result.data.slug)
    body = <ArticlePage author={result.data.author} slug={result.data.slug} />;
  else if (result.data.redirect) body = <Navigate to={result.data.redirect} replace />;
  else if ('slug' in address && address.slug)
    body = <ArticlePage author={result.data.author} slug={address.slug} />;
  else body = <AuthorPage author={result.data.author} />;
  return (
    <div className="reader">
      {body}
      <footer className="reader-footer">
        <Feather size={13} />
        Written with Notis
      </footer>
    </div>
  );
}

function AuthorPage({ author }: { author: Author }) {
  const { search } = useLocation();
  const allNotes = new URLSearchParams(search).has('notes');
  const result = usePublicData(
    () =>
      supabase
        ? Promise.all([
            listPublishedPages(supabase, author.userId),
            getLanding(supabase, author.userId),
          ])
        : Promise.resolve([[], null] as [PublishedPage[], Landing | null]),
    [author.userId],
  );
  const name =
    author.name ?? (result.status === 'ready' ? result.data[0][0]?.author_name : null) ?? null;
  useEffect(() => {
    document.title = name ?? (author.handle ? `@${author.handle}` : 'Writing');
  }, [name, author.handle]);
  useLandingFont();
  if (result.status !== 'ready') return <Status result={result} />;
  const [pages, landing] = result.data;
  if (allNotes) return <AllNotes author={author} name={name} pages={pages} />;
  return <LandingView author={author} name={name} pages={pages} landing={landing} />;
}

/** The handwritten face of the landing page, loaded only for public visitors. */
function useLandingFont() {
  useEffect(() => {
    const id = 'landing-font';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Kalam:wght@700&family=Patrick+Hand&family=JetBrains+Mono:wght@400&display=swap';
    document.head.appendChild(link);
  }, []);
}

const monthYear = (iso: string) =>
  new Date(iso).toLocaleDateString('en', { month: 'short', year: 'numeric' });

/** Minutes to read at about 200 words a minute. */
const readingMinutes = (html: string) =>
  Math.max(1, Math.round(plainText(html).split(/\s+/).filter(Boolean).length / 200));

interface LandingProps {
  author: Author;
  name: string | null;
  pages: PublishedPage[];
  landing: Landing | null;
}

function LandingView({ author, name, pages, landing }: LandingProps) {
  const content = landing ?? defaultLanding(name);
  // `pages` holds only listed pages, so an unlisted or unpublished project page never gets a link.
  const bySlug = new Map(pages.map((page) => [page.id, page.slug]));
  const projectPages = new Set(
    content.projects.map((project) => project.pageId).filter((id) => id && bySlug.has(id)),
  );
  // Project write-ups have their own spot, so the notes list shows the other writing.
  const notes = pages.filter((page) => !projectPages.has(page.id));
  const shown = landing ? notes.slice(0, content.notesCount) : notes.slice(0, 10);
  const internal = (url: string) => url.startsWith('/');
  return (
    <main className="landing">
      <header className="landing-hero">
        <h1>{content.greeting || name || (author.handle ? `@${author.handle}` : 'Writing')}</h1>
        {content.tagline && <p className="landing-tagline">{content.tagline}</p>}
        {content.links.length > 0 && (
          <div className="landing-links">
            {content.links.map((link, index) =>
              internal(link.url) ? (
                <Link
                  key={index}
                  to={link.url}
                  className={`landing-button ${index === 0 ? 'is-primary' : ''}`}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={index}
                  href={link.url}
                  target={link.url.startsWith('http') ? '_blank' : undefined}
                  rel="noreferrer"
                  className={`landing-button ${index === 0 ? 'is-primary' : ''}`}
                >
                  {link.label}
                </a>
              ),
            )}
          </div>
        )}
      </header>
      {content.helps.length > 0 && (
        <section className="landing-helps" aria-labelledby="landing-helps">
          {content.helpsHeading && <h2 id="landing-helps">{content.helpsHeading}</h2>}
          <ul style={{ '--landing-columns': Math.min(content.helps.length, 3) } as CSSProperties}>
            {content.helps.map((help, index) => (
              <li key={index}>
                <strong>{help.title}</strong>
                {help.subtitle && <span>{help.subtitle}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {content.projects.length > 0 && (
        <section className="landing-section" aria-labelledby="landing-projects">
          {content.projectsHeading && <h2 id="landing-projects">{content.projectsHeading}</h2>}
          <ul className="landing-projects">
            {content.projects.map((project) => {
              const slug = project.pageId ? bySlug.get(project.pageId) : undefined;
              const tag = [project.category, project.year].filter(Boolean).join(' · ');
              const body = (
                <>
                  {project.image ? (
                    <img className="landing-thumb" src={project.image} alt="" />
                  ) : (
                    <span className="landing-thumb" aria-hidden="true" />
                  )}
                  <span className="landing-project-text">
                    <strong>{project.title}</strong>
                    {project.summary && <span>{project.summary}</span>}
                  </span>
                  {tag && <span className="landing-tag">{tag}</span>}
                </>
              );
              return (
                <li key={project.id}>
                  {slug ? (
                    <Link className="landing-project" to={writerPath(author, slug)}>
                      {body}
                    </Link>
                  ) : (
                    <div className="landing-project">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {shown.length > 0 ? (
        <section className="landing-section" aria-labelledby="landing-notes">
          {content.notesHeading && <h2 id="landing-notes">{content.notesHeading}</h2>}
          <ul className="landing-notes">
            {shown.map((page) => (
              <li key={page.id}>
                <Link to={writerPath(author, page.slug)}>
                  <span>{page.title}</span>
                  <time dateTime={page.published_at}>
                    {monthYear(page.published_at)} · {readingMinutes(page.content)} min
                  </time>
                </Link>
              </li>
            ))}
          </ul>
          <Link className="landing-all" to={`${writerPath(author)}?notes`}>
            All notes <ArrowUpRight size={14} />
          </Link>
        </section>
      ) : (
        !content.projects.length && (
          <p className="landing-empty">Nothing has been published here yet.</p>
        )
      )}
    </main>
  );
}

function AllNotes({ author, name, pages }: Omit<LandingProps, 'landing'>) {
  return (
    <main className="reader-column">
      <Link className="reader-back" to={writerPath(author)}>
        <ArrowLeft size={15} />
        {name ? `Back to ${name}` : 'Back'}
      </Link>
      <header className="reader-header">
        <p className="eyebrow">{author.handle ? `@${author.handle}` : 'WRITING'}</p>
        <h1>{name ? `Writing by ${name}` : 'Writing'}</h1>
      </header>
      {pages.length ? (
        <ul className="reader-list">
          {pages.map((page) => (
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
      {/* Unlisted pages are shared by link only, so they don't lead to the public list. */}
      {!page.unlisted && (
        <Link className="reader-back" to={writerPath(author)}>
          <ArrowLeft size={15} />
          {name ? `More from ${name}` : 'More writing'}
        </Link>
      )}
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
