import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { countGeminiUse, geminiAccess } from './gemini.ts';

// The module reads Netlify's environment as it loads, so the stand-in has to come first.
const env = vi.hoisted(() => {
  const values: Record<string, string | undefined> = {};
  Object.assign(globalThis, { Netlify: { env: { get: (name: string) => values[name] } } });
  return values;
});
const calls: string[] = [];
let usedToday: number | 'missing' = 0;

beforeEach(() => {
  vi.stubGlobal('fetch', async (url: string) => {
    calls.push(url);
    if (url.endsWith('/auth/v1/user')) return new Response('{}', { status: 200 });
    if (url.endsWith('/rpc/trellonotes_ai_used_today'))
      return usedToday === 'missing'
        ? new Response('{}', { status: 404 })
        : new Response(String(usedToday), { status: 200 });
    if (url.endsWith('/rpc/trellonotes_count_ai_use')) return new Response('1', { status: 200 });
    throw new Error(`unexpected ${url}`);
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const name of Object.keys(env)) delete env[name];
  calls.length = 0;
  usedToday = 0;
});

const request = (headers: Record<string, string> = {}) =>
  new Request('https://notis.test/api/writeup', {
    method: 'POST',
    headers: { authorization: 'Bearer token', ...headers },
  });

describe('Gemini access', () => {
  it('uses the app key while free requests are left, and counts each one', async () => {
    env.GEMINI_API_KEY = 'app-key';
    usedToday = 9;
    const access = await geminiAccess(request(), 'Sign in.');
    expect(access).toEqual({ ok: true, key: 'app-key', own: false });
    if (access.ok) await countGeminiUse(request(), access);
    expect(calls.some((url) => url.endsWith('/rpc/trellonotes_count_ai_use'))).toBe(true);
  });

  it('stops at the daily limit and points to an own key', async () => {
    env.GEMINI_API_KEY = 'app-key';
    env.AI_DAILY_LIMIT = '3';
    usedToday = 3;
    const access = await geminiAccess(request(), 'Sign in.');
    expect(access.ok).toBe(false);
    if (access.ok) return;
    expect(access.response.status).toBe(429);
    expect(await access.response.json()).toMatchObject({ code: 'ai-quota' });
  });

  it('uses the writer’s own key without counting it', async () => {
    env.GEMINI_API_KEY = 'app-key';
    usedToday = 99;
    const access = await geminiAccess(request({ 'x-gemini-key': ' own-key ' }), 'Sign in.');
    expect(access).toEqual({ ok: true, key: 'own-key', own: true });
    if (access.ok) await countGeminiUse(request(), access);
    expect(calls.some((url) => url.includes('/rpc/'))).toBe(false);
  });

  it('lets requests through when the usage table is not there yet', async () => {
    env.GEMINI_API_KEY = 'app-key';
    usedToday = 'missing';
    expect(await geminiAccess(request(), 'Sign in.')).toMatchObject({ ok: true, own: false });
  });

  it('asks for an own key when the site has none', async () => {
    const access = await geminiAccess(request(), 'Sign in.');
    expect(access.ok).toBe(false);
    if (!access.ok) expect(await access.response.json()).toMatchObject({ code: 'ai-key-needed' });
  });
});
