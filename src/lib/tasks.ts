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

/** Drops checked items (and anything nested under them); a list left empty is removed. */
export function removeDoneTasks(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('li[data-type="taskItem"][data-checked="true"]').forEach((item) => {
    item.remove();
  });
  doc.querySelectorAll('ul[data-type="taskList"]').forEach((list) => {
    if (!list.querySelector('li')) list.remove();
  });
  return doc.body.innerHTML;
}

/** The text of each unchecked item, in order, e.g. for a preview of what is left. */
export function openTasks(html: string): string[] {
  if (!html.includes('data-type="taskItem"')) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return [...doc.querySelectorAll('li[data-type="taskItem"][data-checked="false"]')]
    .map((item) => item.querySelector(':scope > div > p, :scope > p')?.textContent?.trim() ?? '')
    .filter(Boolean);
}
