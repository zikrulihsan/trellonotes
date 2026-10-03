import { createContext } from 'react';
import type { Note, NotePatch, Workspace } from '@/features/workspace/types';
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
}
export const WorkspaceStateContext = createContext<{
  workspace: Workspace;
  saveError: boolean;
} | null>(null);
export const WorkspaceActionsContext = createContext<WorkspaceActions | null>(null);
