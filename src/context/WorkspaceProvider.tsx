import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { useAuth } from '@/context/auth-context';
import { workspaceReducer } from '@/features/workspace/reducer';
import { createBoard, createLabel, createNote, createPage } from '@/features/workspace/factories';
import { withLabels } from '@/features/workspace/labels';
import { mergeWorkspaces } from '@/features/workspace/merge';
import {
  hasUnsyncedChanges,
  isWorkspace,
  loadSyncBase,
  loadWorkspace,
  saveSyncBase,
  saveWorkspace,
  setUnsyncedChanges,
  workspaceStorageKey,
  type SyncBase,
} from '@/lib/storage';
import { supabase } from '@/lib/supabase/client';
import { fetchCloudWorkspace, writeCloudWorkspace } from '@/lib/supabase/workspace-store';
import { createWorkspaceSaver, type WorkspaceSaver } from '@/lib/workspace-saver';
import type { Workspace } from '@/features/workspace/types';
import {
  WorkspaceActionsContext,
  WorkspaceStateContext,
  type WorkspaceActions,
} from './workspace-context';
type SyncStatus = 'local' | 'loading' | 'syncing' | 'synced' | 'error';
export function WorkspaceProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const userId = user?.id;
  const client = userId ? supabase : null;
  const cloudEnabled = Boolean(client);
  const storageKey = workspaceStorageKey(userId);
  const [workspace, dispatch] = useReducer(workspaceReducer, storageKey, (key) =>
    withLabels(loadWorkspace(localStorage, key)),
  );
  const [saveError, setSaveError] = useState(false);
  const [firstLoadDone, setFirstLoadDone] = useState(!cloudEnabled);
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(cloudEnabled ? 'loading' : 'local');
  const stateRef = useRef(workspace);
  // The workspace the cloud is known to hold; anything else on screen still needs saving.
  // The local copy only counts as synced when no earlier session left changes behind.
  const syncedRef = useRef<Workspace | null>(hasUnsyncedChanges(storageKey) ? null : workspace);
  // The last cloud version this device saw, used to merge with other devices' edits.
  const baseRef = useRef<SyncBase | null>(loadSyncBase(storageKey));
  const cloudLoadedRef = useRef(false);
  const saverRef = useRef<WorkspaceSaver | null>(null);
  useLayoutEffect(() => {
    stateRef.current = workspace;
    cloudLoadedRef.current = cloudLoaded;
  }, [workspace, cloudLoaded]);

  useEffect(() => {
    if (!client || !userId) return;
    const setBase = (base: SyncBase) => {
      baseRef.current = base;
      saveSyncBase(storageKey, base);
    };
    const saver = createWorkspaceSaver({
      async save(sent) {
        let base = baseRef.current,
          next = sent;
        for (let attempt = 0; attempt < 5; attempt++) {
          const version = await writeCloudWorkspace(client, userId, next, base?.version ?? null);
          if (version) {
            setBase({ workspace: next, version });
            return next;
          }
          // Another device saved first: merge its copy with ours and try again.
          const remote = await fetchCloudWorkspace(client, userId);
          if (!remote) {
            base = null;
            continue;
          }
          if (!isWorkspace(remote.workspace))
            throw new Error('The saved workspace data is invalid.');
          const theirs = withLabels(remote.workspace);
          next = mergeWorkspaces(base?.workspace ?? null, next, theirs);
          base = { workspace: theirs, version: remote.version };
        }
        throw new Error('The workspace kept changing on another device.');
      },
      onSaved(stored, sent) {
        syncedRef.current = stored;
        const current = stateRef.current;
        if (stored !== sent) {
          // The cloud now holds a merge; bring in the other device's edits, keeping any typed since.
          const next = current === sent ? stored : mergeWorkspaces(sent, current, stored);
          dispatch({ type: 'workspace/replace', workspace: next });
          if (next !== stored) return;
        } else if (current !== stored) return;
        setUnsyncedChanges(storageKey, false);
        setSyncStatus('synced');
      },
      onError: () => setSyncStatus('error'),
    });
    saverRef.current = saver;
    // Send pending edits right away when the tab is hidden or closed.
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') saver.flush();
    };
    document.addEventListener('visibilitychange', flushWhenHidden);
    window.addEventListener('pagehide', saver.flush);
    return () => {
      document.removeEventListener('visibilitychange', flushWhenHidden);
      window.removeEventListener('pagehide', saver.flush);
      saver.flush();
      saver.dispose();
      saverRef.current = null;
    };
  }, [client, userId, storageKey]);

  useEffect(() => {
    if (!client || !userId) return;
    let active = true;
    let retry: number | undefined;
    const load = async (attempt: number) => {
      try {
        const remote = await fetchCloudWorkspace(client, userId);
        if (!active) return;
        if (remote && !isWorkspace(remote.workspace)) {
          // Never overwrite cloud data this version of the app cannot read.
          setSyncStatus('error');
          setFirstLoadDone(true);
          return;
        }
        if (!hasUnsyncedChanges(storageKey)) {
          if (remote) {
            const base = {
              workspace: withLabels(remote.workspace as Workspace),
              version: remote.version,
            };
            baseRef.current = base;
            saveSyncBase(storageKey, base);
            syncedRef.current = base.workspace;
            dispatch({ type: 'workspace/replace', workspace: base.workspace });
            setSyncStatus('synced');
          } else {
            // No cloud copy yet: upload this device's workspace.
            baseRef.current = null;
            syncedRef.current = null;
            setSyncStatus('syncing');
          }
        } else {
          // This device has edits the cloud never received. Saving them merges with
          // whatever other devices stored since, starting from the remembered base.
          syncedRef.current = null;
          setSyncStatus('syncing');
        }
        setCloudLoaded(true);
        setFirstLoadDone(true);
      } catch {
        if (!active) return;
        // Keep editing on this device; edits are pushed once the cloud copy loads.
        setSyncStatus('error');
        setFirstLoadDone(true);
        retry = window.setTimeout(
          () => void load(attempt + 1),
          Math.min(30_000, 2_000 * 2 ** attempt),
        );
      }
    };
    void load(0);
    return () => {
      active = false;
      window.clearTimeout(retry);
    };
  }, [client, userId, storageKey]);

  useEffect(() => {
    if (!client || !userId || !cloudLoaded) return;
    let active = true;
    // Pick up edits from other devices when coming back to this tab.
    const refresh = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const remote = await fetchCloudWorkspace(client, userId);
        const clean = saverRef.current?.isIdle() && stateRef.current === syncedRef.current;
        // With local edits pending, the next save merges instead.
        if (!active || !remote || !clean || remote.version === baseRef.current?.version) return;
        if (!isWorkspace(remote.workspace)) return;
        const base = { workspace: withLabels(remote.workspace), version: remote.version };
        baseRef.current = base;
        saveSyncBase(storageKey, base);
        syncedRef.current = base.workspace;
        dispatch({ type: 'workspace/replace', workspace: base.workspace });
      } catch {
        /* Try again the next time the tab is shown. */
      }
    };
    const onVisible = () => void refresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [client, userId, cloudLoaded, storageKey]);

  useEffect(() => {
    let active = true;
    let failed = false;
    try {
      saveWorkspace(workspace, localStorage, storageKey);
    } catch {
      failed = true;
    }
    const unsynced = cloudEnabled && workspace !== syncedRef.current;
    if (cloudEnabled) setUnsyncedChanges(storageKey, unsynced);
    const queued = unsynced && cloudLoaded && Boolean(saverRef.current);
    if (queued) saverRef.current?.queue(workspace);
    // Persistence is synchronous; report its result after this effect completes.
    queueMicrotask(() => {
      if (!active) return;
      setSaveError(failed);
      if (queued) setSyncStatus((status) => (status === 'error' ? status : 'syncing'));
    });
    return () => {
      active = false;
    };
  }, [workspace, cloudLoaded, cloudEnabled, storageKey]);
  const actions = useMemo<WorkspaceActions>(
    () => ({
      createBoard(title) {
        if (!title.trim()) throw new Error('Give the board a name');
        const board = createBoard(title);
        dispatch({ type: 'board/create', board });
        return board.id;
      },
      renameBoard(boardId, title) {
        dispatch({ type: 'board/rename', boardId, title });
      },
      deleteBoard(boardId) {
        dispatch({ type: 'board/delete', boardId });
      },
      createList(boardId, title) {
        if (!title.trim()) throw new Error('Give the list a name');
        dispatch({
          type: 'list/create',
          boardId,
          list: { id: crypto.randomUUID(), title: title.trim() },
        });
      },
      renameList(boardId, listId, title) {
        dispatch({ type: 'list/rename', boardId, listId, title });
      },
      deleteList(boardId, listId) {
        dispatch({ type: 'list/delete', boardId, listId });
      },
      createNote(boardId, listId, title) {
        const board = stateRef.current.boards.find((b) => b.id === boardId);
        if (!board?.lists.some((l) => l.id === listId) || !title.trim() || title.length > 150)
          throw new Error('Choose an existing board and list, and a title of 1–150 characters');
        const note = createNote(boardId, listId, title);
        dispatch({ type: 'note/create', note });
        return note;
      },
      updateNote(noteId, patch) {
        dispatch({ type: 'note/update', noteId, patch, timestamp: Date.now() });
      },
      moveNote(noteId, listId, beforeId) {
        dispatch({ type: 'note/move', noteId, listId, beforeId });
      },
      deleteNote(noteId) {
        dispatch({ type: 'note/delete', noteId });
      },
      createLabel(name, color) {
        if (!name.trim()) throw new Error('Give the label a name');
        const label = createLabel(name, color);
        dispatch({ type: 'label/create', label });
        return label.id;
      },
      updateLabel(labelId, patch) {
        dispatch({ type: 'label/update', labelId, patch });
      },
      deleteLabel(labelId) {
        dispatch({ type: 'label/delete', labelId });
      },
      createPage(start) {
        const page = createPage(start);
        dispatch({ type: 'page/create', page });
        return page.id;
      },
      updatePage(pageId, patch) {
        dispatch({ type: 'page/update', pageId, patch, timestamp: Date.now() });
      },
      setPagePublished(pageId, published) {
        dispatch({ type: 'page/publish', pageId, published });
      },
      deletePage(pageId) {
        dispatch({ type: 'page/delete', pageId });
      },
      updateScratch(content) {
        dispatch({ type: 'scratch/update', content, timestamp: Date.now() });
      },
      keepScratchAsPage(title) {
        const page = createPage({ title, content: stateRef.current.scratch?.content ?? '' });
        dispatch({ type: 'page/create', page });
        dispatch({ type: 'scratch/update', content: '', timestamp: Date.now() });
        return page.id;
      },
      async finishSync() {
        if (!cloudEnabled || stateRef.current === syncedRef.current) return true;
        const saver = saverRef.current;
        if (!cloudLoadedRef.current || !saver) return false;
        saver.queue(stateRef.current);
        return saver.whenIdle();
      },
    }),
    [cloudEnabled],
  );
  const state = useMemo(
    () => ({ workspace, saveError: saveError || syncStatus === 'error', syncStatus, cloudEnabled }),
    [workspace, saveError, syncStatus, cloudEnabled],
  );
  if (!firstLoadDone) {
    return (
      <div className="auth-loading" role="status">
        <span>Syncing your writing room…</span>
      </div>
    );
  }
  return (
    <WorkspaceActionsContext.Provider value={actions}>
      <WorkspaceStateContext.Provider value={state}>{children}</WorkspaceStateContext.Provider>
    </WorkspaceActionsContext.Provider>
  );
}
