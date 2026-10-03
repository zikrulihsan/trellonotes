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
import { createBoard, createNote } from '@/features/workspace/factories';
import { isWorkspace, loadWorkspace, saveWorkspace } from '@/lib/storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import {
  WorkspaceActionsContext,
  WorkspaceStateContext,
  type WorkspaceActions,
} from './workspace-context';
export function WorkspaceProvider({ children }: PropsWithChildren) {
  const [workspace, dispatch] = useReducer(workspaceReducer, undefined, loadWorkspace);
  const [saveError, setSaveError] = useState(false);
  const { user } = useAuth();
  const userId = user?.id;
  const cloudEnabled = isSupabaseConfigured && Boolean(supabase && user);
  const [remoteReady, setRemoteReady] = useState(!cloudEnabled);
  const [syncStatus, setSyncStatus] = useState<
    'local' | 'loading' | 'syncing' | 'synced' | 'error'
  >(cloudEnabled ? 'loading' : 'local');
  const stateRef = useRef(workspace);
  useLayoutEffect(() => {
    stateRef.current = workspace;
  }, [workspace]);

  useEffect(() => {
    if (!cloudEnabled || !userId || !supabase) return;
    let active = true;
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('trellonotes_workspaces')
          .select('workspace')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) throw error;
        if (!active) return;
        if (data?.workspace !== undefined) {
          if (!isWorkspace(data.workspace)) throw new Error('The saved workspace data is invalid.');
          dispatch({ type: 'workspace/replace', workspace: data.workspace });
          try {
            saveWorkspace(data.workspace);
          } catch {
            setSaveError(true);
          }
        }
        setSyncStatus(data ? 'synced' : 'syncing');
        setRemoteReady(true);
      } catch {
        if (!active) return;
        setSyncStatus('error');
        setRemoteReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [cloudEnabled, userId]);

  useEffect(() => {
    if (!remoteReady) return;
    let active = true;
    let failed = false;
    try {
      saveWorkspace(workspace);
    } catch {
      failed = true;
    }
    // Persistence is synchronous; report its result after this effect completes.
    queueMicrotask(() => {
      if (active) setSaveError(failed);
    });
    return () => {
      active = false;
    };
  }, [workspace, remoteReady]);

  useEffect(() => {
    const client = supabase;
    if (!remoteReady || !cloudEnabled || !userId || !client) return;
    const timer = window.setTimeout(() => {
      setSyncStatus('syncing');
      void (async () => {
        try {
          const { error } = await client
            .from('trellonotes_workspaces')
            .upsert(
              { user_id: userId, workspace, updated_at: new Date().toISOString() },
              { onConflict: 'user_id' },
            );
          setSyncStatus(error ? 'error' : 'synced');
        } catch {
          setSyncStatus('error');
        }
      })();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [workspace, remoteReady, cloudEnabled, userId]);
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
    }),
    [],
  );
  const state = useMemo(
    () => ({ workspace, saveError: saveError || syncStatus === 'error', syncStatus, cloudEnabled }),
    [workspace, saveError, syncStatus, cloudEnabled],
  );
  if (!remoteReady) {
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
