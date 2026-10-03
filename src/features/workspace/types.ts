export interface Note {
  id: string;
  boardId: string;
  listId: string;
  title: string;
  content: string;
  tag: string;
  updatedAt: number;
  labelColor?: string;
  /** Retained for compatibility with previously saved workspaces. */
  cover?: string;
}
export interface BoardList {
  id: string;
  title: string;
}
export interface Board {
  id: string;
  title: string;
  description: string;
  color: string;
  lists: BoardList[];
}
export interface Workspace {
  boards: Board[];
  cards: Note[];
}
export type NotePatch = Partial<Pick<Note, 'title' | 'content' | 'tag' | 'labelColor'>>;
