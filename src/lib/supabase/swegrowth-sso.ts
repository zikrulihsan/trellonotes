import type { SupabaseClient } from '@supabase/supabase-js';

const SWEGROWTH_ORIGIN = 'https://swegrowth.id';

/** swegrowth.id signs the user in (if needed) and sends them back with a one-time token. */
export function swegrowthSignInUrl(returnTo = window.location.origin) {
  return `${SWEGROWTH_ORIGIN}/ke/trellonotes?return=${encodeURIComponent(returnTo)}`;
}

/**
 * Reads the `#sso=` token swegrowth.id's app-handoff function appends and removes it
 * from the address bar so it never lands in browser history.
 */
export function takeSsoToken(): string | null {
  const match = /^#sso=([^&]+)$/.exec(window.location.hash);
  if (!match) return null;
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return decodeURIComponent(match[1]);
}

/** Exchanges the token for this app's own session; failures fall back to the sign-in screen. */
export async function signInWithSsoToken(client: SupabaseClient, tokenHash: string) {
  const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
  return !error;
}
