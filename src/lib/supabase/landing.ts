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
}

/** What the writer's public page (/@handle) shows above and around their notes. */
export interface Landing {
  greeting: string;
  tagline: string;
  links: LandingLink[];
  helpsHeading: string;
  helps: LandingHelp[];
  projectsHeading: string;
  projects: LandingProject[];
  notesHeading: string;
  notesCount: number;
}

export const LANDING_LIMITS = { links: 4, helps: 6, projects: 12, notes: 20 } as const;

export function defaultLanding(name: string | null): Landing {
  const first = name?.trim().split(/\s+/)[0];
  return {
    greeting: first ? `Hi, ${first} Here` : 'Hi, welcome',
    tagline: '',
    links: [],
    helpsHeading: 'Helps People to:',
    helps: [],
    projectsHeading: 'Curious on what i did?',
    projects: [],
    notesHeading: 'Want to know what i think of?',
    notesCount: 5,
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

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

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
    helpsHeading: text(raw.helpsHeading, 80),
    helps: list(raw.helps, LANDING_LIMITS.helps, (help) => {
      const title = text(help.title, 80);
      return title ? { title, subtitle: text(help.subtitle, 120) } : null;
    }),
    projectsHeading: text(raw.projectsHeading, 80),
    projects: list(raw.projects, LANDING_LIMITS.projects, (project) => {
      const title = text(project.title, 100);
      if (!title) return null;
      const image = text(project.image, 500);
      const pageId = text(project.pageId, 80);
      return {
        id: text(project.id, 80) || crypto.randomUUID(),
        title,
        summary: text(project.summary, 140),
        category: text(project.category, 30),
        year: text(project.year, 12),
        image: /^https:\/\//i.test(image) ? image : '',
        pageId: pageId || null,
      };
    }),
    notesHeading: text(raw.notesHeading, 80),
    notesCount: Number.isInteger(count)
      ? Math.min(Math.max(count, 1), LANDING_LIMITS.notes)
      : fallback.notesCount,
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
