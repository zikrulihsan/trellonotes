import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase/client';
import { ensureProfile, getProfile, saveHandle, type Profile } from '@/lib/supabase/profiles';
import type { PublicAuthor } from '@/lib/supabase/published-pages';

// Shared across screens so moving between Pages and the editor doesn't refetch.
const cache = new Map<string, Profile | null>();

/** The signed-in writer's public handle; `undefined` while loading. */
export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id;
  // Shown publicly as the byline, so never fall back to the email address.
  const metadataName: unknown = user?.user_metadata.full_name ?? user?.user_metadata.name;
  const displayName =
    typeof metadataName === 'string' && metadataName.trim() ? metadataName.trim() : null;
  const [loaded, setLoaded] = useState<{ userId?: string; profile: Profile | null }>();
  useEffect(() => {
    if (!supabase || !userId || cache.has(userId)) return;
    let active = true;
    getProfile(supabase, { userId }).then(
      (profile) => {
        cache.set(userId, profile);
        if (active) setLoaded({ userId, profile });
      },
      () => {
        /* Links fall back to the account id until the profile loads. */
      },
    );
    return () => {
      active = false;
    };
  }, [userId]);
  const profile = userId
    ? cache.has(userId)
      ? cache.get(userId)
      : loaded?.userId === userId
        ? loaded.profile
        : undefined
    : null;
  const remember = useCallback(
    (next: Profile | null) => {
      if (!userId) return;
      cache.set(userId, next);
      setLoaded({ userId, profile: next });
    },
    [userId],
  );
  const save = useCallback(
    async (handle: string) => {
      if (!supabase || !userId) throw new Error('Sign in to choose a public address.');
      const next = await saveHandle(supabase, userId, handle.trim().toLowerCase(), displayName);
      remember(next);
      return next;
    },
    [userId, displayName, remember],
  );
  /** Makes sure the writer has a handle before publishing; null if handles aren't set up. */
  const ensure = useCallback(async () => {
    if (!supabase || !userId) return null;
    const next = await ensureProfile(supabase, userId, displayName);
    remember(next);
    return next;
  }, [userId, displayName, remember]);
  const author: PublicAuthor | null = userId ? { userId, handle: profile?.handle ?? null } : null;
  return { profile, author, displayName, save, ensure };
}
