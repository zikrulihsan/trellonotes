/**
 * Remembers what public pages loaded, in memory and in this browser's storage, so moving
 * between Me, Blog and articles, or coming back later, shows the last copy at once while
 * a fresh one loads. Visitors only ever get back what they were already shown.
 */
const memory = new Map<string, unknown>();
const PREFIX = 'notis:public:';
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export function readCached<T>(key: string): { data: T } | undefined {
  if (memory.has(key)) return { data: memory.get(key) as T };
  try {
    const stored = localStorage.getItem(PREFIX + key);
    if (!stored) return undefined;
    const { at, data } = JSON.parse(stored) as { at: number; data: T };
    if (Date.now() - at > MAX_AGE) return undefined;
    memory.set(key, data);
    return { data };
  } catch {
    return undefined;
  }
}

export function writeCached(key: string, data: unknown) {
  memory.set(key, data);
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // Storage full or blocked: the in-memory copy still helps this visit.
  }
}

/** Forgets everything, for tests. */
export function clearCached() {
  memory.clear();
  try {
    for (const key of Object.keys(localStorage))
      if (key.startsWith(PREFIX)) localStorage.removeItem(key);
  } catch {
    /* nothing stored */
  }
}
