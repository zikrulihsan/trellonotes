// What the app's Gemini edge functions share: the JSON reply, the signed-in check, the
// free daily allowance on the app's key, and one structured call to Gemini. Needs
// GEMINI_API_KEY in Netlify's environment; GEMINI_MODEL and AI_DAILY_LIMIT are optional.

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

/** Free Gemini requests per writer per day on the app's key, unless AI_DAILY_LIMIT says otherwise. */
const DEFAULT_DAILY_LIMIT = 10;
/** The header a writer's own Gemini key comes in, from their browser. It is never stored here. */
const OWN_KEY_HEADER = 'x-gemini-key';

const dailyLimit = () => {
  const limit = Number(Netlify.env.get('AI_DAILY_LIMIT'));
  return Number.isFinite(limit) && limit >= 0 ? Math.floor(limit) : DEFAULT_DAILY_LIMIT;
};

/** Calls one of the AI usage functions in the database as the signed-in writer. */
async function usage(request: Request, name: string): Promise<number | null> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      authorization: request.headers.get('authorization') ?? '',
      'content-type': 'application/json',
    },
    body: '{}',
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  if (!response?.ok) {
    console.error('AI usage call failed', name, response?.status);
    return null;
  }
  const count = (await response.json().catch(() => null)) as unknown;
  return typeof count === 'number' ? count : null;
}

export type GeminiAccess =
  { ok: true; key: string; own: boolean } | { ok: false; response: Response };

/**
 * Which Gemini key a request may use: the writer's own key when they sent one, or else the
 * app's key while they have free requests left today. Signed-in writers only, either way.
 */
export async function geminiAccess(request: Request, signInFirst: string): Promise<GeminiAccess> {
  if (!(await signedIn(request)))
    return { ok: false, response: reply(401, { error: signInFirst }) };
  const own = request.headers.get(OWN_KEY_HEADER)?.trim();
  if (own) return { ok: true, key: own, own: true };
  const key = Netlify.env.get('GEMINI_API_KEY');
  if (!key)
    return {
      ok: false,
      response: reply(503, {
        error: 'AI is not set up on this site yet. Add your own Gemini API key to use it.',
        code: 'ai-key-needed',
      }),
    };
  const limit = dailyLimit();
  // Without the usage table (not migrated yet) the allowance cannot be checked; let it through.
  const used = await usage(request, 'trellonotes_ai_used_today');
  if (used !== null && used >= limit)
    return {
      ok: false,
      response: reply(429, {
        error: `You have used today's ${limit} free AI requests. Add your own Gemini API key to keep going, or come back tomorrow.`,
        code: 'ai-quota',
      }),
    };
  return { ok: true, key, own: false };
}

/** Counts a finished request against the writer's free allowance when it used the app's key. */
export async function countGeminiUse(request: Request, access: { own: boolean }) {
  if (!access.own) await usage(request, 'trellonotes_count_ai_use');
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
