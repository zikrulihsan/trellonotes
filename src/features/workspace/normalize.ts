import { plainText } from '@/lib/text';
import { withLabels } from './labels';
import type { Workspace } from './types';

/** Same id on every device, so devices moving the old list separately still agree. */
export const LEGACY_TODO_ID = 'todo-standing-list';

/**
 * The single standing to-do list (`todo`) came before To-do lists. Moves it into
 * `todos` as a list titled "To-do", or drops it when it holds no tasks.
 */
export function withTodoLists(workspace: Workspace): Workspace {
  if (!workspace.todo) return workspace;
  const { todo, ...rest } = workspace;
  const todos = rest.todos ?? [];
  if (!plainText(todo.content) || todos.some((list) => list.id === LEGACY_TODO_ID)) return rest;
  return {
    ...rest,
    todos: [
      { id: LEGACY_TODO_ID, title: 'To-do', content: todo.content, updatedAt: todo.updatedAt },
      ...todos,
    ],
  };
}

/** Brings a workspace saved by an older version up to the current shape. */
export const normalizeWorkspace = (workspace: Workspace) => withTodoLists(withLabels(workspace));
