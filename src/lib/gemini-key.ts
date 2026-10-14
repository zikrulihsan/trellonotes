/**
 * A writer's own Gemini API key, for AI past the free daily allowance. It stays in this
 * browser only: it goes along with each AI request and is never saved on the server.
 */
const STORAGE_KEY = 'notis.gemini-key';

/** Google AI Studio's page for making a Gemini API key, which has a free tier. */
export const GEMINI_KEY_URL = 'https://aistudio.google.com/apikey';

export function loadGeminiKey(storage: Pick<Storage, 'getItem'> = localStorage): string {
  try {
    return storage.getItem(STORAGE_KEY)?.trim() ?? '';
  } catch {
    return '';
  }
}

/** Saves the key, or forgets it when empty. Answers whether browser storage took it. */
export function saveGeminiKey(
  key: string,
  storage: Pick<Storage, 'setItem' | 'removeItem'> = localStorage,
): boolean {
  try {
    if (key.trim()) storage.setItem(STORAGE_KEY, key.trim());
    else storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** The headers every AI request sends: the session, and the writer's own key if they set one. */
export function aiHeaders(token: string, key = loadGeminiKey()): Record<string, string> {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${token}`,
    ...(key && { 'x-gemini-key': key }),
  };
}
