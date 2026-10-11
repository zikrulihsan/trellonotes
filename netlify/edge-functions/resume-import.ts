// Reads a resume with Gemini and answers with landing page content for the writer to
// review in the admin. Needs GEMINI_API_KEY in Netlify's environment; GEMINI_MODEL is optional.
import {
  RESUME_MAX_BYTES,
  RESUME_MAX_CHARS,
  RESUME_PROMPT,
  RESUME_SCHEMA,
} from '../../src/lib/resume-prompt.ts';

// Public values, the same ones the app is built with (netlify.toml).
const SUPABASE_URL =
  Netlify.env.get('VITE_SUPABASE_URL') ?? 'https://vqtzmhfnyaujkbczibwu.supabase.co';
const SUPABASE_KEY =
  Netlify.env.get('VITE_SUPABASE_PUBLISHABLE_KEY') ??
  'sb_publishable_mnferSlOXnSwAxFkK-nMYg_3MPzYhYm';

/** File types Gemini reads directly. Word files are pasted as text instead. */
const FILE_TYPES = new Set(['application/pdf', 'text/plain', 'image/png', 'image/jpeg']);

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

/** Only signed-in writers may spend the Gemini key. */
async function signedIn(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return false;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, authorization },
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  return Boolean(response?.ok);
}

interface ResumeRequest {
  text?: unknown;
  file?: { mimeType?: unknown; data?: unknown };
}

export default async function resumeImport(request: Request) {
  if (request.method !== 'POST') return reply(405, { error: 'Use POST.' });
  const key = Netlify.env.get('GEMINI_API_KEY');
  if (!key) return reply(503, { error: 'Resume import is not set up yet (GEMINI_API_KEY).' });
  if (!(await signedIn(request))) return reply(401, { error: 'Sign in to import a resume.' });

  let body: ResumeRequest;
  try {
    body = (await request.json()) as ResumeRequest;
  } catch {
    return reply(400, { error: 'Send the resume as JSON.' });
  }
  const parts: unknown[] = [{ text: RESUME_PROMPT }];
  if (typeof body.text === 'string' && body.text.trim()) {
    parts.push({ text: `Resume:\n${body.text.slice(0, RESUME_MAX_CHARS)}` });
  } else if (
    typeof body.file?.mimeType === 'string' &&
    typeof body.file.data === 'string' &&
    FILE_TYPES.has(body.file.mimeType)
  ) {
    if (body.file.data.length > (RESUME_MAX_BYTES * 4) / 3 + 4)
      return reply(413, { error: 'That file is too big. Try a PDF under 4 MB.' });
    parts.push({ inline_data: { mime_type: body.file.mimeType, data: body.file.data } });
  } else {
    return reply(400, { error: 'Attach a PDF or image of your resume, or paste its text.' });
  }

  const model = Netlify.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
          responseSchema: RESUME_SCHEMA,
          // Thinking makes 2.5 Flash slow enough to hit Netlify's response time limit.
          ...(model.startsWith('gemini-2.5-flash') && { thinkingConfig: { thinkingBudget: 0 } }),
        },
      }),
      signal: AbortSignal.timeout(35000),
    },
  ).catch((reason: unknown) =>
    reason instanceof Error && reason.name === 'TimeoutError' ? 'timeout' : null,
  );
  if (response === 'timeout')
    return reply(504, { error: 'Gemini took too long. Try a shorter resume, or paste its text.' });
  if (!response) return reply(502, { error: 'Could not reach Gemini. Try again.' });
  if (!response.ok) {
    // Say why, so a wrong key, a retired model or a used-up quota can be fixed.
    const failure = (await response.json().catch(() => null)) as {
      error?: { status?: string; message?: string };
    } | null;
    const why = failure?.error?.message ?? response.statusText;
    console.error('Gemini error', response.status, model, why);
    return reply(502, {
      error: `Gemini could not read the resume (${[response.status, failure?.error?.status].filter(Boolean).join(' ')}): ${why}`,
    });
  }
  const result = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  if (result.promptFeedback?.blockReason)
    return reply(422, {
      error: `Gemini declined the resume (${result.promptFeedback.blockReason}).`,
    });
  const answer = result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('');
  try {
    return reply(200, { resume: JSON.parse(answer ?? '') });
  } catch {
    return reply(502, { error: 'Gemini answered in an unexpected shape. Try again.' });
  }
}

export const config = { path: '/api/resume-import' };
