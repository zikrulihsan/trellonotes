import type { User } from '@supabase/supabase-js';

/** Where a visitor's ticked consent waits while sign-in leaves the page. */
const PENDING_KEY = 'notis-consent-pending';

/** Whether this account has agreed to the Terms and the Privacy Policy. */
export function hasAcceptedTerms(user: User | null) {
  return Boolean(user?.user_metadata.terms_accepted_at);
}

/** Remembers that the visitor ticked the consent box before going off to sign in. */
export function rememberConsent() {
  try {
    window.localStorage.setItem(PENDING_KEY, '1');
  } catch {
    // Without storage the account is simply asked again after sign-in.
  }
}

/** Reads and clears consent ticked before sign-in. */
export function takeRememberedConsent() {
  try {
    const pending = window.localStorage.getItem(PENDING_KEY) === '1';
    window.localStorage.removeItem(PENDING_KEY);
    return pending;
  } catch {
    return false;
  }
}
