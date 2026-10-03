import type { Board, BoardList, Note, Workspace } from '@/features/workspace/types';
import { seedWorkspace } from '@/features/workspace/seed';
export const STORAGE_KEY = 'folio.workspace.v1';
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
function isList(value: unknown): value is BoardList {
  return isRecord(value) && typeof value.id === 'string' && typeof value.title === 'string';
}
function isBoard(value: unknown): value is Board {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    typeof value.color === 'string' &&
    Array.isArray(value.lists) &&
    value.lists.every(isList)
  );
}
function isNote(value: unknown): value is Note {
  return (
    isRecord(value) &&
    ['id', 'boardId', 'listId', 'title', 'content', 'tag'].every(
      (key) => typeof value[key] === 'string',
    ) &&
    typeof value.updatedAt === 'number' &&
    Number.isFinite(value.updatedAt) &&
    (value.labelColor === undefined || typeof value.labelColor === 'string')
  );
}
export function isWorkspace(value: unknown): value is Workspace {
  if (
    !isRecord(value) ||
    !Array.isArray(value.boards) ||
    !value.boards.length ||
    !value.boards.every(isBoard) ||
    !Array.isArray(value.cards) ||
    !value.cards.every(isNote)
  )
    return false;
  const boards = value.boards,
    cards = value.cards;
  const boardIds = boards.map((b) => b.id),
    noteIds = cards.map((c) => c.id);
  if (
    new Set(boardIds).size !== boardIds.length ||
    new Set(noteIds).size !== noteIds.length ||
    boards.some((b) => new Set(b.lists.map((l) => l.id)).size !== b.lists.length)
  )
    return false;
  return cards.every((c) =>
    boards.find((b) => b.id === c.boardId)?.lists.some((l) => l.id === c.listId),
  );
}
export function loadWorkspace(storage: Pick<Storage, 'getItem'> = localStorage): Workspace {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) {
      const value: unknown = JSON.parse(raw);
      if (isWorkspace(value)) return value;
    }
  } catch {
    /* Malformed or unavailable browser storage must not crash the editor. */
  }
  return seedWorkspace();
}
export function saveWorkspace(
  workspace: Workspace,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(workspace));
}
