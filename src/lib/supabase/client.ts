import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

/**
 * Whether this tab may already be signed in: a session kept from an earlier visit, or one
 * arriving in the URL from a sign-in redirect. Without either, the visitor is signed out
 * and the landing page can show before Supabase answers.
 */
export function mightHaveSession(): boolean {
  const { hash, search } = window.location;
  if (/access_token=|sso=/.test(hash) || /[?&]code=/.test(search)) return true;
  try {
    return Object.keys(window.localStorage).some((key) => /^sb-.+-auth-token$/.test(key));
  } catch {
    return true;
  }
}
