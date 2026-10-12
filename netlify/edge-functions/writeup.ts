// Turns a writer's private work notes into a draft page with Gemini. The notes come from
// the app (one week of the work journal, or one card); the draft goes back to the app to be
// saved as a private page. Nothing is stored here.
import {
  WRITEUP_MAX_CHARS,
  WRITEUP_PROMPTS,
  WRITEUP_SCHEMA,
  type WriteupKind,
} from '../../src/lib/writeup-prompt.ts';
import { askGemini, reply, signedIn } from '../shared/gemini.ts';

interface WriteupRequest {
  kind?: unknown;
  notes?: unknown;
}

const isKind = (kind: unknown): kind is WriteupKind => kind === 'week' || kind === 'card';

export default async function writeup(request: Request) {
  if (request.method !== 'POST') return reply(405, { error: 'Use POST.' });
  const key = Netlify.env.get('GEMINI_API_KEY');
  if (!key) return reply(503, { error: 'Writing with Gemini is not set up yet (GEMINI_API_KEY).' });
  if (!(await signedIn(request))) return reply(401, { error: 'Sign in to write with Gemini.' });

  let body: WriteupRequest;
  try {
    body = (await request.json()) as WriteupRequest;
  } catch {
    return reply(400, { error: 'Send the notes as JSON.' });
  }
  if (!isKind(body.kind) || typeof body.notes !== 'string' || !body.notes.trim())
    return reply(400, { error: 'There are no notes to write from.' });

  const result = await askGemini(
    key,
    [
      { text: WRITEUP_PROMPTS[body.kind] },
      { text: `Notes:\n${body.notes.slice(0, WRITEUP_MAX_CHARS)}` },
    ],
    WRITEUP_SCHEMA,
    {
      what: 'write the draft',
      temperature: 0.5,
      slow: 'Gemini took too long. Try again, or pick fewer cards.',
    },
  );
  return result.ok
    ? reply(200, { draft: result.json })
    : reply(result.status, { error: result.error });
}

export const config = { path: '/api/writeup' };
