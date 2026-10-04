/** A short date for generated titles, e.g. "4 Oct" (or "Oct 4", following the reader's language). */
export const shortDay = (now = new Date()) =>
  now.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
