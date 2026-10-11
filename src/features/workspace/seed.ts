import type { Workspace } from './types';
/** A new workspace: one empty board, ready for the first card. */
export function seedWorkspace(): Workspace {
  return {
    boards: [
      {
        id: 'first-board',
        title: 'My board',
        description: 'Three plain lists for anything.',
        color: '#a78bfa',
        lists: [
          { id: 'todo', title: 'To do' },
          { id: 'doing', title: 'Doing' },
          { id: 'done', title: 'Done' },
        ],
      },
    ],
    cards: [],
  };
}
