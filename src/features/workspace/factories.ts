import type { Board, Label, Note, Page, TodoList } from './types';
import { templateById } from './templates';
/** A new board with the lists of the chosen template (a blank board by default). */
export function createBoard(title: string, templateId?: string): Board {
  const template = templateById(templateId);
  return {
    id: crypto.randomUUID(),
    title: title.trim(),
    description: template.hint,
    color: template.color,
    lists: template.lists.map((title) => ({ id: crypto.randomUUID(), title })),
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
export function createTodoList(): TodoList {
  return { id: crypto.randomUUID(), title: '', content: '', updatedAt: Date.now() };
}
