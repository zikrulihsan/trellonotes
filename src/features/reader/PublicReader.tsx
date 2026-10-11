import { useEffect, useState, type CSSProperties } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import {
  ArrowUpRight,
  AtSign,
  Dribbble,
  Facebook,
  Feather,
  Github,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  Music2,
  Twitter,
  Youtube,
  type LucideIcon,
} from 'lucide-react';
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
import {
  defaultLanding,
  getLanding,
  socialPlatform,
  type Landing,
  type SocialPlatform,
} from '@/lib/supabase/landing';
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
  // `?notes` is the older address of the Blog page.
  const params = new URLSearchParams(search);
  const blog = params.has('blog') || params.has('notes');
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
  return (
    <>
      <PublicNav author={author} active={blog ? 'blog' : 'me'} />
      {blog ? (
        <BlogView author={author} name={name} pages={pages} />
      ) : (
        <LandingView author={author} name={name} pages={pages} landing={landing} />
      )}
    </>
  );
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
        <h1>
          <span className="landing-marker">
            {content.greeting || name || (author.handle ? `@${author.handle}` : 'Writing')}
          </span>
          <Sparkle />
        </h1>
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
        {content.socials.length > 0 && (
          <ul className="landing-socials" aria-label="Social links">
            {content.socials.map((url) => {
              const { platform, label } = socialPlatform(url);
              return (
                <li key={url}>
                  <a
                    href={url}
                    target={url.startsWith('http') ? '_blank' : undefined}
                    rel="noreferrer me"
                    aria-label={label}
                    title={label}
                  >
                    <SocialIcon platform={platform} />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </header>
      {content.helps.length > 0 && (
        <section className="landing-helps" aria-labelledby="landing-helps">
          {content.helpsHeading && <h2 id="landing-helps">{content.helpsHeading}</h2>}
          <ul style={{ '--landing-columns': Math.min(content.helps.length, 3) } as CSSProperties}>
            {content.helps.map((help, index) => (
              <li key={index}>
                <span className="landing-help-number" aria-hidden="true">
                  {index + 1}
                </span>
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
                    <span className="landing-thumb" aria-hidden="true">
                      {project.title.replace(/^\W+/, '').charAt(0)}
                    </span>
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
          <PostList author={author} pages={shown} />
          <Link className="landing-all" to={blogPath(author)}>
            See all <ArrowUpRight size={15} />
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

const SOCIAL_ICONS: Record<SocialPlatform, LucideIcon> = {
  github: Github,
  linkedin: Linkedin,
  instagram: Instagram,
  youtube: Youtube,
  x: Twitter,
  facebook: Facebook,
  tiktok: Music2,
  threads: AtSign,
  dribbble: Dribbble,
  email: Mail,
  website: Globe,
};

function SocialIcon({ platform }: { platform: SocialPlatform }) {
  const Icon = SOCIAL_ICONS[platform];
  return <Icon size={17} strokeWidth={1.75} />;
}

/** A hand-drawn sparkle beside the greeting. */
function Sparkle() {
  return (
    <svg className="landing-sparkle" viewBox="0 0 40 40" aria-hidden="true">
      <path d="M20 4c1 8 3 12 12 15-9 2-11 6-12 16-1-10-4-14-12-16 8-3 11-7 12-15z" />
      <path d="M34 2c.4 3 1.2 4.4 4 5-2.8.7-3.6 2-4 5-.4-3-1.3-4.3-4-5 2.7-.6 3.6-2 4-5z" />
    </svg>
  );
}

const blogPath = (author: PublicAuthor) => `${writerPath(author)}?blog`;

/** The two public sections: Me (the landing page with projects) and Blog (every listed page). */
function PublicNav({ author, active }: { author: PublicAuthor; active?: 'me' | 'blog' }) {
  useLandingFont();
  return (
    <nav className="landing-nav" aria-label="Sections">
      <Link to={writerPath(author)} aria-current={active === 'me' ? 'page' : undefined}>
        Me
      </Link>
      <Link to={blogPath(author)} aria-current={active === 'blog' ? 'page' : undefined}>
        Blog
      </Link>
    </nav>
  );
}

/** Published pages as cards: date, reading time, title and the opening words. */
function PostList({ author, pages }: { author: PublicAuthor; pages: PublishedPage[] }) {
  return (
    <ul className="landing-posts">
      {pages.map((page) => {
        const excerpt = plainText(page.content).slice(0, 180);
        return (
          <li key={page.id}>
            <Link to={writerPath(author, page.slug)}>
              <time dateTime={page.published_at}>
                {longDate(page.published_at)} · {readingMinutes(page.content)} min
              </time>
              <h3>{page.title}</h3>
              {excerpt && <p>{excerpt}</p>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function BlogView({ author, name, pages }: Omit<LandingProps, 'landing'>) {
  return (
    <main className="landing landing-blog">
      <header className="landing-blog-header">
        <h1>
          <span className="landing-marker">Blog</span>
        </h1>
        <p className="landing-tagline">
          {name ? `Everything ${name} has written.` : 'Everything written here.'}
        </p>
      </header>
      {pages.length ? (
        <PostList author={author} pages={pages} />
      ) : (
        <p className="landing-empty">Nothing has been published here yet.</p>
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
    <>
      {/* Unlisted pages are shared by link only, so they don't lead to the public list. */}
      {!page.unlisted && <PublicNav author={author} />}
      <main className="reader-column">
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
    </>
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
