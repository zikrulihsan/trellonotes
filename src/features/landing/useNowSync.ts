import { useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useWorkspace } from '@/hooks/useWorkspace';
import { supabase } from '@/lib/supabase/client';
import { defaultLanding, getLanding, saveLanding } from '@/lib/supabase/landing';
import { useProfile } from '@/features/pages/useProfile';
import { nowTitles } from '@/features/journal/journal';

/** The list last written for each account, so an unchanged list costs no request. */
const written = new Map<string, string>();

/**
 * Keeps the "What I'm working on" list on the public page in step with the cards the
 * writer picked. Waits until the workspace has come from the cloud, so a device that
 * hasn't caught up never wipes the list.
 */
export function useNowSync() {
  const { workspace, syncStatus } = useWorkspace();
  const { user } = useAuth();
  const { profile, displayName } = useProfile();
  const userId = user?.id;
  const titles = nowTitles(workspace);
  const key = JSON.stringify(titles);
  const ready = syncStatus === 'synced' || syncStatus === 'syncing';
  useEffect(() => {
    if (!supabase || !userId || !profile || !ready || written.get(userId) === key) return;
    const client = supabase;
    const timer = window.setTimeout(async () => {
      try {
        const landing = await getLanding(client, userId);
        const working: string[] = JSON.parse(key);
        if (!landing && !working.length) return written.set(userId, key);
        const base = landing ?? defaultLanding(displayName);
        if (JSON.stringify(base.working) !== key)
          await saveLanding(client, userId, { ...base, working });
        written.set(userId, key);
      } catch {
        /* Tried again on the next change. */
      }
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [userId, profile, ready, key, displayName]);
}
