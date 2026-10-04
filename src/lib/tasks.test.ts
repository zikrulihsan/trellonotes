import { describe, expect, it } from 'vitest';
import { EMPTY_CHECKLIST, openTasks, removeDoneTasks, taskProgress } from './tasks';

describe('taskProgress', () => {
  it('is zero for writing without a checklist', () => {
    expect(taskProgress('<p>Hello</p><ul><li><p>bullet</p></li></ul>')).toEqual({
      done: 0,
      total: 0,
    });
  });
  it('counts checked and unchecked items, including nested ones', () => {
    const html =
      '<ul data-type="taskList">' +
      '<li data-type="taskItem" data-checked="true"><p>a</p></li>' +
      '<li data-type="taskItem" data-checked="false"><p>b</p>' +
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>c</p></li></ul>' +
      '</li></ul>';
    expect(taskProgress(html)).toEqual({ done: 2, total: 3 });
  });
  it('sees one open item in an empty checklist', () => {
    expect(taskProgress(EMPTY_CHECKLIST)).toEqual({ done: 0, total: 1 });
  });
});

describe('removeDoneTasks', () => {
  it('keeps open items and the text around the list', () => {
    const html =
      '<p>Week</p><ul data-type="taskList">' +
      '<li data-type="taskItem" data-checked="true"><p>a</p></li>' +
      '<li data-type="taskItem" data-checked="false"><p>b</p></li></ul>';
    expect(removeDoneTasks(html)).toBe(
      '<p>Week</p><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>b</p></li></ul>',
    );
  });
  it('removes a list once every item in it is done', () => {
    const html =
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>a</p></li></ul>';
    expect(removeDoneTasks(html)).toBe('');
  });
});

describe('openTasks', () => {
  it('lists unchecked items in order, skipping done and empty ones', () => {
    const html =
      '<ul data-type="taskList">' +
      '<li data-type="taskItem" data-checked="false"><p>Reply</p></li>' +
      '<li data-type="taskItem" data-checked="true"><p>Done</p></li>' +
      '<li data-type="taskItem" data-checked="false"><p></p></li>' +
      '<li data-type="taskItem" data-checked="false"><p>Pick cover</p></li></ul>';
    expect(openTasks(html)).toEqual(['Reply', 'Pick cover']);
  });
});
