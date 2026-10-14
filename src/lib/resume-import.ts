import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeLanding, toLinkUrl, type Landing } from '@/lib/supabase/landing';
import { RESUME_MAX_BYTES } from '@/lib/resume-prompt';
import { aiHeaders } from '@/lib/gemini-key';

/** What the writer hands over: a resume file, or its text pasted in. */
export type ResumeInput = { file: File } | { text: string };

const FILE_TYPES = ['application/pdf', 'text/plain', 'image/png', 'image/jpeg'];
export const RESUME_ACCEPT = '.pdf,.txt,.png,.jpg,.jpeg';

async function base64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let at = 0; at < bytes.length; at += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
  return btoa(binary);
}

/** Asks Gemini (through the app's edge function) to read a resume. */
export async function readResume(client: SupabaseClient, input: ResumeInput): Promise<unknown> {
  let body;
  if ('file' in input) {
    if (!FILE_TYPES.includes(input.file.type))
      throw new Error('Use a PDF, image or text file. For a Word file, paste its text instead.');
    if (input.file.size > RESUME_MAX_BYTES) throw new Error('That file is over 4 MB.');
    body = { file: { mimeType: input.file.type, data: await base64(input.file) } };
  } else {
    if (!input.text.trim()) throw new Error('Paste your resume first.');
    body = { text: input.text };
  }
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sign in to import a resume.');
  const response = await fetch('/api/resume-import', {
    method: 'POST',
    headers: aiHeaders(token),
    body: JSON.stringify(body),
  });
  const result = (await response.json().catch(() => null)) as {
    resume?: unknown;
    error?: string;
  } | null;
  if (!response.ok || !result?.resume)
    throw new Error(
      result?.error ?? `The resume import failed (${response.status}). Try again in a moment.`,
    );
  return result.resume;
}

const record = (value: unknown) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const array = (value: unknown) => (Array.isArray(value) ? value : []);
const filled = (value: unknown) => array(value).length > 0;

/**
 * Fills the draft with what Gemini read from the resume. Hero, helps, projects and the
 * About text are replaced; the photo, story pages, headings and notes settings stay, and
 * nothing is saved until the writer reviews it and presses Save.
 */
export function applyResume(current: Landing, resume: unknown): Landing {
  const read = record(resume);
  const about = record(read.about);
  const email = typeof read.contactEmail === 'string' ? read.contactEmail.trim() : '';
  const mailto = email && toLinkUrl(email).startsWith('mailto:') ? toLinkUrl(email) : '';
  const socials = [...current.socials, ...array(read.socials), ...(mailto ? [mailto] : [])]
    .map((url) => (typeof url === 'string' ? toLinkUrl(url.trim()) : ''))
    .filter((url, index, all) => url && all.indexOf(url) === index);
  return (
    normalizeLanding({
      ...current,
      greeting: read.greeting || current.greeting,
      tagline: read.tagline || current.tagline,
      links: current.links.length || !mailto ? current.links : [{ label: 'Contact', url: mailto }],
      socials,
      helps: filled(read.helps) ? read.helps : current.helps,
      // New projects start without a write-up; the writer links pages to them afterwards.
      projects: filled(read.projects)
        ? array(read.projects).map((project) => ({ ...record(project), pageId: null, image: '' }))
        : current.projects,
      about: {
        ...current.about,
        role: about.role || current.about.role,
        intro: about.intro || current.about.intro,
        stack: filled(about.stack) ? about.stack : current.about.stack,
        now: filled(about.now) ? about.now : current.about.now,
        experiences: filled(about.experiences) ? about.experiences : current.about.experiences,
      },
    }) ?? current
  );
}
