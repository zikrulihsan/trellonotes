// What the app's Gemini edge functions share: the JSON reply, the signed-in check and one
// structured call to Gemini. Needs GEMINI_API_KEY in Netlify's environment; GEMINI_MODEL is
// optional.

// Public values, the same ones the app is built with (netlify.toml).
const SUPABASE_URL =
  Netlify.env.get('VITE_SUPABASE_URL') ?? 'https://vqtzmhfnyaujkbczibwu.supabase.co';
const SUPABASE_KEY =
  Netlify.env.get('VITE_SUPABASE_PUBLISHABLE_KEY') ??
  'sb_publishable_mnferSlOXnSwAxFkK-nMYg_3MPzYhYm';

export const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

/** Only signed-in writers may spend the Gemini key. */
export async function signedIn(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return false;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, authorization },
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  return Boolean(response?.ok);
}

export type GeminiResult =
  { ok: true; json: unknown } | { ok: false; status: number; error: string };

/**
 * Sends `parts` to Gemini and parses its JSON answer, which follows `schema`. Errors say
 * why, so a wrong key, a retired model or a used-up quota can be fixed.
 */
export async function askGemini(
  key: string,
  parts: unknown[],
  schema: unknown,
  { what, temperature, slow }: { what: string; temperature: number; slow: string },
): Promise<GeminiResult> {
  const model = Netlify.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature,
          responseMimeType: 'application/json',
          responseSchema: schema,
          // Thinking makes 2.5 Flash slow enough to hit Netlify's response time limit.
          ...(model.startsWith('gemini-2.5-flash') && { thinkingConfig: { thinkingBudget: 0 } }),
        },
      }),
      signal: AbortSignal.timeout(35000),
    },
  ).catch((reason: unknown) =>
    reason instanceof Error && reason.name === 'TimeoutError' ? 'timeout' : null,
  );
  if (response === 'timeout') return { ok: false, status: 504, error: slow };
  if (!response) return { ok: false, status: 502, error: 'Could not reach Gemini. Try again.' };
  if (!response.ok) {
    const failure = (await response.json().catch(() => null)) as {
      error?: { status?: string; message?: string };
    } | null;
    const why = failure?.error?.message ?? response.statusText;
    console.error('Gemini error', response.status, model, why);
    return {
      ok: false,
      status: 502,
      error: `Gemini could not ${what} (${[response.status, failure?.error?.status].filter(Boolean).join(' ')}): ${why}`,
    };
  }
  const result = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  if (result.promptFeedback?.blockReason)
    return {
      ok: false,
      status: 422,
      error: `Gemini declined (${result.promptFeedback.blockReason}).`,
    };
  const answer = result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('');
  try {
    return { ok: true, json: JSON.parse(answer ?? '') };
  } catch {
    return { ok: false, status: 502, error: 'Gemini answered in an unexpected shape. Try again.' };
  }
}
