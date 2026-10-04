/** Counts the checklist items in a piece of writing, e.g. { done: 2, total: 5 }. */
export function taskProgress(html: string): { done: number; total: number } {
  if (!html.includes('data-type="taskItem"')) return { done: 0, total: 0 };
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const items = doc.querySelectorAll('li[data-type="taskItem"]');
  const done = doc.querySelectorAll('li[data-type="taskItem"][data-checked="true"]');
  return { done: done.length, total: items.length };
}

/** An empty checklist, ready for the first item. */
export const EMPTY_CHECKLIST =
  '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p></p></li></ul>';
