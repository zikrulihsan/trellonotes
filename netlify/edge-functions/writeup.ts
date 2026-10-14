// Turns a writer's private work notes into a draft page with Gemini. The notes come from
// the app (one week of the work journal, or one card); the draft goes back to the app to be
// saved as a private page. Nothing is stored here.
import {
  WRITEUP_MAX_CHARS,
  WRITEUP_PROMPTS,
  WRITEUP_SCHEMA,
  type WriteupKind,
} from '../../src/lib/writeup-prompt.ts';
import { askGemini, countGeminiUse, geminiAccess, reply } from '../shared/gemini.ts';

interface WriteupRequest {
  kind?: unknown;
  notes?: unknown;
}

const isKind = (kind: unknown): kind is WriteupKind => kind === 'week' || kind === 'card';

export default async function writeup(request: Request) {
  if (request.method !== 'POST') return reply(405, { error: 'Use POST.' });
  const access = await geminiAccess(request, 'Sign in to write with Gemini.');
  if (!access.ok) return access.response;

  let body: WriteupRequest;
  try {
    body = (await request.json()) as WriteupRequest;
  } catch {
    return reply(400, { error: 'Send the notes as JSON.' });
  }
  if (!isKind(body.kind) || typeof body.notes !== 'string' || !body.notes.trim())
    return reply(400, { error: 'There are no notes to write from.' });

  const result = await askGemini(
    access.key,
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
  if (!result.ok) return reply(result.status, { error: result.error });
  await countGeminiUse(request, access);
  return reply(200, { draft: result.json });
}

export const config = { path: '/api/writeup' };
