import { isWorkspace } from '@/lib/storage';
import type { Board, Label, Note, Page, Workspace } from './types';

type Entity = { id: string };

/** Compares values structurally, ignoring key order (the cloud stores JSON with its own key order). */
function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((value, i) => same(value, b[i]));
  const left = a as Record<string, unknown>,
    right = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].every((key) => same(left[key], right[key]));
}

/** Field-by-field three-way merge: a field changed on one side wins; changed on both, `preferLocal` decides. */
function mergeFields<T extends object>(
  base: T | undefined,
  local: T,
  remote: T,
  preferLocal: boolean,
  custom: Partial<Record<keyof T, (b: unknown, l: unknown, r: unknown) => unknown>> = {},
): T {
  const result: Record<string, unknown> = {};
  const b = (base ?? {}) as Record<string, unknown>,
    l = local as Record<string, unknown>,
    r = remote as Record<string, unknown>;
  for (const key of new Set([...Object.keys(l), ...Object.keys(r)])) {
    const merge = custom[key as keyof T];
    let value: unknown;
    if (merge) value = merge(b[key], l[key], r[key]);
    else if (same(l[key], r[key])) value = l[key];
    else if (base && same(l[key], b[key])) value = r[key];
    else if (base && same(r[key], b[key])) value = l[key];
    else value = preferLocal ? l[key] : r[key];
    if (value !== undefined) result[key] = value;
  }
  return result as T;
}

/** Order follows whichever side reordered; anything missing from that order keeps the other side's order. */
function mergeOrder(
  base: Entity[],
  local: Entity[],
  remote: Entity[],
  keep: Set<string>,
): string[] {
  const ids = (list: Entity[]) => list.map((item) => item.id);
  const localMoved = !same(
    ids(local).filter((id) => base.some((item) => item.id === id)),
    ids(base).filter((id) => local.some((item) => item.id === id)),
  );
  const [primary, secondary] = localMoved ? [local, remote] : [remote, local];
  const order = ids(primary).filter((id) => keep.has(id));
  for (const id of ids(secondary)) if (keep.has(id) && !order.includes(id)) order.push(id);
  return order;
}

function mergeById<T extends Entity>(
  base: T[] | undefined,
  local: T[],
  remote: T[],
  mergeItem: (b: T | undefined, l: T, r: T) => T,
): T[] {
  const find = (list: T[] | undefined, id: string) => list?.find((item) => item.id === id);
  const merged = new Map<string, T>();
  for (const id of new Set([...local, ...remote].map((item) => item.id))) {
    const b = find(base, id),
      l = find(local, id),
      r = find(remote, id);
    if (l && r) merged.set(id, mergeItem(b, l, r));
    // Present on one side only: it was added there (keep), or deleted on the other side.
    // A deletion wins unless the surviving side edited the item since the base.
    else if (l && (!b || !same(l, b))) merged.set(id, l);
    else if (r && (!b || !same(r, b))) merged.set(id, r);
  }
  const keep = new Set(merged.keys());
  return mergeOrder(base ?? [], local, remote, keep).map((id) => merged.get(id)!);
}

/**
 * Combines edits from this device (`local`) and another device (`remote`) that both
 * started from `base`, the last workspace they agreed on. With no base, nothing counts
 * as deleted and this device wins conflicting fields.
 */
export function mergeWorkspaces(
  base: Workspace | null,
  local: Workspace,
  remote: Workspace,
): Workspace {
  const boards = mergeById<Board>(base?.boards, local.boards, remote.boards, (b, l, r) =>
    mergeFields(b, l, r, true, {
      lists: (bl, ll, rl) =>
        mergeById(
          bl as Board['lists'] | undefined,
          ll as Board['lists'],
          rl as Board['lists'],
          (bi, li, ri) => mergeFields(bi, li, ri, true),
        ),
    }),
  );
  const cards = mergeById<Note>(base?.cards, local.cards, remote.cards, (b, l, r) =>
    mergeFields(b, l, r, l.updatedAt >= r.updatedAt, {
      updatedAt: (_b, lu, ru) => Math.max(lu as number, ru as number),
    }),
  );
  // A note edited on one device keeps its list even if another device deleted that list.
  for (const card of cards) {
    let index = boards.findIndex((item) => item.id === card.boardId);
    if (index < 0) {
      const source = [local, remote]
        .map((ws) => ws.boards.find((item) => item.id === card.boardId))
        .find(Boolean);
      if (!source) continue;
      index = boards.push({ ...source, lists: [] }) - 1;
    }
    if (boards[index].lists.some((list) => list.id === card.listId)) continue;
    const list = [local, remote]
      .flatMap((ws) => ws.boards.find((item) => item.id === card.boardId)?.lists ?? [])
      .find((item) => item.id === card.listId);
    if (list) boards[index] = { ...boards[index], lists: [...boards[index].lists, list] };
  }
  const merged: Workspace = { boards, cards };
  if (local.labels || remote.labels)
    merged.labels = mergeById<Label>(
      base?.labels,
      local.labels ?? [],
      remote.labels ?? [],
      (b, l, r) => mergeFields(b, l, r, true),
    );
  if (local.pages || remote.pages)
    merged.pages = mergeById<Page>(base?.pages, local.pages ?? [], remote.pages ?? [], (b, l, r) =>
      mergeFields(b, l, r, l.updatedAt >= r.updatedAt, {
        updatedAt: (_b, lu, ru) => Math.max(lu as number, ru as number),
      }),
    );
  return isWorkspace(merged) ? merged : local;
}
