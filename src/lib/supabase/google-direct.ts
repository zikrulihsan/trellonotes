import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Google sign-in that goes straight to Google instead of through Supabase's OAuth redirect,
 * so Google's screen names this site rather than <project>.supabase.co. Google returns an
 * ID token to /auth/google, which Supabase turns into the usual session (signInWithIdToken).
 * Without VITE_GOOGLE_CLIENT_ID the app keeps using Supabase's redirect.
 */
export const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || null;

export const GOOGLE_RETURN_PATH = '/auth/google';
const PENDING_KEY = 'notis-google-redirect';

type Pending = { state: string; nonce: string; next: string };
type GoogleReturn = { token: string; nonce: string };

/** A random nonce: the SHA-256 hex goes to Google, the raw value to Supabase. */
async function makeNonce() {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return { raw, hashed };
}

/** Sends the whole page to Google's sign-in, to come back to /auth/google with an ID token. */
export async function startGoogleRedirect(clientId: string) {
  const nonce = await makeNonce();
  const state = crypto.randomUUID();
  const next = window.location.pathname + window.location.search;
  const pending: Pending = { state, nonce: nonce.raw, next };
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: window.location.origin + GOOGLE_RETURN_PATH,
    response_type: 'id_token',
    scope: 'openid email profile',
    nonce: nonce.hashed,
    state,
    prompt: 'select_account',
  });
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

let taken: GoogleReturn | null = null;
let exchange: Promise<boolean> | null = null;

/**
 * On /auth/google, reads Google's ID token from the hash, checks the state, and moves the
 * address back to where sign-in started, before the router mounts, so the token never
 * lands in browser history. Elsewhere it does nothing.
 */
export function takeGoogleReturn(): GoogleReturn | null {
  if (window.location.pathname.replace(/\/$/, '') !== GOOGLE_RETURN_PATH) return null;
  const hash = new URLSearchParams(window.location.hash.slice(1));
  let pending: Partial<Pending> = {};
  try {
    pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? '{}') as Partial<Pending>;
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Without storage the state can't be checked, so the token is dropped.
  }
  const next = pending.next?.startsWith('/') && !pending.next.startsWith('//') ? pending.next : '/';
  window.history.replaceState(null, '', next);

  const token = hash.get('id_token');
  if (!token || !pending.nonce || !pending.state || hash.get('state') !== pending.state) return null;
  taken = { token, nonce: pending.nonce };
  return taken;
}

/** Whether this page load came back from Google with a token still to exchange. */
export function hasGoogleReturn() {
  return taken !== null;
}

/** Trades the ID token for a Supabase session, once per page load; failures show sign-in again. */
export function finishGoogleSignIn(client: SupabaseClient): Promise<boolean> {
  if (!taken) return Promise.resolve(false);
  const { token, nonce } = taken;
  exchange ??= client.auth
    .signInWithIdToken({ provider: 'google', token, nonce })
    .then(({ error }) => !error);
  return exchange;
}
