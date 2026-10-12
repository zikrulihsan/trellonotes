import { createContext } from 'react';
import type {
  LabelPatch,
  Note,
  NotePatch,
  Page,
  PagePatch,
  SheetName,
  TodoPatch,
  Workspace,
} from '@/features/workspace/types';
export interface WorkspaceActions {
  /** Makes a board from a template (blank when none is given); returns its id. */
  createBoard: (title: string, templateId?: string) => string;
  renameBoard: (boardId: string, title: string) => void;
  deleteBoard: (boardId: string) => void;
  createList: (boardId: string, title: string) => void;
  renameList: (boardId: string, listId: string, title: string) => void;
  deleteList: (boardId: string, listId: string) => void;
  /** Says whether cards in a list count as finished in the work journal. */
  setListDone: (boardId: string, listId: string, done: boolean) => void;
  /** Saves the writer's notes on one week of the work journal. */
  updateJournal: (weekId: string, content: string) => void;
  createNote: (boardId: string, listId: string, title: string) => Note;
  updateNote: (noteId: string, patch: NotePatch) => void;
  moveNote: (noteId: string, listId: string, beforeId?: string) => void;
  deleteNote: (noteId: string) => void;
  /** Puts a card's title on the public "Now" list, or takes it off; does not count as an edit. */
  setNoteNow: (noteId: string, now: boolean) => void;
  createLabel: (name: string, color: string) => string;
  updateLabel: (labelId: string, patch: LabelPatch) => void;
  deleteLabel: (labelId: string) => void;
  /** Starts a page, optionally from a template's title and content. */
  createPage: (start?: Partial<Pick<Page, 'title' | 'content'>>) => string;
  updatePage: (pageId: string, patch: PagePatch) => void;
  setPagePublished: (pageId: string, published: Page['published']) => void;
  /** Pins a page to the top of the Pages list, or unpins it; does not count as an edit. */
  setPagePinned: (pageId: string, pinned: boolean) => void;
  deletePage: (pageId: string) => void;
  createTodoList: () => string;
  updateTodoList: (todoId: string, patch: TodoPatch) => void;
  deleteTodoList: (todoId: string) => void;
  updateSheet: (sheet: SheetName, content: string) => void;
  /** Moves the free writing into a new page and clears the scratchpad; returns the page id. */
  keepScratchAsPage: (title: string) => string;
  /** Uploads pending edits; resolves false if they could not reach the cloud. */
  finishSync: () => Promise<boolean>;
}
export const WorkspaceStateContext = createContext<{
  workspace: Workspace;
  saveError: boolean;
  /** `memory` is the playground: nothing is saved anywhere. */
  syncStatus: 'local' | 'loading' | 'syncing' | 'synced' | 'error' | 'memory';
  cloudEnabled: boolean;
} | null>(null);
export const WorkspaceActionsContext = createContext<WorkspaceActions | null>(null);
