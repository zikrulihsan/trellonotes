import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { signInWithSsoToken, swegrowthSignInUrl, takeSsoToken } from '@/lib/supabase/swegrowth-sso';
import { AuthContext, type AuthContextValue } from './auth-context';

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const client = supabase;
    const ssoToken = takeSsoToken();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // While a swegrowth.id token is being exchanged, the empty initial session isn't final.
      if (ssoToken && event === 'INITIAL_SESSION') return;
      if (active) {
        setSession(nextSession);
        setLoading(false);
      }
    });
    void (async () => {
      // Arriving from swegrowth.id: trade its one-time token for a session before deciding.
      if (ssoToken) await signInWithSsoToken(client, ssoToken);
      const { data, error } = await client.auth.getSession();
      if (!active) return;
      setSession(error ? null : data.session);
      setLoading(false);
    })();
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      session,
      user: session?.user ?? null,
      async signInWithGoogle() {
        if (!supabase) throw new Error('Supabase is not configured for this app.');
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        });
        if (error) throw error;
      },
      signInWithSwegrowth() {
        window.location.assign(swegrowthSignInUrl());
      },
      async signOut() {
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
