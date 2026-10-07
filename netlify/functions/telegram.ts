// Telegram webhook: every message sent to the bot arrives here. A linked chat's text
// becomes a new note in its owner's workspace; "/start <code>" links a chat.
//
// Environment (Netlify site settings, not committed):
//   TELEGRAM_BOT_TOKEN         token from @BotFather
//   TELEGRAM_WEBHOOK_SECRET    any random string; also given to setWebhook as secret_token
//   SUPABASE_URL               the Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY  server-only key; bypasses RLS, never expose it to the browser
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  addNoteToWorkspace,
  escapeHtml,
  parseBotMessage,
  resolveTarget,
  type NoteTarget,
} from '../../src/lib/telegram/bot';
import type { Workspace } from '../../src/features/workspace/types';

export const config = { path: '/api/telegram' };

const LINKS = 'trellonotes_telegram_links';
const WORKSPACES = 'trellonotes_workspaces';

interface TelegramUpdate {
  message?: {
    chat: { id: number; type: string };
    text?: string;
    caption?: string;
  };
}

interface Link extends NoteTarget {
  user_id: string;
}

const HELP = [
  'Kirim pesan apa saja ke sini, dan pesan itu jadi catatan baru di TrelloNotes.',
  'Baris pertama jadi judul, baris berikutnya jadi isi catatan.',
  '',
  '/where — lihat ke board dan list mana catatan masuk',
  '/stop — putuskan chat ini dari akun TrelloNotes',
  '',
  'Untuk menyambungkan: buka TrelloNotes, pilih Telegram di sidebar, lalu ketuk tautannya.',
].join('\n');

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function send(chatId: number, html: string): Promise<void> {
  const response = await fetch(
    `https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/sendMessage`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: 'HTML' }),
    },
  );
  if (!response.ok) console.error('Telegram sendMessage failed', await response.text());
}

async function findLink(db: SupabaseClient, chatId: number): Promise<Link | null> {
  const { data, error } = await db
    .from(LINKS)
    .select('user_id, board_id, list_id')
    .eq('chat_id', chatId)
    .maybeSingle();
  if (error) throw error;
  return data ? { user_id: data.user_id, boardId: data.board_id, listId: data.list_id } : null;
}

async function linkChat(db: SupabaseClient, chatId: number, code: string): Promise<boolean> {
  const { data, error } = await db
    .from(LINKS)
    .select('user_id')
    .eq('link_code', code)
    .gt('link_code_expires_at', new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  if (!data) return false;
  // One chat belongs to one account: free it from any account it was linked to before.
  const cleared = await db
    .from(LINKS)
    .update({ chat_id: null })
    .eq('chat_id', chatId)
    .neq('user_id', data.user_id);
  if (cleared.error) throw cleared.error;
  const linked = await db
    .from(LINKS)
    .update({
      chat_id: chatId,
      link_code: null,
      link_code_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', data.user_id);
  if (linked.error) throw linked.error;
  return true;
}

/**
 * Adds the note with the same optimistic check the app uses (`updated_at` must not have
 * moved), so an app saving at the same moment merges this note in instead of losing it.
 */
async function addNote(
  db: SupabaseClient,
  link: Link,
  note: { title: string; content: string },
): Promise<string> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await db
      .from(WORKSPACES)
      .select('workspace, updated_at')
      .eq('user_id', link.user_id)
      .maybeSingle();
    if (error) throw error;
    if (!data)
      return 'Workspace kamu belum ada di cloud. Buka TrelloNotes dan login sekali dulu, lalu kirim lagi.';
    const added = addNoteToWorkspace(data.workspace, note, link);
    if (!added) return 'Belum ada board dengan list di workspace kamu. Buat dulu di TrelloNotes.';
    const saved = await db
      .from(WORKSPACES)
      .update({ workspace: added.workspace, updated_at: new Date().toISOString() })
      .eq('user_id', link.user_id)
      .eq('updated_at', data.updated_at)
      .select('user_id');
    if (saved.error) throw saved.error;
    if (saved.data.length)
      return `✅ Ditambahkan ke <b>${escapeHtml(added.board.title)}</b> › ${escapeHtml(added.list.title)}`;
  }
  return 'Workspace sedang sibuk disimpan. Coba kirim lagi sebentar.';
}

async function describeTarget(db: SupabaseClient, link: Link): Promise<string> {
  const { data, error } = await db
    .from(WORKSPACES)
    .select('workspace')
    .eq('user_id', link.user_id)
    .maybeSingle();
  if (error) throw error;
  const place = data && resolveTarget(data.workspace as Workspace, link);
  return place
    ? `Catatan baru masuk ke <b>${escapeHtml(place.board.title)}</b> › ${escapeHtml(place.list.title)}. Ganti tujuannya dari menu Telegram di TrelloNotes.`
    : 'Belum ada board dengan list di workspace kamu.';
}

async function handle(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  // Only private chats: in a group, anyone in it could write into the workspace.
  if (!message || message.chat.type !== 'private') return;
  const chatId = message.chat.id;
  const text = message.text ?? message.caption;
  if (!text) return send(chatId, 'Untuk sekarang hanya pesan teks yang bisa jadi catatan.');
  const parsed = parseBotMessage(text);
  if (!parsed) return;
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  switch (parsed.kind) {
    case 'start':
      if (!parsed.code) return send(chatId, HELP);
      return send(
        chatId,
        (await linkChat(db, chatId, parsed.code))
          ? '🔗 Tersambung! Kirim pesan apa saja, dan pesan itu jadi catatan baru di TrelloNotes.'
          : 'Kode itu tidak dikenal atau sudah kedaluwarsa. Buat tautan baru dari menu Telegram di TrelloNotes.',
      );
    case 'help':
    case 'unknown-command':
      return send(chatId, HELP);
  }
  const link = await findLink(db, chatId);
  if (!link)
    return send(
      chatId,
      'Chat ini belum tersambung ke akun TrelloNotes. Buka TrelloNotes, pilih Telegram di sidebar, lalu ketuk tautannya.',
    );
  switch (parsed.kind) {
    case 'stop': {
      const { error } = await db.from(LINKS).update({ chat_id: null }).eq('user_id', link.user_id);
      if (error) throw error;
      return send(chatId, 'Chat ini sudah diputus dari TrelloNotes.');
    }
    case 'where':
      return send(chatId, await describeTarget(db, link));
    case 'note':
      return send(chatId, await addNote(db, link, parsed));
  }
}

export default async function telegramWebhook(request: Request): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (request.headers.get('x-telegram-bot-api-secret-token') !== env('TELEGRAM_WEBHOOK_SECRET'))
    return new Response('Forbidden', { status: 403 });
  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return new Response('Bad request', { status: 400 });
  }
  try {
    await handle(update);
  } catch (error) {
    console.error('Telegram update failed', error);
    const chatId = update.message?.chat.type === 'private' ? update.message.chat.id : null;
    if (chatId !== null) await send(chatId, 'Maaf, catatan gagal disimpan. Coba lagi sebentar.');
  }
  // Always 200 once authenticated, so Telegram does not redeliver the same message forever.
  return new Response('ok');
}
