import { afterEach, describe, expect, it } from 'vitest';
import { swegrowthSignInUrl, takeSsoToken } from './swegrowth-sso';

describe('swegrowth sso', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('takes the token from the hash and clears it', () => {
    window.history.replaceState(null, '', '/boards?x=1#sso=abc%2Fdef');
    expect(takeSsoToken()).toBe('abc/def');
    expect(window.location.hash).toBe('');
    expect(window.location.pathname + window.location.search).toBe('/boards?x=1');
  });

  it('ignores other hashes', () => {
    window.history.replaceState(null, '', '/#section');
    expect(takeSsoToken()).toBeNull();
    expect(window.location.hash).toBe('#section');
  });

  it('builds the swegrowth.id handoff url', () => {
    expect(swegrowthSignInUrl('https://notes.swegrowth.id')).toBe(
      'https://swegrowth.id/ke/trellonotes?return=https%3A%2F%2Fnotes.swegrowth.id',
    );
  });
});
