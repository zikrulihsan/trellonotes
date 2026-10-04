export interface Note {
  id: string;
  boardId: string;
  listId: string;
  title: string;
  content: string;
  /** Legacy free-text label; labels now live in `Workspace.labels` and are linked by `labelId`. */
  tag: string;
  updatedAt: number;
  labelId?: string;
  /** Legacy per-note label color, used only to pick colors when migrating old tags to labels. */
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
export interface Label {
  id: string;
  name: string;
  /** One of the `LABEL_COLORS` ids. */
  color: string;
}
/** A piece of writing meant for publishing, kept apart from board notes. */
export interface Page {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  /** Present while the page is live on the public writing page. */
  published?: { slug: string; at: number };
}
/** A checklist kept under To-do lists, apart from Pages. */
export interface TodoList {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}
/** A standing sheet that is always there, not listed anywhere: free writing. */
export interface Sheet {
  content: string;
  updatedAt: number;
}
export interface Workspace {
  boards: Board[];
  cards: Note[];
  /** Missing in workspaces saved before labels and pages existed. */
  labels?: Label[];
  pages?: Page[];
  /** Free writing: no title, kept until cleared. */
  scratch?: Sheet;
  todos?: TodoList[];
  /** A single standing to-do list used briefly before To-do lists; moved into `todos` on load. */
  todo?: Sheet;
}
export type SheetName = 'scratch';
export type NotePatch = Partial<Pick<Note, 'title' | 'content' | 'labelId'>>;
export type LabelPatch = Partial<Pick<Label, 'name' | 'color'>>;
export type PagePatch = Partial<Pick<Page, 'title' | 'content'>>;
export type TodoPatch = Partial<Pick<TodoList, 'title' | 'content'>>;
