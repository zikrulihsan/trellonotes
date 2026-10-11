import { describe, expect, it } from 'vitest';
import { isWorkspace, loadWorkspace, saveWorkspace, STORAGE_KEY } from './storage';
import { sampleWorkspace } from '@/test/sample-workspace';
describe('browser storage compatibility', () => {
  it('keeps existing v1 notes and their legacy card fields intact', () => {
    const state = sampleWorkspace();
    state.cards[0].content = '<p>My existing writing.</p>';
    saveWorkspace(state);
    expect(loadWorkspace()).toEqual(state);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(state);
  });
  it('recovers from malformed or unavailable storage with one empty board', () => {
    localStorage.setItem(STORAGE_KEY, '{bad JSON');
    const fresh = loadWorkspace();
    expect(fresh.boards.map((board) => board.title)).toEqual(['My board']);
    expect(fresh.boards[0].lists.map((list) => list.title)).toEqual(['To do', 'Doing', 'Done']);
    expect(fresh.cards).toEqual([]);
    expect(
      loadWorkspace({
        getItem() {
          throw new Error('Blocked');
        },
      }).boards,
    ).toHaveLength(1);
  });
  it('rejects orphan notes and duplicate IDs', () => {
    const state = sampleWorkspace();
    state.cards[0].boardId = 'missing';
    expect(isWorkspace(state)).toBe(false);
    const duplicate = sampleWorkspace();
    duplicate.cards.push({ ...duplicate.cards[0] });
    expect(isWorkspace(duplicate)).toBe(false);
  });
});
