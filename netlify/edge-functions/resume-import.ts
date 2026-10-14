// Reads a resume with Gemini and answers with landing page content for the writer to
// review in the admin. Needs GEMINI_API_KEY in Netlify's environment; GEMINI_MODEL is optional.
import {
  RESUME_MAX_BYTES,
  RESUME_MAX_CHARS,
  RESUME_PROMPT,
  RESUME_SCHEMA,
} from '../../src/lib/resume-prompt.ts';
import { askGemini, countGeminiUse, geminiAccess, reply } from '../shared/gemini.ts';

/** File types Gemini reads directly. Word files are pasted as text instead. */
const FILE_TYPES = new Set(['application/pdf', 'text/plain', 'image/png', 'image/jpeg']);

interface ResumeRequest {
  text?: unknown;
  file?: { mimeType?: unknown; data?: unknown };
}

export default async function resumeImport(request: Request) {
  if (request.method !== 'POST') return reply(405, { error: 'Use POST.' });
  const access = await geminiAccess(request, 'Sign in to import a resume.');
  if (!access.ok) return access.response;

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

  const result = await askGemini(access.key, parts, RESUME_SCHEMA, {
    what: 'read the resume',
    temperature: 0.3,
    slow: 'Gemini took too long. Try a shorter resume, or paste its text.',
  });
  if (!result.ok) return reply(result.status, { error: result.error });
  await countGeminiUse(request, access);
  return reply(200, { resume: result.json });
}

export const config = { path: '/api/resume-import' };
