import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
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
  defaultBlog,
  defaultLanding,
  getLanding,
  hasAbout,
  normalizeLanding,
  socialPlatform,
  type AboutSectionId,
  type Landing,
  type LandingAbout,
  type LandingBlog,
  type LandingProject,
  type LandingSectionId,
  type LandingTheme,
  type SocialPlatform,
} from '@/lib/supabase/landing';
import { getProfile } from '@/lib/supabase/profiles';
import { domainOwner } from '@/lib/supabase/custom-domains';
import { classifyHost, setSiteHandle } from '@/lib/site-host';
import { readCached, writeCached } from '@/lib/public-cache';
import { writingExtensions } from '@/features/editor/extensions';
import { useLandingFont } from './useLandingFont';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

type Load<T> =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T };

/**
 * Loads public data for the current route; `null` data means not found. With a `name`,
 * the last copy shows at once while a fresh one loads (see public-cache).
 */
function usePublicData<T>(load: () => Promise<T>, deps: unknown[], name?: string): Load<T> {
  const [state, setState] = useState<Load<T> & { key: string }>({ status: 'loading', key: '' });
  const key = JSON.stringify(deps);
  const cacheKey = name && `${name}:${key}`;
  const cached = cacheKey ? readCached<T>(cacheKey) : undefined;
  useEffect(() => {
    let active = true;
    load().then(
      (data) => {
        if (cacheKey) writeCached(cacheKey, data);
        if (active) setState({ status: 'ready', data, key });
      },
      (reason: unknown) => {
        // A copy from earlier beats an error, say while offline.
        if (!active || (cacheKey && readCached(cacheKey))) return;
        setState({
          status: 'error',
          message: reason instanceof Error ? reason.message : 'Could not load this page.',
          key,
        });
      },
    );
    return () => {
      active = false;
    };
    // `key` captures the inputs `load` depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (state.key === key) return state;
  return cached ? { status: 'ready', data: cached.data } : { status: 'loading' };
}

/** The writer's own domain or subdomain, where their pages sit at the root; else the app. */
const SITE = classifyHost(window.location.hostname);

type Address =
  | { handle: string; slug?: string }
  | { userId: string; slug?: string }
  | { code: string }
  | { domain: string; slug?: string };

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
  if (SITE.kind === 'subdomain' && parts.length <= 1)
    return { handle: SITE.handle, slug: parts[0] };
  if (SITE.kind === 'custom' && parts.length <= 1) return { domain: SITE.domain, slug: parts[0] };
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
  if ('domain' in address) {
    const userId = await domainOwner(supabase, address.domain);
    const resolved = userId && (await resolveAuthor({ userId }));
    return resolved ? { author: resolved.author } : null;
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

/** Lets the page that loaded the writer's settings dress the whole reader in their theme. */
const ThemeContext = createContext<(theme: LandingTheme) => void>(() => {});

/** Applies a theme once it is known; `undefined` while the writer's settings load. */
function useReaderTheme(theme: LandingTheme | undefined) {
  const setTheme = useContext(ThemeContext);
  useEffect(() => {
    if (theme) setTheme(theme);
  }, [theme, setTheme]);
}

/** Public pages anyone can open without signing in. */
export function PublicReader() {
  const [theme, setTheme] = useState<LandingTheme>('sketch');
  const { pathname } = useLocation();
  const address = parseAddress(pathname);
  const result = usePublicData(
    () => (address ? resolveAuthor(address) : Promise.resolve(null)),
    [pathname],
    'author',
  );
  let body;
  // On the writer's own domain, links to their pages drop the /@handle prefix.
  if (SITE.kind !== 'app' && result.status === 'ready')
    setSiteHandle(result.data?.author.handle ?? null);
  if (result.status !== 'ready')
    body = (
      <Status
        result={result}
        kind={address && 'slug' in address && address.slug ? 'article' : 'page'}
      />
    );
  else if (!result.data || !address) body = <NotFound />;
  else if (result.data.slug)
    body = <ArticlePage author={result.data.author} slug={result.data.slug} />;
  else if (result.data.redirect) body = <Navigate to={result.data.redirect} replace />;
  else if ('slug' in address && address.slug)
    body = <ArticlePage author={result.data.author} slug={address.slug} />;
  else body = <AuthorPage author={result.data.author} />;
  return (
    <ThemeContext.Provider value={setTheme}>
      <div className="reader" data-landing-theme={theme === 'sketch' ? undefined : theme}>
        {body}
        <footer className="reader-footer">
          <Feather size={13} />
          Written with Notis
        </footer>
      </div>
    </ThemeContext.Provider>
  );
}

function AuthorPage({ author }: { author: Author }) {
  const { search } = useLocation();
  // `?notes` is the older address of the Blog page.
  const params = new URLSearchParams(search);
  const view: Section = params.has('about')
    ? 'about'
    : params.has('blog') || params.has('notes')
      ? 'blog'
      : 'me';
  const result = useSiteData(author, true);
  const name =
    author.name ?? (result.status === 'ready' ? result.data[0][0]?.author_name : null) ?? null;
  useEffect(() => {
    const who = name ?? (author.handle ? `@${author.handle}` : 'Writing');
    document.title = view === 'me' ? who : `${view === 'blog' ? 'Blog' : 'About'} · ${who}`;
  }, [name, author.handle, view]);
  useLandingFont();
  useReaderTheme(result.status === 'ready' ? (result.data[1]?.theme ?? 'sketch') : undefined);
  if (result.status !== 'ready') return <Status result={result} kind="page" />;
  const [pages, landing] = result.data;
  const about = landing && hasAbout(landing.about) ? landing.about : null;
  return (
    <>
      <PublicNav author={author} active={view} showAbout={Boolean(about)} />
      {view === 'about' && about ? (
        <AboutView author={author} name={name} pages={pages} about={about} />
      ) : view === 'blog' ? (
        <BlogView author={author} name={name} pages={pages} blog={landing?.blog} />
      ) : (
        <LandingView author={author} name={name} pages={pages} landing={landing} />
      )}
    </>
  );
}

/** Minutes to read at about 200 words a minute. */
const readingMinutes = (html: string) =>
  Math.max(1, Math.round(plainText(html).split(/\s+/).filter(Boolean).length / 200));

export interface LandingProps {
  author: Author;
  name: string | null;
  pages: PublishedPage[];
  landing: Landing | null;
  /** In the editor's preview, empty sections still show, so moving them shows too. */
  preview?: boolean;
}

/** Stands in for a section with nothing in it yet, in the editor's preview only. */
function Placeholder({ id, heading, note }: { id: string; heading: string; note: string }) {
  return (
    <section data-section={id} className="landing-section landing-placeholder">
      <h2>{heading}</h2>
      <p>{note}</p>
    </section>
  );
}

export function LandingView({ author, name, pages, landing, preview }: LandingProps) {
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
  const layout = content.layout;
  // Each section below the hero, drawn in the design the writer picked; the order comes
  // from the layout too.
  const sections: Record<LandingSectionId, ReactNode> = {
    helps: content.helps.length > 0 && (
      <section
        key="helps"
        data-section="helps"
        className={`landing-helps is-${layout.helps}`}
        aria-labelledby="landing-helps"
      >
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
        <NextArrow />
      </section>
    ),
    working: content.working.length > 0 && (
      <section
        key="working"
        data-section="working"
        className={`landing-section landing-working is-${layout.working}`}
        aria-labelledby="landing-working"
      >
        {content.workingHeading && <h2 id="landing-working">{content.workingHeading}</h2>}
        <ul className="landing-now">
          {content.working.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
        <NextArrow />
      </section>
    ),
    projects: content.projects.length > 0 && (
      <section
        key="projects"
        data-section="projects"
        className={`landing-section landing-work is-${layout.projects}`}
        aria-labelledby="landing-projects"
      >
        {content.projectsHeading && <h2 id="landing-projects">{content.projectsHeading}</h2>}
        <ul className="landing-projects">
          {content.projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              slug={project.pageId ? bySlug.get(project.pageId) : undefined}
              author={author}
            />
          ))}
        </ul>
        <NextArrow />
      </section>
    ),
    notes: shown.length > 0 && (
      <section
        key="notes"
        data-section="notes"
        className={`landing-section landing-writing is-${layout.notes}`}
        aria-labelledby="landing-notes"
      >
        {content.notesHeading && <h2 id="landing-notes">{content.notesHeading}</h2>}
        <PostList author={author} pages={shown} />
        <Link className="landing-all" to={blogPath(author)}>
          See all <ArrowUpRight size={15} />
        </Link>
      </section>
    ),
  };
  const empty: Record<LandingSectionId, [string, string]> = {
    helps: [content.helpsHeading || 'Helps people to', 'Add what you help people with.'],
    working: [
      content.workingHeading || "What you're working on",
      'Pick cards on your boards to show here.',
    ],
    projects: [content.projectsHeading || 'Projects', 'Add a project to show it here.'],
    notes: [content.notesHeading || 'Writing', 'Your published pages show here.'],
  };
  return (
    <main className="landing">
      <header className={`landing-hero is-${layout.hero}`} data-section="hero">
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
        <NextArrow className="landing-scroll-cue" />
      </header>
      {content.layout.order.map(
        (id) =>
          sections[id] ||
          (preview && <Placeholder key={id} id={id} heading={empty[id][0]} note={empty[id][1]} />),
      )}
      {!preview && !shown.length && !content.projects.length && (
        <p className="landing-empty">Nothing has been published here yet.</p>
      )}
    </main>
  );
}

/**
 * On phones, an arrow at the foot of the hero and of each section that scrolls to the next
 * one. The last section's arrow is hidden by CSS, as there is nothing below it.
 */
function NextArrow({ className = 'landing-next' }: { className?: string }) {
  const next = (event: MouseEvent<HTMLButtonElement>) => {
    const target = event.currentTarget.closest('header, section')?.nextElementSibling;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
  };
  return (
    <button type="button" className={className} aria-label="Next section" onClick={next}>
      <svg viewBox="0 0 24 32" width="22" height="30" aria-hidden="true">
        <path
          d="M12 3c-.6 8 .5 16 0 24M5 20c3 3 5 5 7 7 2-2 4-5 7-8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/**
 * A project links to its write-up when it has a listed one, otherwise to its website.
 * Without an image of its own, it shows the website's icon.
 */
function ProjectCard({
  project,
  slug,
  author,
}: {
  project: LandingProject;
  slug?: string;
  author: PublicAuthor;
}) {
  const icon = useSiteIcon(project.image ? '' : project.url);
  const image = project.image || icon;
  const [broken, setBroken] = useState('');
  const tag = [project.category, project.year].filter(Boolean).join(' · ');
  const body = (
    <>
      {image && broken !== image ? (
        <img
          className={project.image ? 'landing-thumb' : 'landing-thumb is-icon'}
          src={image}
          alt=""
          loading="lazy"
          onError={() => setBroken(image)}
        />
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
      {(slug || project.url) && <ArrowUpRight className="landing-project-go" size={18} />}
    </>
  );
  return (
    <li>
      {slug ? (
        <Link className="landing-project" to={writerPath(author, slug)}>
          {body}
        </Link>
      ) : project.url ? (
        <a className="landing-project" href={project.url} target="_blank" rel="noreferrer">
          {body}
        </a>
      ) : (
        <div className="landing-project is-static">{body}</div>
      )}
    </li>
  );
}

/** The site's /favicon.ico, used until (or unless) the link-image function finds better. */
function faviconOf(url: string) {
  try {
    return new URL('/favicon.ico', url.replace(/^http:/i, 'https:')).href;
  } catch {
    return null;
  }
}

/** A website's icon, found by the link-image edge function and remembered. */
function useSiteIcon(url: string) {
  const key = `site-icon:${url}`;
  const [found, setFound] = useState<{ url: string; image: string | null }>();
  useEffect(() => {
    if (!url || readCached(key)) return;
    let active = true;
    fetch(`/api/link-image?url=${encodeURIComponent(url)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { image?: unknown } | null) => {
        // Only remember real answers, so a failed lookup is retried on the next visit.
        if (typeof body?.image !== 'string') return;
        writeCached(key, body.image);
        if (active) setFound({ url, image: body.image });
      })
      .catch(() => {
        /* The plain /favicon.ico stays. */
      });
    return () => {
      active = false;
    };
  }, [url, key]);
  if (!url) return null;
  if (found?.url === url) return found.image;
  return readCached<string | null>(key)?.data ?? faviconOf(url);
}

/** X's own mark; lucide only has the old Twitter bird. Sized like the lucide icons. */
function XLogo({ size = 24 }: { size?: number | string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.75 3h3.07l-6.71 7.67L22 21h-6.18l-4.84-6.33L5.44 21H2.37l7.18-8.2L2 3h6.34l4.37 5.78L17.75 3Zm-1.08 16.17h1.7L7.4 4.73H5.58l11.09 14.44Z" />
    </svg>
  );
}

const SOCIAL_ICONS: Record<SocialPlatform, LucideIcon | typeof XLogo> = {
  github: Github,
  linkedin: Linkedin,
  instagram: Instagram,
  youtube: Youtube,
  x: XLogo,
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

export type Section = 'me' | 'blog' | 'about';

const blogPath = (author: PublicAuthor) => `${writerPath(author)}?blog`;

/** The two public sections: Me (the landing page with projects) and Blog (every listed page). */
export function PublicNav({
  author,
  active,
  showAbout,
}: {
  author: PublicAuthor;
  active?: Section;
  showAbout: boolean;
}) {
  useLandingFont();
  const current = (section: Section) => (active === section ? 'page' : undefined);
  return (
    <nav className="landing-nav" aria-label="Sections">
      <Link to={writerPath(author)} aria-current={current('me')}>
        Me
      </Link>
      <Link to={blogPath(author)} aria-current={current('blog')}>
        Blog
      </Link>
      {showAbout && (
        <Link to={`${writerPath(author)}?about`} aria-current={current('about')}>
          About
        </Link>
      )}
    </nav>
  );
}

/** The writer's listed pages and landing page, for the menu and "Keep reading" on an article. */
/**
 * The writer's listed pages and landing page. The landing page is normalized again on the
 * way out: a copy this browser kept from an older version may lack fields added since.
 */
function useSiteData(
  author: PublicAuthor,
  enabled: boolean,
): Load<[PublishedPage[], Landing | null]> {
  const result = usePublicData(
    () =>
      supabase && enabled
        ? Promise.all([
            listPublishedPages(supabase, author.userId),
            getLanding(supabase, author.userId),
          ])
        : Promise.resolve([[], null] as [PublishedPage[], Landing | null]),
    [author.userId, enabled],
    'site',
  );
  const data = result.status === 'ready' ? result.data : null;
  const site = useMemo(
    () =>
      data &&
      ([data[0], data[1] && normalizeLanding(data[1])] as [PublishedPage[], Landing | null]),
    [data],
  );
  return site
    ? { status: 'ready', data: site }
    : (result as Load<[PublishedPage[], Landing | null]>);
}

function useAuthorSite(author: PublicAuthor, enabled: boolean) {
  const result = useSiteData(author, enabled);
  return result.status === 'ready' ? result.data : null;
}

/**
 * The About page: a short byline, then the writer's story told at reading width, and the
 * sections the writer put below it (what they hold onto, what they are up to now, story
 * pages and experience) in their order and designs.
 */
function AboutView({
  author,
  name,
  pages,
  about,
  preview,
}: Omit<LandingProps, 'landing'> & { about: LandingAbout }) {
  // Only listed pages are linked, like projects on Me.
  const bySlug = new Map(pages.map((page) => [page.id, page]));
  const blocks = about.intro
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  const stories = about.stories
    .map((story) => ({ ...story, page: story.pageId ? bySlug.get(story.pageId) : undefined }))
    .filter((story) => story.page);
  const layout = about.layout;
  const sections: Record<AboutSectionId, ReactNode> = {
    values: about.stack.length > 0 && (
      <section
        key="values"
        data-section="values"
        className="landing-section"
        aria-labelledby="about-values"
      >
        {about.stackHeading && <h2 id="about-values">{about.stackHeading}</h2>}
        <ol className={`landing-values is-${layout.values}`}>
          {about.stack.map((value, index) => (
            <li key={index}>{value}</li>
          ))}
        </ol>
      </section>
    ),
    now: about.now.length > 0 && (
      <section
        key="now"
        data-section="now"
        className={`landing-section landing-working is-${layout.now}`}
        aria-labelledby="about-now"
      >
        {about.nowHeading && <h2 id="about-now">{about.nowHeading}</h2>}
        <ul className="landing-now">
          {about.now.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </section>
    ),
    stories: stories.length > 0 && (
      <section
        key="stories"
        data-section="stories"
        className="landing-section"
        aria-labelledby="about-stories"
      >
        {about.storiesHeading && <h2 id="about-stories">{about.storiesHeading}</h2>}
        <ul className={`landing-stories is-${layout.stories}`}>
          {stories.map(({ id, label, page }) => (
            <li key={id}>
              <Link to={writerPath(author, page!.slug)}>
                {label && <span className="landing-story-label">{label}</span>}
                <strong>{page!.title}</strong>
                <span className="landing-story-meta">{readingMinutes(page!.content)} min read</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    ),
    experience: about.experiences.length > 0 && (
      <section
        key="experience"
        data-section="experience"
        className="landing-section"
        aria-labelledby="about-experience"
      >
        <h2 id="about-experience">Experience</h2>
        <ol className={`landing-timeline is-${layout.experience}`}>
          {about.experiences.map((job) => (
            <li key={job.id}>
              {job.period && <span className="landing-timeline-period">{job.period}</span>}
              <h3>{job.title}</h3>
              {(job.company || job.location) && (
                <p className="landing-timeline-where">
                  {job.company &&
                    (job.companyUrl ? (
                      <a href={job.companyUrl} target="_blank" rel="noreferrer">
                        {job.company}
                      </a>
                    ) : (
                      <span>{job.company}</span>
                    ))}
                  {job.company && job.location && ' · '}
                  {job.location}
                </p>
              )}
              {job.description && <p>{job.description}</p>}
              {job.highlights.length > 0 && (
                <ul>
                  {job.highlights.map((highlight, index) => (
                    <li key={index}>{highlight}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </section>
    ),
  };
  const empty: Record<AboutSectionId, [string, string]> = {
    values: [about.stackHeading || 'What you hold onto', 'Add principles or values, one per line.'],
    now: [about.nowHeading || "What you're up to now", 'Add what you are up to, one per line.'],
    stories: [
      about.storiesHeading || 'Your story in writing',
      'Pick published pages that tell your story.',
    ],
    experience: ['Experience', 'Add the places you have worked.'],
  };
  return (
    <main className="landing landing-about">
      <header className={`landing-blog-header is-${layout.header}`} data-section="header">
        <h1>
          <span className="landing-marker">About</span>
        </h1>
        {about.subtitle && <p className="landing-tagline">{about.subtitle}</p>}
      </header>
      {(blocks.length > 0 || about.photo || name || about.role || preview) && (
        <article className="landing-story" data-section="story">
          {(about.photo || name || about.role) && (
            <div className="landing-byline">
              {about.photo && <img src={about.photo} alt={name ?? ''} />}
              <div>
                {name && <p className="landing-byline-name">{name}</p>}
                {about.role && <p className="landing-byline-role">{about.role}</p>}
              </div>
            </div>
          )}
          {/* A block starting with "## " is a heading that breaks a long story into parts. */}
          {blocks.map((block, index) =>
            block.startsWith('## ') ? (
              <h2 key={index}>{block.slice(3).trim()}</h2>
            ) : (
              <p key={index}>{block}</p>
            ),
          )}
          {preview && !blocks.length && (
            <p className="landing-placeholder-note">Your story shows here.</p>
          )}
        </article>
      )}
      {layout.order.map(
        (id) =>
          sections[id] ||
          (preview && <Placeholder key={id} id={id} heading={empty[id][0]} note={empty[id][1]} />),
      )}
    </main>
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

const SAMPLE_POSTS: PublishedPage[] = [1, 2, 3].map((n) => ({
  id: `sample-${n}`,
  slug: `sample-${n}`,
  title: `Example post ${n}`,
  content: '<p>Your published pages show here, newest first, with their opening words.</p>',
  author_name: null,
  published_at: new Date(2026, 0, n).toISOString(),
  updated_at: new Date(2026, 0, n).toISOString(),
}));

function BlogView({
  author,
  name,
  pages,
  blog = defaultBlog(),
  preview,
}: Omit<LandingProps, 'landing'> & { blog?: LandingBlog }) {
  // Before anything is published, the preview lists examples so the chosen design shows.
  const listed = pages.length || !preview ? pages : SAMPLE_POSTS;
  return (
    <main className="landing landing-blog">
      <header className={`landing-blog-header is-${blog.layout.header}`} data-section="header">
        <h1>
          <span className="landing-marker">{blog.heading || 'Blog'}</span>
        </h1>
        <p className="landing-tagline">
          {blog.intro || (name ? `Everything ${name} has written.` : 'Everything written here.')}
        </p>
      </header>
      {listed.length ? (
        <div className={`landing-writing is-${blog.layout.posts}`} data-section="posts">
          <PostList author={author} pages={listed} />
        </div>
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
    'page',
  );
  const page = result.status === 'ready' ? result.data : null;
  // Unlisted pages are shared by link only, so they don't lead to the public list.
  const listed = Boolean(page && !page.unlisted);
  const site = useAuthorSite(author, listed);
  useReaderTheme(site ? (site[1]?.theme ?? 'sketch') : undefined);
  useEffect(() => {
    if (page) document.title = page.title;
  }, [page]);
  if (result.status !== 'ready') return <Status result={result} kind="article" />;
  if (!page) return <NotFound />;
  const name = author.name ?? page.author_name;
  return (
    <>
      {listed && (
        <PublicNav author={author} showAbout={Boolean(site?.[1] && hasAbout(site[1].about))} />
      )}
      <main className="reader-column">
        <article>
          <header className="reader-header">
            {listed && (
              <Link className="reader-back" to={blogPath(author)} aria-label="Back to Blog">
                <ArrowLeft size={14} />
                Blog
              </Link>
            )}
            <h1>{page.title}</h1>
            <p className="reader-byline">
              {name && <span>{name} · </span>}
              <time dateTime={page.published_at}>{longDate(page.published_at)}</time>
              <span> · {readingMinutes(page.content)} min read</span>
            </p>
          </header>
          <ReadOnlyContent html={page.content} />
        </article>
        {listed && site && (
          <KeepReading
            author={author}
            pages={site[0].filter((other) => other.slug !== page.slug).slice(0, 2)}
          />
        )}
      </main>
    </>
  );
}

/** More listed pages after an article, so a reader has somewhere to go next. */
function KeepReading({ author, pages }: { author: PublicAuthor; pages: PublishedPage[] }) {
  if (!pages.length) return null;
  return (
    <section className="landing landing-more" aria-labelledby="landing-more">
      <div className="landing-section">
        <h2 id="landing-more">Keep reading</h2>
        <PostList author={author} pages={pages} />
        <Link className="landing-all" to={blogPath(author)}>
          See all <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
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

function Status({ result, kind }: { result: Load<unknown>; kind: 'page' | 'article' }) {
  if (result.status === 'error')
    return (
      <main className="reader-column reader-status" role="status">
        {result.message}
      </main>
    );
  return <Skeleton kind={kind} />;
}

/** A sketch of the page that is on its way, in place of a bare "Loading…". */
function Skeleton({ kind }: { kind: 'page' | 'article' }) {
  useLandingFont();
  return (
    <div className="landing-skeleton" role="status" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="skeleton-nav">
        <span className="skeleton" />
        <span className="skeleton" />
        <span className="skeleton" />
      </div>
      {kind === 'page' ? (
        <div className="skeleton-page">
          <span className="skeleton skeleton-title" />
          <span className="skeleton skeleton-line" />
          <div className="skeleton-buttons">
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
          {[0, 1, 2].map((index) => (
            <span key={index} className="skeleton skeleton-card" />
          ))}
        </div>
      ) : (
        <div className="skeleton-article">
          <span className="skeleton skeleton-heading" />
          <span className="skeleton skeleton-byline" />
          {[100, 96, 92, 98, 60].map((width, index) => (
            <span key={index} className="skeleton skeleton-text" style={{ width: `${width}%` }} />
          ))}
        </div>
      )}
    </div>
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

/** Messages between the Public page screen and its preview frame. */
const PREVIEW_UPDATE = 'notis:landing-preview';
const PREVIEW_READY = 'notis:landing-preview-ready';

/** What the Public page screen sends its preview: the draft, which page to draw, and what changed. */
export interface PreviewMessage {
  landing: Landing;
  author: Author;
  view: Section;
  /** The section the writer just moved or restyled, brought into view; `focusKey` counts changes. */
  focus?: string;
  focusKey?: number;
}

/**
 * The live preview shown beside the Public page form (/landing-preview, in a frame). It
 * draws the Me, Blog or About page from the unsaved draft its parent window sends, so the
 * frame's own width decides the phone, tablet or desktop layout. Links are inert.
 */
export function LandingPreview() {
  const [draft, setDraft] = useState<PreviewMessage | null>(null);
  const [pages, setPages] = useState<PublishedPage[]>([]);
  useLandingFont();
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const data = event.data as { type?: string } & Partial<PreviewMessage>;
      if (data?.type !== PREVIEW_UPDATE || !data.author) return;
      setDraft({
        landing: normalizeLanding(data.landing) ?? defaultLanding(data.author.name),
        author: data.author,
        view: data.view === 'blog' || data.view === 'about' ? data.view : 'me',
        focus: data.focus,
        focusKey: data.focusKey,
      });
    };
    window.addEventListener('message', receive);
    window.parent.postMessage({ type: PREVIEW_READY }, window.location.origin);
    return () => window.removeEventListener('message', receive);
  }, []);
  const userId = draft?.author.userId;
  useEffect(() => {
    if (!supabase || !userId) return;
    listPublishedPages(supabase, userId).then(setPages, () => {
      /* The preview just shows no writing. */
    });
  }, [userId]);
  // Moving or restyling a section scrolls the frame to it and marks it for a moment, so
  // the change shows even when it happens below the part of the page in view.
  const focus = draft?.focus;
  const focusKey = draft?.focusKey;
  useEffect(() => {
    if (!focus || !focusKey) return;
    const target = document.querySelector<HTMLElement>(`[data-section="${focus}"]`);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
    target.classList.remove('is-flash');
    void target.offsetWidth;
    target.classList.add('is-flash');
  }, [focus, focusKey]);
  if (!draft) return null;
  const { landing, author, view } = draft;
  return (
    <div
      className="reader landing-preview"
      data-landing-theme={landing.theme === 'sketch' ? undefined : landing.theme}
      onClickCapture={(event) => {
        if ((event.target as Element).closest('a, button')) event.preventDefault();
      }}
    >
      <PublicNav
        author={author}
        active={view}
        showAbout={view === 'about' || hasAbout(landing.about)}
      />
      {view === 'about' ? (
        <AboutView author={author} name={author.name} pages={pages} about={landing.about} preview />
      ) : view === 'blog' ? (
        <BlogView author={author} name={author.name} pages={pages} blog={landing.blog} preview />
      ) : (
        <LandingView author={author} name={author.name} pages={pages} landing={landing} preview />
      )}
    </div>
  );
}
