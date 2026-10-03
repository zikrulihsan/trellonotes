import { describe, expect, it } from 'vitest';
import { workspaceReducer } from './reducer';
import { seedWorkspace } from './seed';
function fixture() {
  const state = seedWorkspace();
  state.cards[0].updatedAt = 1000;
  return state;
}
describe('writing workspace invariants', () => {
  it('moves and reorders a note without changing its writing timestamp', () => {
    const initial = fixture();
    const moved = workspaceReducer(initial, {
      type: 'note/move',
      noteId: 'small',
      listId: 'drafting',
      beforeId: 'attention',
    });
    expect(moved.cards.find((note) => note.id === 'small')).toMatchObject({
      listId: 'drafting',
      updatedAt: 1000,
    });
    const draftIds = moved.cards
      .filter((note) => note.listId === 'drafting')
      .map((note) => note.id);
    expect(draftIds).toEqual(['small', 'attention', 'notebook']);
    expect(initial.cards[0].listId).toBe('ideas');
  });
  it('rejects unknown lists and cross-board moves', () => {
    const initial = fixture();
    expect(
      workspaceReducer(initial, { type: 'note/move', noteId: 'small', listId: 'missing' }),
    ).toBe(initial);
    const other = {
      id: 'other',
      title: 'Other',
      description: '',
      color: '#000',
      lists: [{ id: 'other-list', title: 'Notes' }],
    };
    initial.boards.push(other);
    expect(
      workspaceReducer(initial, { type: 'note/move', noteId: 'small', listId: 'other-list' }),
    ).toBe(initial);
  });
  it('updates the writing timestamp only for changed writing', () => {
    const initial = fixture();
    const label = workspaceReducer(initial, {
      type: 'note/update',
      noteId: 'small',
      patch: { labelId: 'label-essay' },
      timestamp: 2000,
    });
    expect(label.cards[0].updatedAt).toBe(1000);
    const unchanged = workspaceReducer(label, {
      type: 'note/update',
      noteId: 'small',
      patch: { content: label.cards[0].content },
      timestamp: 3000,
    });
    expect(unchanged.cards[0].updatedAt).toBe(1000);
    const edited = workspaceReducer(unchanged, {
      type: 'note/update',
      noteId: 'small',
      patch: { content: '<p>New thoughts.</p>' },
      timestamp: 4000,
    });
    expect(edited.cards[0].updatedAt).toBe(4000);
  });
  it('removes only notes belonging to a deleted list', () => {
    const initial = fixture();
    const result = workspaceReducer(initial, {
      type: 'list/delete',
      boardId: 'writing-room',
      listId: 'ideas',
    });
    expect(result.cards.some((note) => note.listId === 'ideas')).toBe(false);
    expect(result.cards.some((note) => note.id === 'attention')).toBe(true);
    expect(result.boards[0].lists.map((list) => list.id)).not.toContain('ideas');
  });
  it('protects the last board from deletion', () => {
    const initial = fixture();
    expect(workspaceReducer(initial, { type: 'board/delete', boardId: 'writing-room' })).toBe(
      initial,
    );
  });
  it('cannot create orphan notes', () => {
    const initial = fixture();
    const note = { ...initial.cards[0], id: 'new', listId: 'missing' };
    expect(workspaceReducer(initial, { type: 'note/create', note })).toBe(initial);
  });
});
