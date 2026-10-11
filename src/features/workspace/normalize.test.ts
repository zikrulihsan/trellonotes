import { describe, expect, it } from 'vitest';
import { LEGACY_TODO_ID, withTodoLists } from './normalize';
import { sampleWorkspace } from '@/test/sample-workspace';

describe('moving the standing to-do list into To-do lists', () => {
  it('turns a list with tasks into a "To-do" list', () => {
    const ws = { ...sampleWorkspace(), todo: { content: '<p>Buy coffee</p>', updatedAt: 7 } };
    const moved = withTodoLists(ws);
    expect(moved.todo).toBeUndefined();
    expect(moved.todos).toEqual([
      { id: LEGACY_TODO_ID, title: 'To-do', content: '<p>Buy coffee</p>', updatedAt: 7 },
    ]);
  });

  it('drops an empty list, and does not add it twice', () => {
    const empty = withTodoLists({ ...sampleWorkspace(), todo: { content: '', updatedAt: 1 } });
    expect(empty.todo).toBeUndefined();
    expect(empty.todos).toBeUndefined();
    const once = withTodoLists({
      ...sampleWorkspace(),
      todo: { content: '<p>a</p>', updatedAt: 1 },
    });
    const twice = withTodoLists({ ...once, todo: { content: '<p>a</p>', updatedAt: 1 } });
    expect(twice.todos).toHaveLength(1);
  });

  it('leaves current workspaces alone', () => {
    const ws = sampleWorkspace();
    expect(withTodoLists(ws)).toBe(ws);
  });
});
