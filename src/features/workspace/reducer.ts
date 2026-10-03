import type {
  Board,
  BoardList,
  Label,
  LabelPatch,
  Note,
  NotePatch,
  Page,
  PagePatch,
  Workspace,
} from './types';
export type WorkspaceAction =
  | { type: 'workspace/replace'; workspace: Workspace }
  | { type: 'board/create'; board: Board }
  | { type: 'board/rename'; boardId: string; title: string }
  | { type: 'board/delete'; boardId: string }
  | { type: 'list/create'; boardId: string; list: BoardList }
  | { type: 'list/rename'; boardId: string; listId: string; title: string }
  | { type: 'list/delete'; boardId: string; listId: string }
  | { type: 'note/create'; note: Note }
  | { type: 'note/update'; noteId: string; patch: NotePatch; timestamp: number }
  | { type: 'note/move'; noteId: string; listId: string; beforeId?: string }
  | { type: 'note/delete'; noteId: string }
  | { type: 'label/create'; label: Label }
  | { type: 'label/update'; labelId: string; patch: LabelPatch }
  | { type: 'label/delete'; labelId: string }
  | { type: 'page/create'; page: Page }
  | { type: 'page/update'; pageId: string; patch: PagePatch; timestamp: number }
  | { type: 'page/publish'; pageId: string; published: Page['published'] }
  | { type: 'page/delete'; pageId: string };

export function workspaceReducer(state: Workspace, action: WorkspaceAction): Workspace {
  switch (action.type) {
    case 'workspace/replace':
      return action.workspace;
    case 'board/create':
      return action.board.title.trim() && !state.boards.some((b) => b.id === action.board.id)
        ? { ...state, boards: [...state.boards, action.board] }
        : state;
    case 'board/rename':
      return action.title.trim()
        ? {
            ...state,
            boards: state.boards.map((b) =>
              b.id === action.boardId ? { ...b, title: action.title.trim() } : b,
            ),
          }
        : state;
    case 'board/delete':
      return state.boards.length > 1 && state.boards.some((b) => b.id === action.boardId)
        ? {
            ...state,
            boards: state.boards.filter((b) => b.id !== action.boardId),
            cards: state.cards.filter((c) => c.boardId !== action.boardId),
          }
        : state;
    case 'list/create':
      return action.list.title.trim()
        ? {
            ...state,
            boards: state.boards.map((b) =>
              b.id === action.boardId && !b.lists.some((l) => l.id === action.list.id)
                ? { ...b, lists: [...b.lists, action.list] }
                : b,
            ),
          }
        : state;
    case 'list/rename':
      return action.title.trim()
        ? {
            ...state,
            boards: state.boards.map((b) =>
              b.id === action.boardId
                ? {
                    ...b,
                    lists: b.lists.map((l) =>
                      l.id === action.listId ? { ...l, title: action.title.trim() } : l,
                    ),
                  }
                : b,
            ),
          }
        : state;
    case 'list/delete':
      return {
        ...state,
        boards: state.boards.map((b) =>
          b.id === action.boardId
            ? { ...b, lists: b.lists.filter((l) => l.id !== action.listId) }
            : b,
        ),
        cards: state.cards.filter(
          (c) => !(c.boardId === action.boardId && c.listId === action.listId),
        ),
      };
    case 'note/create': {
      const b = state.boards.find((b) => b.id === action.note.boardId);
      return b?.lists.some((l) => l.id === action.note.listId) &&
        action.note.title.trim() &&
        !state.cards.some((c) => c.id === action.note.id)
        ? { ...state, cards: [...state.cards, action.note] }
        : state;
    }
    case 'note/update':
      return {
        ...state,
        cards: state.cards.map((c) => {
          if (c.id !== action.noteId) return c;
          const writingChanged =
            (action.patch.title !== undefined && action.patch.title !== c.title) ||
            (action.patch.content !== undefined && action.patch.content !== c.content);
          return {
            ...c,
            ...action.patch,
            updatedAt: writingChanged ? action.timestamp : c.updatedAt,
          };
        }),
      };
    case 'note/move': {
      const note = state.cards.find((c) => c.id === action.noteId);
      const board = state.boards.find((b) => b.id === note?.boardId);
      if (!note || !board?.lists.some((l) => l.id === action.listId) || action.beforeId === note.id)
        return state;
      const cards = state.cards.filter((c) => c.id !== note.id);
      const before = cards.findIndex(
        (c) => c.id === action.beforeId && c.boardId === note.boardId && c.listId === action.listId,
      );
      cards.splice(before < 0 ? cards.length : before, 0, { ...note, listId: action.listId });
      return { ...state, cards };
    }
    case 'note/delete':
      return { ...state, cards: state.cards.filter((c) => c.id !== action.noteId) };
    case 'label/create':
      return action.label.name.trim() && !state.labels?.some((l) => l.id === action.label.id)
        ? { ...state, labels: [...(state.labels ?? []), action.label] }
        : state;
    case 'label/update': {
      const name = action.patch.name?.trim();
      if (action.patch.name !== undefined && !name) return state;
      return {
        ...state,
        labels: state.labels?.map((l) =>
          l.id === action.labelId ? { ...l, ...action.patch, ...(name && { name }) } : l,
        ),
      };
    }
    case 'label/delete':
      return {
        ...state,
        labels: state.labels?.filter((l) => l.id !== action.labelId),
        cards: state.cards.map((c) =>
          c.labelId === action.labelId ? { ...c, labelId: undefined } : c,
        ),
      };
    case 'page/create':
      return state.pages?.some((p) => p.id === action.page.id)
        ? state
        : { ...state, pages: [action.page, ...(state.pages ?? [])] };
    case 'page/update':
      return {
        ...state,
        pages: state.pages?.map((p) => {
          if (p.id !== action.pageId) return p;
          const changed = (Object.keys(action.patch) as (keyof PagePatch)[]).some(
            (key) => action.patch[key] !== undefined && action.patch[key] !== p[key],
          );
          return changed ? { ...p, ...action.patch, updatedAt: action.timestamp } : p;
        }),
      };
    case 'page/publish':
      return {
        ...state,
        pages: state.pages?.map((p) =>
          p.id === action.pageId ? { ...p, published: action.published } : p,
        ),
      };
    case 'page/delete':
      return { ...state, pages: state.pages?.filter((p) => p.id !== action.pageId) };
  }
}
