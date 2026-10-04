import type { Board, Label, Note, Page } from './types';
export function createBoard(title: string): Board {
  return {
    id: crypto.randomUUID(),
    title: title.trim(),
    description: 'Initiatives in progress, and the updates that move them along.',
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
    tag: '',
    updatedAt: Date.now(),
  };
}
export function createLabel(name: string, color: string): Label {
  return { id: crypto.randomUUID(), name: name.trim(), color };
}
export function createPage(start: Partial<Pick<Page, 'title' | 'content'>> = {}): Page {
  return { id: crypto.randomUUID(), title: '', content: '', ...start, updatedAt: Date.now() };
}
