import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { workspaceReducer } from '@/features/workspace/reducer';
import { createBoard, createNote } from '@/features/workspace/factories';
import { loadWorkspace, saveWorkspace } from '@/lib/storage';
import {
  WorkspaceActionsContext,
  WorkspaceStateContext,
  type WorkspaceActions,
} from './workspace-context';
export function WorkspaceProvider({ children }: PropsWithChildren) {
  const [workspace, dispatch] = useReducer(workspaceReducer, undefined, loadWorkspace);
  const [saveError, setSaveError] = useState(false);
  const stateRef = useRef(workspace);
  useLayoutEffect(() => {
    stateRef.current = workspace;
  }, [workspace]);
  useEffect(() => {
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
  }, [workspace]);
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
  const state = useMemo(() => ({ workspace, saveError }), [workspace, saveError]);
  return (
    <WorkspaceActionsContext.Provider value={actions}>
      <WorkspaceStateContext.Provider value={state}>{children}</WorkspaceStateContext.Provider>
    </WorkspaceActionsContext.Provider>
  );
}
