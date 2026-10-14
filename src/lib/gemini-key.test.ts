import { describe, expect, it } from 'vitest';
import { aiHeaders, loadGeminiKey, saveGeminiKey } from './gemini-key';

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

describe('own Gemini key', () => {
  it('saves a trimmed key, and forgets it when cleared', () => {
    const storage = memoryStorage();
    expect(loadGeminiKey(storage)).toBe('');
    expect(saveGeminiKey('  AIza-test  ', storage)).toBe(true);
    expect(loadGeminiKey(storage)).toBe('AIza-test');
    saveGeminiKey('', storage);
    expect(loadGeminiKey(storage)).toBe('');
  });

  it('reads as no key when browser storage is unavailable', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadGeminiKey(broken)).toBe('');
    expect(saveGeminiKey('AIza-test', broken)).toBe(false);
  });

  it('sends the key with AI requests only when there is one', () => {
    expect(aiHeaders('token', '')).toEqual({
      'content-type': 'application/json',
      authorization: 'Bearer token',
    });
    expect(aiHeaders('token', 'AIza-test')['x-gemini-key']).toBe('AIza-test');
  });
});
