import type { SupabaseClient } from '@supabase/supabase-js';

const TABLE = 'trellonotes_profiles';

export interface LandingLink {
  label: string;
  url: string;
}

export interface LandingHelp {
  title: string;
  subtitle: string;
}

export interface LandingProject {
  id: string;
  title: string;
  summary: string;
  category: string;
  year: string;
  /** An https image shown beside the title; empty for the placeholder. */
  image: string;
  /** The published page that tells the project's story, if any. */
  pageId: string | null;
  /** A web link for projects without a write-up; its preview image stands in for `image`. */
  url: string;
}

export interface LandingExperience {
  id: string;
  /** e.g. "Jan 2024 – Present" */
  period: string;
  title: string;
  company: string;
  companyUrl: string;
  location: string;
  description: string;
  highlights: string[];
}

/** A published page that tells part of the writer's story, e.g. a yearly retrospective. */
export interface LandingStory {
  id: string;
  label: string;
  pageId: string | null;
}

/** The About page (/@handle?about). */
export interface LandingAbout {
  subtitle: string;
  /** An https photo of the writer; empty for none. */
  photo: string;
  role: string;
  /** Paragraphs separated by blank lines. */
  intro: string;
  /** What the writer holds onto: principles and values, one sentence each. */
  stack: string[];
  stackHeading: string;
  nowHeading: string;
  now: string[];
  storiesHeading: string;
  stories: LandingStory[];
  experiences: LandingExperience[];
  layout: AboutLayout;
}

/** How the public page looks; the writer picks one, since tastes differ. */
export const LANDING_THEMES = [
  { id: 'sketch', label: 'Sketchbook', description: 'Handwriting on dotted paper' },
  { id: 'clean', label: 'Clean', description: 'Plain white and simple type' },
  { id: 'editorial', label: 'Editorial', description: 'Warm paper and a serif face' },
  { id: 'midnight', label: 'Midnight', description: 'Dark, with light text' },
] as const;
export type LandingTheme = (typeof LANDING_THEMES)[number]['id'];
const isTheme = (value: unknown): value is LandingTheme =>
  LANDING_THEMES.some((theme) => theme.id === value);

/** The Me page's sections below the hero, in the writer's order. */
export const LANDING_SECTIONS = [
  { id: 'helps', label: 'Helps people to' },
  { id: 'working', label: "What you're working on" },
  { id: 'projects', label: 'Projects' },
  { id: 'notes', label: 'Writing' },
] as const;
export type LandingSectionId = (typeof LANDING_SECTIONS)[number]['id'];

const HEADER_LAYOUTS = [
  { id: 'center', label: 'Centered' },
  { id: 'left', label: 'Left-aligned' },
  { id: 'banner', label: 'Banner' },
] as const;

/** The designs each part of the Me page can take; the first is the default. */
export const SECTION_LAYOUTS = {
  hero: HEADER_LAYOUTS,
  helps: [
    { id: 'columns', label: 'Columns' },
    { id: 'cards', label: 'Cards' },
    { id: 'list', label: 'Numbered list' },
  ],
  working: [
    { id: 'list', label: 'List' },
    { id: 'chips', label: 'Tags' },
    { id: 'cards', label: 'Cards' },
  ],
  projects: [
    { id: 'list', label: 'Rows' },
    { id: 'grid', label: 'Grid' },
    { id: 'compact', label: 'Compact' },
  ],
  notes: [
    { id: 'cards', label: 'Cards' },
    { id: 'compact', label: 'Titles only' },
    { id: 'grid', label: 'Grid' },
  ],
} as const;
type LayoutPart = keyof typeof SECTION_LAYOUTS;
export type LandingLayout = { order: LandingSectionId[] } & {
  [K in LayoutPart]: (typeof SECTION_LAYOUTS)[K][number]['id'];
};

/** The About page's sections below the story, in the writer's order. */
export const ABOUT_SECTIONS = [
  { id: 'values', label: 'What you hold onto' },
  { id: 'now', label: "What you're up to now" },
  { id: 'stories', label: 'Your story in writing' },
  { id: 'experience', label: 'Experience' },
] as const;
export type AboutSectionId = (typeof ABOUT_SECTIONS)[number]['id'];

/** The designs each part of the About page can take; the first is the default. */
export const ABOUT_LAYOUTS = {
  header: HEADER_LAYOUTS,
  values: [
    { id: 'cards', label: 'Cards' },
    { id: 'list', label: 'Numbered list' },
  ],
  now: [
    { id: 'list', label: 'List' },
    { id: 'chips', label: 'Tags' },
    { id: 'cards', label: 'Cards' },
  ],
  stories: [
    { id: 'cards', label: 'Cards' },
    { id: 'list', label: 'List' },
  ],
  experience: [
    { id: 'timeline', label: 'Timeline' },
    { id: 'cards', label: 'Cards' },
  ],
} as const;
export type AboutLayout = { order: AboutSectionId[] } & {
  [K in keyof typeof ABOUT_LAYOUTS]: (typeof ABOUT_LAYOUTS)[K][number]['id'];
};

/** The designs the Blog page can take; the first is the default. */
export const BLOG_LAYOUTS = {
  header: HEADER_LAYOUTS,
  posts: [
    { id: 'cards', label: 'Cards' },
    { id: 'compact', label: 'Titles only' },
    { id: 'grid', label: 'Grid' },
  ],
} as const;
export type BlogLayout = {
  [K in keyof typeof BLOG_LAYOUTS]: (typeof BLOG_LAYOUTS)[K][number]['id'];
};

/** The Blog page (/@handle?blog): every listed page under a heading of the writer's. */
export interface LandingBlog {
  heading: string;
  /** Empty for the default line, "Everything <name> has written." */
  intro: string;
  layout: BlogLayout;
}

export const defaultLayout = (): LandingLayout => ({
  order: LANDING_SECTIONS.map((section) => section.id),
  hero: 'center',
  helps: 'columns',
  working: 'list',
  projects: 'list',
  notes: 'cards',
});

export const defaultAboutLayout = (): AboutLayout => ({
  order: ABOUT_SECTIONS.map((section) => section.id),
  header: 'center',
  values: 'cards',
  now: 'list',
  stories: 'cards',
  experience: 'timeline',
});

export const defaultBlog = (): LandingBlog => ({
  heading: 'Blog',
  intro: '',
  layout: { header: 'center', posts: 'cards' },
});

const record = (value: unknown) =>
  (typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {}) as Record<
    string,
    unknown
  >;

/** Each part's design from `raw` when it is one of the part's options, else the fallback's. */
function pickDesigns<T extends object>(
  raw: Record<string, unknown>,
  options: { [K in keyof T]?: readonly { id: string }[] },
  fallback: T,
): T {
  const picked = { ...fallback };
  for (const [part, choices] of Object.entries(options) as [keyof T, readonly { id: string }[]][])
    if (choices.some((option) => option.id === raw[part as string]))
      picked[part] = raw[part as string] as T[keyof T];
  return picked;
}

/** Every known section once: the saved order first, then any the saved order lacks. */
function normalizeOrder<T extends string>(value: unknown, known: readonly T[]): T[] {
  const order = (Array.isArray(value) ? value : []).filter(
    (id, index, all): id is T => known.includes(id as T) && all.indexOf(id) === index,
  );
  for (const id of known) if (!order.includes(id)) order.push(id);
  return order;
}

/** A layout read from storage: every section once, in a known order, with known designs. */
function normalizeLayout(value: unknown): LandingLayout {
  const raw = record(value);
  const fallback = defaultLayout();
  return {
    ...pickDesigns(raw, SECTION_LAYOUTS, fallback),
    order: normalizeOrder(raw.order, fallback.order),
  };
}

function normalizeAboutLayout(value: unknown): AboutLayout {
  const raw = record(value);
  const fallback = defaultAboutLayout();
  return {
    ...pickDesigns(raw, ABOUT_LAYOUTS, fallback),
    order: normalizeOrder(raw.order, fallback.order),
  };
}

function normalizeBlog(value: unknown): LandingBlog {
  const raw = record(value);
  const fallback = defaultBlog();
  return {
    heading: typeof raw.heading === 'string' ? text(raw.heading, 80) : fallback.heading,
    intro: text(raw.intro, 200),
    layout: pickDesigns(record(raw.layout), BLOG_LAYOUTS, fallback.layout),
  };
}

/** What the writer's public page (/@handle) shows above and around their notes. */
export interface Landing {
  theme: LandingTheme;
  layout: LandingLayout;
  greeting: string;
  tagline: string;
  links: LandingLink[];
  /** Social profile links shown as icons under the hero buttons. */
  socials: string[];
  helpsHeading: string;
  helps: LandingHelp[];
  projectsHeading: string;
  projects: LandingProject[];
  notesHeading: string;
  notesCount: number;
  /** Titles of the board cards the writer is working on, kept in step by the app. */
  working: string[];
  workingHeading: string;
  about: LandingAbout;
  blog: LandingBlog;
}

/** True when the About page has something to show, so the menu can leave it out otherwise. */
export const hasAbout = (about: LandingAbout) =>
  Boolean(
    about.intro ||
    about.photo ||
    about.role ||
    about.stack.length ||
    about.now.length ||
    about.stories.length ||
    about.experiences.length,
  );

/** The About story can run long; it is most of the page. */
export const ABOUT_INTRO_MAX = 8000;

export const LANDING_LIMITS = {
  links: 4,
  socials: 8,
  helps: 6,
  projects: 12,
  notes: 20,
  stack: 8,
  now: 8,
  stories: 8,
  experiences: 8,
  highlights: 5,
  working: 8,
} as const;

export const defaultAbout = (): LandingAbout => ({
  subtitle: 'A story of growth and discovery',
  photo: '',
  role: '',
  intro: '',
  stack: [],
  stackHeading: 'What I hold onto',
  nowHeading: "What I'm up to now",
  now: [],
  storiesHeading: 'Learn about my growth',
  stories: [],
  experiences: [],
  layout: defaultAboutLayout(),
});

export function defaultLanding(name: string | null): Landing {
  const first = name?.trim().split(/\s+/)[0];
  return {
    theme: 'sketch',
    layout: defaultLayout(),
    greeting: first ? `Hi, ${first} Here` : 'Hi, welcome',
    tagline: '',
    links: [],
    socials: [],
    helpsHeading: 'Helps People to:',
    helps: [],
    projectsHeading: 'Curious on what i did?',
    projects: [],
    notesHeading: 'Want to know what i think of?',
    notesCount: 5,
    working: [],
    workingHeading: "What I'm working on",
    about: defaultAbout(),
    blog: defaultBlog(),
  };
}

/**
 * Turns what a writer typed into a link: "cv.example.com" → "https://cv.example.com",
 * "me@example.com" → "mailto:me@example.com". Paths on this site ("/s/cv") stay as
 * they are. Returns "" for anything that isn't a web, mail or phone link.
 */
export function toLinkUrl(text: string): string {
  const value = text.trim();
  if (!value) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return value;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  if (/^[^\s@/:]+@[^\s@/:]+\.[^\s@/:]+$/.test(value)) return `mailto:${value}`;
  if (/^\+?[\d\s-]{6,}$/.test(value)) return `tel:${value.replace(/[\s-]/g, '')}`;
  if (/^[^\s/:]+\.[a-z]{2,}(\/\S*)?$/i.test(value)) return `https://${value}`;
  return '';
}

export type SocialPlatform =
  | 'github'
  | 'linkedin'
  | 'instagram'
  | 'youtube'
  | 'x'
  | 'facebook'
  | 'tiktok'
  | 'threads'
  | 'dribbble'
  | 'email'
  | 'website';

const PLATFORMS: [SocialPlatform, string, RegExp][] = [
  ['github', 'GitHub', /(^|\.)github\.com$/],
  ['linkedin', 'LinkedIn', /(^|\.)linkedin\.com$/],
  ['instagram', 'Instagram', /(^|\.)instagram\.com$/],
  ['youtube', 'YouTube', /(^|\.)(youtube\.com|youtu\.be)$/],
  ['x', 'X', /(^|\.)(x|twitter)\.com$/],
  ['facebook', 'Facebook', /(^|\.)(facebook\.com|fb\.com)$/],
  ['tiktok', 'TikTok', /(^|\.)tiktok\.com$/],
  ['threads', 'Threads', /(^|\.)threads\.(net|com)$/],
  ['dribbble', 'Dribbble', /(^|\.)dribbble\.com$/],
];

/** Which network a social link points to, for its icon and label: "github.com/x" → GitHub. */
export function socialPlatform(url: string): { platform: SocialPlatform; label: string } {
  if (/^mailto:/i.test(url)) return { platform: 'email', label: 'Email' };
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    /* Not a full address: shown as a website. */
  }
  const match = PLATFORMS.find(([, , pattern]) => pattern.test(host));
  return match
    ? { platform: match[0], label: match[1] }
    : { platform: 'website', label: host.replace(/^www\./, '') || 'Website' };
}

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

/** Trimmed, non-empty strings from a list, each cut to `max` characters. */
const strings = (value: unknown, count: number, max: number) =>
  (Array.isArray(value) ? value : [])
    .map((item) => text(item, max))
    .filter(Boolean)
    .slice(0, count);

const httpsImage = (value: unknown) => {
  const image = text(value, 500);
  return /^https:\/\//i.test(image) ? image : '';
};

function normalizeAbout(value: unknown): LandingAbout {
  const raw = record(value);
  const fallback = defaultAbout();
  const heading = (key: string, fallbackText: string) =>
    typeof raw[key] === 'string' ? text(raw[key], 80) : fallbackText;
  return {
    subtitle: heading('subtitle', fallback.subtitle),
    photo: httpsImage(raw.photo),
    role: text(raw.role, 120),
    intro: typeof raw.intro === 'string' ? raw.intro.trim().slice(0, ABOUT_INTRO_MAX) : '',
    stack: strings(raw.stack, LANDING_LIMITS.stack, 200),
    stackHeading: heading('stackHeading', fallback.stackHeading),
    nowHeading: heading('nowHeading', fallback.nowHeading),
    now: strings(raw.now, LANDING_LIMITS.now, 160),
    storiesHeading: heading('storiesHeading', fallback.storiesHeading),
    stories: list(raw.stories, LANDING_LIMITS.stories, (story) => {
      const label = text(story.label, 40);
      const pageId = text(story.pageId, 80);
      return label || pageId
        ? { id: text(story.id, 80) || crypto.randomUUID(), label, pageId: pageId || null }
        : null;
    }),
    experiences: list(raw.experiences, LANDING_LIMITS.experiences, (job) => {
      const title = text(job.title, 100);
      if (!title) return null;
      const companyUrl = toLinkUrl(text(job.companyUrl, 500));
      return {
        id: text(job.id, 80) || crypto.randomUUID(),
        period: text(job.period, 40),
        title,
        company: text(job.company, 80),
        companyUrl: /^https?:\/\//i.test(companyUrl) ? companyUrl : '',
        location: text(job.location, 60),
        description: text(job.description, 500),
        highlights: strings(job.highlights, LANDING_LIMITS.highlights, 160),
      };
    }),
    layout: normalizeAboutLayout(raw.layout),
  };
}

const list = <T>(value: unknown, max: number, item: (raw: Record<string, unknown>) => T | null) =>
  (Array.isArray(value) ? value : [])
    .filter((raw): raw is Record<string, unknown> => typeof raw === 'object' && raw !== null)
    .map(item)
    .filter((entry): entry is T => entry !== null)
    .slice(0, max);

/**
 * Checks a landing page read from the database or about to be saved: trims text,
 * drops empty entries and links that aren't web, mail or phone links, and caps
 * list lengths. Returns null for anything that isn't a landing page.
 */
/** A web address (completing a bare domain), or empty for anything else. */
function webLink(value: unknown) {
  const url = toLinkUrl(text(value, 500));
  return /^https?:\/\//i.test(url) ? url : '';
}

export function normalizeLanding(value: unknown): Landing | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const fallback = defaultLanding(null);
  const count = Number(raw.notesCount);
  return {
    theme: isTheme(raw.theme) ? raw.theme : 'sketch',
    layout: normalizeLayout(raw.layout),
    greeting: text(raw.greeting, 80),
    tagline: text(raw.tagline, 160),
    links: list(raw.links, LANDING_LIMITS.links, (link) => {
      const label = text(link.label, 30),
        url = toLinkUrl(text(link.url, 500));
      return label && url ? { label, url } : null;
    }),
    socials: (Array.isArray(raw.socials) ? raw.socials : [])
      .map((url) => toLinkUrl(text(url, 500)))
      .filter((url) => /^(https?:\/\/|mailto:)/i.test(url))
      .slice(0, LANDING_LIMITS.socials),
    helpsHeading: text(raw.helpsHeading, 80),
    helps: list(raw.helps, LANDING_LIMITS.helps, (help) => {
      const title = text(help.title, 80);
      return title ? { title, subtitle: text(help.subtitle, 120) } : null;
    }),
    projectsHeading: text(raw.projectsHeading, 80),
    projects: list(raw.projects, LANDING_LIMITS.projects, (project) => {
      const title = text(project.title, 100);
      if (!title) return null;
      const image = httpsImage(project.image);
      const pageId = text(project.pageId, 80);
      return {
        id: text(project.id, 80) || crypto.randomUUID(),
        title,
        summary: text(project.summary, 140),
        category: text(project.category, 30),
        year: text(project.year, 12),
        image,
        pageId: pageId || null,
        url: webLink(project.url),
      };
    }),
    notesHeading: text(raw.notesHeading, 80),
    notesCount: Number.isInteger(count)
      ? Math.min(Math.max(count, 1), LANDING_LIMITS.notes)
      : fallback.notesCount,
    working: strings(raw.working, LANDING_LIMITS.working, 120),
    workingHeading:
      typeof raw.workingHeading === 'string'
        ? text(raw.workingHeading, 80)
        : fallback.workingHeading,
    about: normalizeAbout(raw.about),
    blog: normalizeBlog(raw.blog),
  };
}

/** True when the database predates landing pages (the `landing` column is missing). */
const lacksLanding = (error: { code?: string; message: string }) =>
  (error.code === 'PGRST204' || error.code === '42703') && error.message.includes('landing');

/** The writer's landing page, or null when they haven't set one up (or the database can't hold one yet). */
export async function getLanding(client: SupabaseClient, userId: string): Promise<Landing | null> {
  const { data, error } = await client
    .from(TABLE)
    .select('landing')
    .eq('user_id', userId)
    .maybeSingle<{ landing: unknown }>();
  if (error) {
    if (lacksLanding(error) || error.code === 'PGRST205' || error.code === '42P01') return null;
    throw new Error(error.message);
  }
  return normalizeLanding(data?.landing);
}

/** Saves the landing page on the writer's profile, which must already exist (it holds the handle). */
export async function saveLanding(
  client: SupabaseClient,
  userId: string,
  landing: Landing,
): Promise<Landing> {
  const clean = normalizeLanding(landing)!;
  const { data, error } = await client
    .from(TABLE)
    .update({ landing: clean, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('user_id');
  if (error && lacksLanding(error))
    throw new Error('Landing pages are not set up yet: the database needs its latest update.');
  if (error) throw new Error(error.message);
  if (!data.length) throw new Error('Choose your public address before saving your landing page.');
  return clean;
}
