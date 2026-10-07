import type { SupabaseClient } from '@supabase/supabase-js';

const TABLE = 'trellonotes_telegram_links';

export interface TelegramLink {
  linked: boolean;
  boardId: string | null;
  listId: string | null;
}

export async function getTelegramLink(
  client: SupabaseClient,
  userId: string,
): Promise<TelegramLink | null> {
  const { data, error } = await client
    .from(TABLE)
    .select('chat_id, board_id, list_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data
    ? { linked: data.chat_id !== null, boardId: data.board_id, listId: data.list_id }
    : null;
}

/** A one-time code the bot accepts as "/start <code>" for the next 15 minutes. */
export async function createTelegramCode(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.rpc('trellonotes_new_telegram_code');
  if (error) throw new Error(error.message);
  return data as string;
}

export async function setTelegramTarget(
  client: SupabaseClient,
  userId: string,
  boardId: string,
  listId: string,
): Promise<void> {
  const { error } = await client
    .from(TABLE)
    .update({ board_id: boardId, list_id: listId, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function unlinkTelegram(client: SupabaseClient): Promise<void> {
  const { error } = await client.rpc('trellonotes_unlink_telegram');
  if (error) throw new Error(error.message);
}
