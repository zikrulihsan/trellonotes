import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useWorkspaceActions } from '@/hooks/useWorkspace';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase/client';
import { publishPage, setPageUnlisted, unpublishPage } from '@/lib/supabase/published-pages';
import type { Page } from '@/features/workspace/types';
import { useProfile } from './useProfile';
import { visibility, type Visibility } from './publish-state';

/** Publishing actions for one page, shared by the editor and the Pages list. */
export function usePageVisibility(page: Page) {
  const { setPagePublished } = useWorkspaceActions(),
    { user } = useAuth(),
    { ensure, displayName } = useProfile();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const shown = visibility(page);
  const canPublish = Boolean(supabase && user);
  async function run(task: (client: SupabaseClient) => Promise<void>, failure: string) {
    if (!supabase || !user) return;
    setBusy(true);
    setError('');
    try {
      await task(supabase);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : failure);
    } finally {
      setBusy(false);
    }
  }
  /** Publishes the latest content, keeping the page listed or unlisted as it is. */
  const publish = (unlisted?: boolean) =>
    run(async (client) => {
      // The first publish also picks the writer's public address (/@handle).
      await ensure();
      setPagePublished(page.id, await publishPage(client, page, displayName, unlisted));
    }, 'Could not publish this page.');
  function choose(next: Visibility) {
    if (next === shown) return;
    if (next === 'draft')
      return run(async (client) => {
        await unpublishPage(client, page.id);
        setPagePublished(page.id, undefined);
      }, 'Could not unpublish this page.');
    const unlisted = next === 'unlisted';
    if (!page.published) return publish(unlisted);
    const { slug, at } = page.published;
    return run(async (client) => {
      await setPageUnlisted(client, page.id, unlisted);
      setPagePublished(page.id, { slug, at, ...(unlisted && { unlisted }) });
    }, 'Could not change who can see this page.');
  }
  return { shown, canPublish, busy, error, publish, choose };
}
