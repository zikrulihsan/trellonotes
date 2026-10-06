/** jsdom has no matchMedia, so tests get one that answers max-width queries. */
let width = 1280;
const queries = new Set<{ query: string; listeners: Set<() => void> }>();
const matches = (query: string) => {
  const max = /max-width:\s*(\d+)px/.exec(query);
  return max ? width <= Number(max[1]) : false;
};
export function setScreenWidth(next: number) {
  width = next;
  for (const { listeners } of queries) for (const listener of listeners) listener();
}
window.matchMedia = (query: string) => {
  const entry = { query, listeners: new Set<() => void>() };
  queries.add(entry);
  return {
    get matches() {
      return matches(query);
    },
    media: query,
    onchange: null,
    addEventListener: (_: string, listener: () => void) => entry.listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => entry.listeners.delete(listener),
    addListener: (listener: () => void) => entry.listeners.add(listener),
    removeListener: (listener: () => void) => entry.listeners.delete(listener),
    dispatchEvent: () => false,
  } as unknown as MediaQueryList;
};
