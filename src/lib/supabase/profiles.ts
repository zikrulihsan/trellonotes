import type { SupabaseClient } from '@supabase/supabase-js';
import { slugify } from '@/lib/slug';

const TABLE = 'trellonotes_profiles';

export interface Profile {
  user_id: string;
  handle: string;
  display_name: string | null;
}

/** 3–30 lowercase letters, digits and dashes, not starting or ending with a dash. */
export const HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

export class HandleTakenError extends Error {
  constructor(handle: string) {
    super(`@${handle} is already taken.`);
  }
}

/** True when the profiles table has not been created yet; publishing still works without it. */
const missingTable = (code?: string) => code === 'PGRST205' || code === '42P01';

export async function getProfile(
  client: SupabaseClient,
  by: { userId: string } | { handle: string },
): Promise<Profile | null> {
  const query = client.from(TABLE).select('user_id, handle, display_name');
  const { data, error } = await (
    'userId' in by ? query.eq('user_id', by.userId) : query.eq('handle', by.handle.toLowerCase())
  ).maybeSingle();
  if (missingTable(error?.code)) return null;
  if (error) throw new Error(error.message);
  return data;
}

export async function saveHandle(
  client: SupabaseClient,
  userId: string,
  handle: string,
  displayName: string | null,
): Promise<Profile> {
  if (!HANDLE_PATTERN.test(handle))
    throw new Error('Use 3–30 lowercase letters, numbers or dashes.');
  const { data, error } = await client
    .from(TABLE)
    .upsert(
      {
        user_id: userId,
        handle,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select('user_id, handle, display_name')
    .single();
  if (error?.code === '23505') throw new HandleTakenError(handle);
  if (missingTable(error?.code))
    throw new Error('Public addresses are not set up yet: the profiles table is missing.');
  if (error) throw new Error(error.message);
  return data;
}

/** Suggests a handle from the writer's name, e.g. "Zikrul Ihsan" → "zikrul-ihsan". */
export function suggestHandle(name: string | null): string {
  const slug = slugify(name ?? '', 30);
  return slug.length >= 3 ? slug : 'writer';
}

/** Gives the writer a profile the first time they publish, picking a free handle. */
export async function ensureProfile(
  client: SupabaseClient,
  userId: string,
  displayName: string | null,
): Promise<Profile | null> {
  const existing = await getProfile(client, { userId });
  if (existing) return existing;
  const base = suggestHandle(displayName).slice(0, 27).replace(/-+$/, '');
  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      return await saveHandle(
        client,
        userId,
        attempt === 1 ? base : `${base}-${attempt}`,
        displayName,
      );
    } catch (reason) {
      if (reason instanceof HandleTakenError) continue;
      // Without the profiles table, pages publish under the older account-id links.
      if (reason instanceof Error && reason.message.startsWith('Public addresses')) return null;
      throw reason;
    }
  }
  return null;
}
