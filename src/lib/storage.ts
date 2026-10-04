import type {
  Board,
  BoardList,
  Label,
  Note,
  Page,
  Scratch,
  Workspace,
} from '@/features/workspace/types';
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
    (value.labelColor === undefined || typeof value.labelColor === 'string') &&
    (value.labelId === undefined || typeof value.labelId === 'string')
  );
}
function isLabel(value: unknown): value is Label {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.color === 'string'
  );
}
function isPage(value: unknown): value is Page {
  const published = isRecord(value) ? value.published : undefined;
  return (
    isRecord(value) &&
    ['id', 'title', 'content'].every((key) => typeof value[key] === 'string') &&
    typeof value.updatedAt === 'number' &&
    Number.isFinite(value.updatedAt) &&
    (published === undefined ||
      (isRecord(published) &&
        typeof published.slug === 'string' &&
        typeof published.at === 'number'))
  );
}
function isScratch(value: unknown): value is Scratch {
  return (
    isRecord(value) &&
    typeof value.content === 'string' &&
    typeof value.updatedAt === 'number' &&
    Number.isFinite(value.updatedAt)
  );
}
const isOptionalList = <T>(value: unknown, check: (item: unknown) => item is T) =>
  value === undefined || (Array.isArray(value) && value.every(check));
export function isWorkspace(value: unknown): value is Workspace {
  if (
    !isRecord(value) ||
    !Array.isArray(value.boards) ||
    !value.boards.length ||
    !value.boards.every(isBoard) ||
    !Array.isArray(value.cards) ||
    !value.cards.every(isNote) ||
    !isOptionalList(value.labels, isLabel) ||
    !isOptionalList(value.pages, isPage) ||
    (value.scratch !== undefined && !isScratch(value.scratch))
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
/** Signed-in users each get their own copy so accounts on one browser never mix. */
export function workspaceStorageKey(userId?: string): string {
  return userId ? `${STORAGE_KEY}.${userId}` : STORAGE_KEY;
}
export function loadWorkspace(
  storage: Pick<Storage, 'getItem'> = localStorage,
  key = STORAGE_KEY,
): Workspace {
  try {
    const raw = storage.getItem(key);
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
  key = STORAGE_KEY,
): void {
  storage.setItem(key, JSON.stringify(workspace));
}
/**
 * Marks that this device holds changes the cloud has not confirmed yet, so a
 * reload or closed tab pushes them instead of replacing them with the older cloud copy.
 */
export function hasUnsyncedChanges(key: string): boolean {
  try {
    return localStorage.getItem(`${key}.unsynced`) === '1';
  } catch {
    return false;
  }
}
export function setUnsyncedChanges(key: string, unsynced: boolean): void {
  try {
    if (unsynced) localStorage.setItem(`${key}.unsynced`, '1');
    else localStorage.removeItem(`${key}.unsynced`);
  } catch {
    /* The workspace save itself reports storage failures. */
  }
}
/** The last workspace this device and the cloud agreed on, and the cloud version it came from. */
export interface SyncBase {
  workspace: Workspace;
  version: string;
}
export function loadSyncBase(key: string): SyncBase | null {
  try {
    const raw = localStorage.getItem(`${key}.base`);
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (isRecord(value) && typeof value.version === 'string' && isWorkspace(value.workspace))
      return { workspace: value.workspace, version: value.version };
  } catch {
    /* Without a base, the next sync merges without detecting deletions. */
  }
  return null;
}
export function saveSyncBase(key: string, base: SyncBase): void {
  try {
    localStorage.setItem(`${key}.base`, JSON.stringify(base));
  } catch {
    /* The workspace save itself reports storage failures. */
  }
}
