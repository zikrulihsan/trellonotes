import { describe, expect, it } from 'vitest';
import { mergeWorkspaces } from './merge';
import { seedWorkspace } from './seed';
import type { Workspace } from './types';

const clone = (ws: Workspace): Workspace => structuredClone(ws);

describe('merging edits from two devices', () => {
  it('keeps lists and notes added on both devices', () => {
    const base = seedWorkspace();
    const local = clone(base),
      remote = clone(base);
    local.boards[0].lists.push({ id: 'local-list', title: 'Drafts' });
    remote.boards[0].lists.push({ id: 'remote-list', title: 'Published' });
    remote.cards.push({ ...base.cards[0], id: 'remote-note', title: 'From my phone' });
    const merged = mergeWorkspaces(base, local, remote);
    expect(merged.boards[0].lists.map((l) => l.id)).toEqual(
      expect.arrayContaining(['local-list', 'remote-list']),
    );
    expect(merged.cards.some((c) => c.id === 'remote-note')).toBe(true);
  });

  it('combines different edits to the same note and takes the newer writing on a clash', () => {
    const base = seedWorkspace();
    const local = clone(base),
      remote = clone(base);
    local.cards[0] = { ...local.cards[0], title: 'Local title', updatedAt: 200 };
    remote.cards[0] = { ...remote.cards[0], labelColor: 'mint', updatedAt: 100 };
    remote.cards[1] = { ...remote.cards[1], content: '<p>remote</p>', updatedAt: 300 };
    local.cards[1] = { ...local.cards[1], content: '<p>local</p>', updatedAt: 250 };
    const merged = mergeWorkspaces(base, local, remote);
    expect(merged.cards[0]).toMatchObject({
      title: 'Local title',
      labelColor: 'mint',
      updatedAt: 200,
    });
    expect(merged.cards[1].content).toBe('<p>remote</p>');
  });

  it('applies deletions from the other device unless the item was edited here', () => {
    const base = seedWorkspace();
    const local = clone(base),
      remote = clone(base);
    remote.cards = remote.cards.filter(
      (c) => c.id !== base.cards[0].id && c.id !== base.cards[1].id,
    );
    local.cards[1] = { ...local.cards[1], title: 'Still working on this' };
    const merged = mergeWorkspaces(base, local, remote);
    expect(merged.cards.some((c) => c.id === base.cards[0].id)).toBe(false);
    expect(merged.cards.find((c) => c.id === base.cards[1].id)?.title).toBe(
      'Still working on this',
    );
  });

  it('restores a deleted list that still holds a note edited on this device', () => {
    const base = seedWorkspace();
    const note = base.cards[0];
    const local = clone(base),
      remote = clone(base);
    remote.boards[0].lists = remote.boards[0].lists.filter((l) => l.id !== note.listId);
    remote.cards = remote.cards.filter((c) => c.listId !== note.listId);
    local.cards[0] = { ...local.cards[0], content: '<p>new thoughts</p>' };
    const merged = mergeWorkspaces(base, local, remote);
    expect(merged.boards[0].lists.some((l) => l.id === note.listId)).toBe(true);
    expect(merged.cards.find((c) => c.id === note.id)?.content).toBe('<p>new thoughts</p>');
  });

  it('keeps a note moved on this device in its new place', () => {
    const base = seedWorkspace();
    const local = clone(base),
      remote = clone(base);
    const [first] = local.cards.splice(0, 1);
    local.cards.push({ ...first, listId: base.boards[0].lists[1].id });
    remote.cards[2] = { ...remote.cards[2], title: 'Renamed elsewhere' };
    const merged = mergeWorkspaces(base, local, remote);
    expect(merged.cards.at(-1)).toMatchObject({ id: first.id, listId: base.boards[0].lists[1].id });
    expect(merged.cards.find((c) => c.id === base.cards[2].id)?.title).toBe('Renamed elsewhere');
  });

  it('keeps the newer free writing, and free writing that exists on one device only', () => {
    const base = seedWorkspace();
    const local = clone(base),
      remote = clone(base);
    local.scratch = { content: '<p>laptop</p>', updatedAt: 100 };
    expect(mergeWorkspaces(base, local, remote).scratch).toEqual(local.scratch);
    remote.scratch = { content: '<p>phone</p>', updatedAt: 200 };
    expect(mergeWorkspaces(base, local, remote).scratch).toEqual(remote.scratch);
  });

  it('keeps to-do lists added on both devices and the newer edit to the same list', () => {
    const base = {
      ...seedWorkspace(),
      todos: [{ id: 't1', title: 'Launch', content: '', updatedAt: 1 }],
    };
    const local = clone(base),
      remote = clone(base);
    local.todos!.push({ id: 't2', title: 'Groceries', content: '', updatedAt: 5 });
    remote.todos![0] = { ...remote.todos![0], content: '<p>phone</p>', updatedAt: 9 };
    local.todos![0] = { ...local.todos![0], content: '<p>laptop</p>', updatedAt: 3 };
    const merged = mergeWorkspaces(base, local, remote);
    expect(merged.todos?.map((t) => t.id).sort()).toEqual(['t1', 't2']);
    expect(merged.todos?.find((t) => t.id === 't1')?.content).toBe('<p>phone</p>');
  });

  it('treats the cloud copy key order as unchanged', () => {
    const base = seedWorkspace();
    const reordered = JSON.parse(
      JSON.stringify(base, (_key, value: unknown) =>
        value && typeof value === 'object' && !Array.isArray(value)
          ? Object.fromEntries(Object.entries(value).reverse())
          : value,
      ),
    ) as Workspace;
    const local = clone(base);
    local.cards[0] = { ...local.cards[0], title: 'Edited here' };
    expect(mergeWorkspaces(base, local, reordered).cards[0].title).toBe('Edited here');
  });
});
