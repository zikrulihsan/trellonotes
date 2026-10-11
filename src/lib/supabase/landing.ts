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
  stack: string[];
  nowHeading: string;
  now: string[];
  storiesHeading: string;
  stories: LandingStory[];
  experiences: LandingExperience[];
}

/** What the writer's public page (/@handle) shows above and around their notes. */
export interface Landing {
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
  about: LandingAbout;
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

export const LANDING_LIMITS = {
  links: 4,
  socials: 8,
  helps: 6,
  projects: 12,
  notes: 20,
  stack: 24,
  now: 8,
  stories: 8,
  experiences: 8,
  highlights: 5,
} as const;

export const defaultAbout = (): LandingAbout => ({
  subtitle: 'A story of growth and discovery',
  photo: '',
  role: '',
  intro: '',
  stack: [],
  nowHeading: "What I'm up to now",
  now: [],
  storiesHeading: 'Learn about my growth',
  stories: [],
  experiences: [],
});

export function defaultLanding(name: string | null): Landing {
  const first = name?.trim().split(/\s+/)[0];
  return {
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
    about: defaultAbout(),
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
  const raw =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const fallback = defaultAbout();
  const heading = (key: string, fallbackText: string) =>
    typeof raw[key] === 'string' ? text(raw[key], 80) : fallbackText;
  return {
    subtitle: heading('subtitle', fallback.subtitle),
    photo: httpsImage(raw.photo),
    role: text(raw.role, 120),
    intro: typeof raw.intro === 'string' ? raw.intro.trim().slice(0, 2500) : '',
    stack: strings(raw.stack, LANDING_LIMITS.stack, 30),
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
    about: normalizeAbout(raw.about),
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
