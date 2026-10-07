// Shared by the app and the Telegram webhook (netlify/functions/telegram.ts), so
// imports stay relative: the function bundler does not know the `@/` alias.
import { createNote } from '../../features/workspace/factories';
import type { Board, BoardList, Workspace } from '../../features/workspace/types';

export type BotMessage =
  | { kind: 'start'; code: string | null }
  | { kind: 'stop' }
  | { kind: 'help' }
  | { kind: 'where' }
  | { kind: 'unknown-command' }
  | { kind: 'note'; title: string; content: string };

const TITLE_LIMIT = 200;

/** Reads a chat message: a command ("/start abc", "/stop@MyBot"), or text for a new note. */
export function parseBotMessage(text: string): BotMessage | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const command = /^\/([a-z_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/i.exec(trimmed);
  if (command) {
    const arg = command[2]?.trim() || null;
    switch (command[1].toLowerCase()) {
      case 'start':
        return { kind: 'start', code: arg };
      case 'stop':
        return { kind: 'stop' };
      case 'help':
        return { kind: 'help' };
      case 'where':
        return { kind: 'where' };
      default:
        return { kind: 'unknown-command' };
    }
  }
  return { kind: 'note', ...noteFromText(trimmed) };
}

/** The first line becomes the title; any further lines become the note's paragraphs. */
export function noteFromText(text: string): { title: string; content: string } {
  const [first, ...rest] = text.trim().split(/\r?\n/);
  let title = first.trim();
  const body = rest.map((line) => line.trim());
  if (title.length > TITLE_LIMIT) {
    body.unshift(title);
    title = `${title.slice(0, TITLE_LIMIT - 1).trimEnd()}…`;
  }
  const content = body
    .join('\n')
    .trim()
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
  return { title, content };
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface NoteTarget {
  boardId: string | null;
  listId: string | null;
}

/** The chosen list when it still exists, otherwise the first list of the first board. */
export function resolveTarget(
  workspace: Workspace,
  target: NoteTarget | null,
): { board: Board; list: BoardList } | null {
  const chosen = workspace.boards.find((b) => b.id === target?.boardId);
  const list = chosen?.lists.find((l) => l.id === target?.listId);
  if (chosen && list) return { board: chosen, list };
  for (const board of workspace.boards) if (board.lists[0]) return { board, list: board.lists[0] };
  return null;
}

function looksLikeWorkspace(value: unknown): value is Workspace {
  const ws = value as Partial<Workspace> | null;
  return (
    typeof ws === 'object' &&
    ws !== null &&
    Array.isArray(ws.boards) &&
    Array.isArray(ws.cards) &&
    ws.boards.every((b) => typeof b?.id === 'string' && Array.isArray(b.lists))
  );
}

/** Appends a note to the end of the target list, as adding a card in the app does. */
export function addNoteToWorkspace(
  workspace: unknown,
  note: { title: string; content: string },
  target: NoteTarget | null,
): { workspace: Workspace; board: Board; list: BoardList } | null {
  if (!looksLikeWorkspace(workspace)) return null;
  const place = resolveTarget(workspace, target);
  if (!place) return null;
  const card = { ...createNote(place.board.id, place.list.id, note.title), content: note.content };
  return { workspace: { ...workspace, cards: [...workspace.cards, card] }, ...place };
}

/** Deep link that opens the bot and sends "/start <code>". */
export function telegramStartLink(botUsername: string, code: string): string {
  return `https://t.me/${botUsername.replace(/^@/, '')}?start=${encodeURIComponent(code)}`;
}
