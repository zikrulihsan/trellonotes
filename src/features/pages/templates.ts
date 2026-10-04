import { EMPTY_CHECKLIST } from '@/lib/tasks';

/** A short date for generated titles, e.g. "4 Oct" (or "Oct 4", following the reader's language). */
export const shortDay = (now = new Date()) =>
  now.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** A page that opens as a checklist, titled with today's date, e.g. "To-do · 4 Oct". */
export function todoPage(now = new Date()) {
  return { title: `To-do · ${shortDay(now)}`, content: EMPTY_CHECKLIST };
}
