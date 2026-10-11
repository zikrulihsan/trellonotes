import { describe, expect, it } from 'vitest';
import { createBoard } from './factories';
import { BOARD_TEMPLATES } from './templates';

describe('board templates', () => {
  it('starts a board with the lists of its template', () => {
    const board = createBoard(' Job search ', 'job-hunt');
    expect(board.title).toBe('Job search');
    expect(board.lists.map((list) => list.title)).toEqual([
      'Wishlist',
      'Applied',
      'Interviewing',
      'Offer',
      'Closed',
    ]);
    expect(new Set(board.lists.map((list) => list.id)).size).toBe(5);
  });

  it('falls back to a blank board', () => {
    expect(createBoard('Anything').lists.map((list) => list.title)).toEqual([
      'To do',
      'Doing',
      'Done',
    ]);
    expect(createBoard('Anything', 'missing').lists).toHaveLength(3);
  });

  it('offers more than writing', () => {
    expect(BOARD_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    expect(new Set(BOARD_TEMPLATES.map((template) => template.id)).size).toBe(
      BOARD_TEMPLATES.length,
    );
  });
});
