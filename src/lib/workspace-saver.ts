import type { Workspace } from '@/features/workspace/types';

export interface WorkspaceSaver {
  /** Remember the newest workspace and save it after a short pause in editing. */
  queue: (workspace: Workspace) => void;
  /** Save any queued workspace now instead of waiting for the pause. */
  flush: () => void;
  /** True when nothing is queued or being saved. */
  isIdle: () => boolean;
  /** Saves everything queued; resolves true once it is stored, false if a save fails or takes too long. */
  whenIdle: (timeout?: number) => Promise<boolean>;
  /** Stop retrying. A save already in flight, and its follow-up, still complete. */
  dispose: () => void;
}

/**
 * Sends one save at a time, always with the newest workspace, so a slow older
 * request can never land after a newer one. Failed saves are retried.
 */
export function createWorkspaceSaver({
  save,
  onSaved,
  onError,
  delay = 500,
  retryDelay = 3000,
}: {
  /** Stores the workspace and resolves with what was stored (a merge, after a conflict). */
  save: (workspace: Workspace) => Promise<Workspace>;
  onSaved: (stored: Workspace, sent: Workspace) => void;
  onError: () => void;
  delay?: number;
  retryDelay?: number;
}): WorkspaceSaver {
  let latest: Workspace | null = null;
  let inFlight = false;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const settled = new Set<(ok: boolean) => void>();
  const isIdle = () => !inFlight && !latest;

  const schedule = (ms: number) => {
    clearTimeout(timer);
    timer = setTimeout(flush, ms);
  };

  function flush() {
    clearTimeout(timer);
    if (inFlight || !latest) return;
    const snapshot = latest;
    latest = null;
    inFlight = true;
    save(snapshot).then(
      (stored) => {
        inFlight = false;
        onSaved(stored, snapshot);
        if (latest) flush();
        else settled.forEach((notify) => notify(true));
      },
      () => {
        inFlight = false;
        latest ??= snapshot;
        onError();
        settled.forEach((notify) => notify(false));
        if (!disposed) schedule(retryDelay);
      },
    );
  }

  return {
    queue(workspace) {
      latest = workspace;
      if (!inFlight) schedule(delay);
    },
    flush,
    isIdle,
    whenIdle(timeout = 8000) {
      flush();
      if (isIdle()) return Promise.resolve(true);
      return new Promise((resolve) => {
        const finish = (ok: boolean) => {
          clearTimeout(timeoutId);
          settled.delete(finish);
          resolve(ok);
        };
        const timeoutId = setTimeout(() => finish(false), timeout);
        settled.add(finish);
      });
    },
    dispose() {
      disposed = true;
      clearTimeout(timer);
    },
  };
}
