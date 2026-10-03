import { createContext, type Dispatch, type SetStateAction } from 'react';
export type WorkspaceDialog =
  | { kind: 'create-board' }
  | { kind: 'create-list'; boardId: string }
  | { kind: 'create-note'; boardId: string; listId: string }
  | { kind: 'rename-board' | 'delete-board'; boardId: string; title: string }
  | { kind: 'rename-list' | 'delete-list'; boardId: string; listId: string; title: string }
  | { kind: 'delete-note'; boardId: string; noteId: string; title: string };
export interface UIState {
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
  dialog: WorkspaceDialog | null;
  openDialog: (dialog: WorkspaceDialog) => void;
  closeDialog: () => void;
}
export const UIContext = createContext<UIState | null>(null);
