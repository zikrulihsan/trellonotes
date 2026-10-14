import { afterEach, describe, expect, it } from 'vitest';
import { takeGoogleReturn } from './google-direct';

const PENDING_KEY = 'notis-google-redirect';

describe('google direct sign-in', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
    sessionStorage.clear();
  });

  it('takes the ID token and returns to where sign-in started', () => {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ state: 's1', nonce: 'n1', next: '/board/x?y=1' }));
    window.history.replaceState(null, '', '/auth/google#state=s1&id_token=tok');
    expect(takeGoogleReturn()).toEqual({ token: 'tok', nonce: 'n1' });
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/board/x?y=1');
    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('drops a token whose state does not match', () => {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ state: 's1', nonce: 'n1', next: '/' }));
    window.history.replaceState(null, '', '/auth/google#state=other&id_token=tok');
    expect(takeGoogleReturn()).toBeNull();
    expect(window.location.hash).toBe('');
  });

  it('never returns to another site', () => {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ state: 's1', nonce: 'n1', next: '//evil.example' }));
    window.history.replaceState(null, '', '/auth/google#state=s1&id_token=tok');
    takeGoogleReturn();
    expect(window.location.pathname).toBe('/');
  });

  it('ignores other pages', () => {
    window.history.replaceState(null, '', '/boards#id_token=tok');
    expect(takeGoogleReturn()).toBeNull();
    expect(window.location.hash).toBe('#id_token=tok');
  });
});
