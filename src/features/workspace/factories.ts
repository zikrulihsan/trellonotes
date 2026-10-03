import type { Board, Note } from './types';
export function createBoard(title: string): Board {
  return {
    id: crypto.randomUUID(),
    title: title.trim(),
    description: 'A space for notes, thoughts, and things in progress.',
    color: '#a78bfa',
    lists: ['Ideas', 'Writing', 'Keep coming back'].map((title) => ({
      id: crypto.randomUUID(),
      title,
    })),
  };
}
export function createNote(boardId: string, listId: string, title: string): Note {
  return {
    id: crypto.randomUUID(),
    boardId,
    listId,
    title: title.trim(),
    content: '',
    tag: 'Free writing',
    updatedAt: Date.now(),
  };
}
