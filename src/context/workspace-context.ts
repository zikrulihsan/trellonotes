import { createContext } from 'react';
import type {
  LabelPatch,
  Note,
  NotePatch,
  Page,
  PagePatch,
  Workspace,
} from '@/features/workspace/types';
export interface WorkspaceActions {
  createBoard: (title: string) => string;
  renameBoard: (boardId: string, title: string) => void;
  deleteBoard: (boardId: string) => void;
  createList: (boardId: string, title: string) => void;
  renameList: (boardId: string, listId: string, title: string) => void;
  deleteList: (boardId: string, listId: string) => void;
  createNote: (boardId: string, listId: string, title: string) => Note;
  updateNote: (noteId: string, patch: NotePatch) => void;
  moveNote: (noteId: string, listId: string, beforeId?: string) => void;
  deleteNote: (noteId: string) => void;
  createLabel: (name: string, color: string) => string;
  updateLabel: (labelId: string, patch: LabelPatch) => void;
  deleteLabel: (labelId: string) => void;
  /** Starts a page, optionally from a template's title and content. */
  createPage: (start?: Partial<Pick<Page, 'title' | 'content'>>) => string;
  updatePage: (pageId: string, patch: PagePatch) => void;
  setPagePublished: (pageId: string, published: Page['published']) => void;
  deletePage: (pageId: string) => void;
  updateScratch: (content: string) => void;
  /** Moves the free writing into a new page and clears the scratchpad; returns the page id. */
  keepScratchAsPage: (title: string) => string;
  /** Uploads pending edits; resolves false if they could not reach the cloud. */
  finishSync: () => Promise<boolean>;
}
export const WorkspaceStateContext = createContext<{
  workspace: Workspace;
  saveError: boolean;
  syncStatus: 'local' | 'loading' | 'syncing' | 'synced' | 'error';
  cloudEnabled: boolean;
} | null>(null);
export const WorkspaceActionsContext = createContext<WorkspaceActions | null>(null);
