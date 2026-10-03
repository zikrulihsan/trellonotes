import type { SupabaseClient } from '@supabase/supabase-js';
import type { Workspace } from '@/features/workspace/types';

/** The cloud copy of a workspace. `version` is the row's `updated_at`, used to detect other devices' writes. */
export interface CloudWorkspace {
  workspace: unknown;
  version: string;
}

const TABLE = 'trellonotes_workspaces';

export async function fetchCloudWorkspace(
  client: SupabaseClient,
  userId: string,
): Promise<CloudWorkspace | null> {
  const { data, error } = await client
    .from(TABLE)
    .select('workspace, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? { workspace: data.workspace, version: data.updated_at as string } : null;
}

/**
 * Writes the workspace only if the cloud still holds `version` (or, with no version,
 * has no copy yet). Resolves with the new version, or null when another device wrote first.
 */
export async function writeCloudWorkspace(
  client: SupabaseClient,
  userId: string,
  workspace: Workspace,
  version: string | null,
): Promise<string | null> {
  const row = { workspace, updated_at: new Date().toISOString() };
  if (version === null) {
    const { data, error } = await client
      .from(TABLE)
      .insert({ user_id: userId, ...row })
      .select('updated_at')
      .single();
    if (error?.code === '23505') return null;
    if (error) throw error;
    return data.updated_at as string;
  }
  const { data, error } = await client
    .from(TABLE)
    .update(row)
    .eq('user_id', userId)
    .eq('updated_at', version)
    .select('updated_at');
  if (error) throw error;
  return data.length ? (data[0].updated_at as string) : null;
}
