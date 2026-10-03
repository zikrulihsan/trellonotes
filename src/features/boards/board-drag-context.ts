import { createContext, type Dispatch, type SetStateAction } from 'react';
export interface BoardDrag {
  dragId: string | null;
  dropListId: string | null;
  setDragId: Dispatch<SetStateAction<string | null>>;
  setDropListId: Dispatch<SetStateAction<string | null>>;
  finishDrop: (listId: string, beforeId?: string) => void;
  cancel: () => void;
}
export const BoardDragContext = createContext<BoardDrag | null>(null);
