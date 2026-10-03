import { useState, type PropsWithChildren } from 'react';
import { useWorkspaceActions } from '@/hooks/useWorkspace';
import { BoardDragContext } from './board-drag-context';
export function BoardDragProvider({ children }: PropsWithChildren) {
  const [dragId, setDragId] = useState<string | null>(null),
    [dropListId, setDropListId] = useState<string | null>(null),
    { moveNote } = useWorkspaceActions();
  const cancel = () => {
    setDragId(null);
    setDropListId(null);
  };
  const finishDrop = (listId: string, beforeId?: string) => {
    if (dragId) moveNote(dragId, listId, beforeId);
    cancel();
  };
  return (
    <BoardDragContext.Provider
      value={{ dragId, dropListId, setDragId, setDropListId, finishDrop, cancel }}
    >
      {children}
    </BoardDragContext.Provider>
  );
}
