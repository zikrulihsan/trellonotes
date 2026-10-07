import { createContext } from 'react';
export type WorkspaceDialog =
  | { kind: 'create-board' }
  | { kind: 'manage-labels' }
  | { kind: 'telegram' }
  | { kind: 'create-list'; boardId: string }
  | { kind: 'create-note'; boardId: string; listId: string }
  | { kind: 'rename-board' | 'delete-board'; boardId: string; title: string }
  | { kind: 'rename-list' | 'delete-list'; boardId: string; listId: string; title: string }
  | { kind: 'delete-note'; boardId: string; noteId: string; title: string };
export interface UIState {
  /** Phones get the sidebar as a drawer over the page; wider screens dock it. */
  narrowScreen: boolean;
  /** Whether the sidebar is on screen right now, as a drawer or docked. */
  sidebarVisible: boolean;
  toggleSidebar: () => void;
  showSidebar: () => void;
  hideSidebar: () => void;
  /** Closes the phone drawer and leaves the docked sidebar as it is. */
  closeSidebarDrawer: () => void;
  dialog: WorkspaceDialog | null;
  openDialog: (dialog: WorkspaceDialog) => void;
  closeDialog: () => void;
}
export const UIContext = createContext<UIState | null>(null);
