import { describe, expect, it } from 'vitest';
import { isWorkspace, loadWorkspace, saveWorkspace, STORAGE_KEY } from './storage';
import { seedWorkspace } from '@/features/workspace/seed';
describe('browser storage compatibility', () => {
  it('keeps existing v1 notes and their legacy card fields intact', () => {
    const state = seedWorkspace();
    state.cards[0].content = '<p>My existing writing.</p>';
    saveWorkspace(state);
    expect(loadWorkspace()).toEqual(state);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(state);
  });
  it('recovers from malformed or unavailable storage', () => {
    localStorage.setItem(STORAGE_KEY, '{bad JSON');
    expect(loadWorkspace().boards[0].id).toBe('writing-room');
    expect(
      loadWorkspace({
        getItem() {
          throw new Error('Blocked');
        },
      }).boards,
    ).toHaveLength(1);
  });
  it('rejects orphan notes and duplicate IDs', () => {
    const state = seedWorkspace();
    state.cards[0].boardId = 'missing';
    expect(isWorkspace(state)).toBe(false);
    const duplicate = seedWorkspace();
    duplicate.cards.push({ ...duplicate.cards[0] });
    expect(isWorkspace(duplicate)).toBe(false);
  });
});
