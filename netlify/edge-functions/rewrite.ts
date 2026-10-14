// Rewrites a passage a writer selected in the editor with Gemini: improve, shorten, fix or
// translate it. The rewrite goes back to the app as a suggestion to accept or discard.
// Nothing is stored here.
import {
  REWRITE_MAX_CHARS,
  REWRITE_PROMPTS,
  REWRITE_SCHEMA,
  type RewriteAction,
} from '../../src/lib/rewrite-prompt.ts';
import { askGemini, countGeminiUse, geminiAccess, reply } from '../shared/gemini.ts';

interface RewriteRequest {
  action?: unknown;
  text?: unknown;
}

const isAction = (action: unknown): action is RewriteAction =>
  typeof action === 'string' && Object.hasOwn(REWRITE_PROMPTS, action);

export default async function rewrite(request: Request) {
  if (request.method !== 'POST') return reply(405, { error: 'Use POST.' });
  const access = await geminiAccess(request, 'Sign in to edit with AI.');
  if (!access.ok) return access.response;

  let body: RewriteRequest;
  try {
    body = (await request.json()) as RewriteRequest;
  } catch {
    return reply(400, { error: 'Send the passage as JSON.' });
  }
  if (!isAction(body.action) || typeof body.text !== 'string' || !body.text.trim())
    return reply(400, { error: 'Select some text to edit first.' });

  const result = await askGemini(
    access.key,
    [
      { text: REWRITE_PROMPTS[body.action] },
      { text: `Passage:\n${body.text.slice(0, REWRITE_MAX_CHARS)}` },
    ],
    REWRITE_SCHEMA,
    {
      what: 'edit the passage',
      temperature: body.action === 'fix' ? 0.1 : 0.4,
      slow: 'Gemini took too long. Try a shorter passage.',
    },
  );
  if (!result.ok) return reply(result.status, { error: result.error });
  await countGeminiUse(request, access);
  return reply(200, { rewrite: result.json });
}

export const config = { path: '/api/rewrite' };
