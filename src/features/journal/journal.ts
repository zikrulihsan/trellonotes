import type { BoardList, Note, Page, Workspace } from '@/features/workspace/types';

/** List names that mean "finished" when the writer hasn't said otherwise. */
const DONE_TITLES =
  /^(done|finished|complete|completed|shipped|delivered|published|selesai|beres|tuntas)$/i;

/** Whether cards in this list count as finished in the work journal. */
export const isDoneList = (list: BoardList) => list.done ?? DONE_TITLES.test(list.title.trim());

const pad = (n: number) => String(n).padStart(2, '0');

/** Midnight on the Monday of the week holding `time`, in local time. */
export function weekStart(time: number): Date {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

/** The week's Monday as YYYY-MM-DD, the id of its journal entry. */
export function weekId(time: number): string {
  const monday = weekStart(time);
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
}

/** The Monday of the week `offset` weeks away from the week holding `time`. */
export function shiftWeek(time: number, offset: number): number {
  const monday = weekStart(time);
  monday.setDate(monday.getDate() + offset * 7);
  return monday.getTime();
}

export interface JournalWeek {
  id: string;
  start: number;
  end: number;
  /** Cards that reached a done list this week and are still there. */
  finished: Note[];
  /** Other cards worked on this week. */
  progress: Note[];
  /** Pages written this week. */
  pages: Page[];
  notes: string;
}

/** Everything the work journal shows for the week holding `time`. */
export function journalWeek(workspace: Workspace, time: number): JournalWeek {
  const start = weekStart(time).getTime();
  const end = shiftWeek(start, 1);
  const within = (at?: number) => at !== undefined && at >= start && at < end;
  const doneLists = new Set(
    workspace.boards.flatMap((board) =>
      board.lists.filter(isDoneList).map((list) => `${board.id}/${list.id}`),
    ),
  );
  const isFinished = (note: Note) => doneLists.has(`${note.boardId}/${note.listId}`);
  const newest = <T extends { updatedAt: number }>(a: T, b: T) => b.updatedAt - a.updatedAt;
  const id = weekId(start);
  return {
    id,
    start,
    end,
    finished: workspace.cards
      .filter((note) => isFinished(note) && within(note.doneAt))
      .sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)),
    progress: workspace.cards
      .filter((note) => !isFinished(note) && within(note.updatedAt))
      .sort(newest),
    pages: (workspace.pages ?? []).filter((page) => within(page.updatedAt)).sort(newest),
    notes: workspace.journal?.find((entry) => entry.id === id)?.content ?? '',
  };
}

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * A private draft page from one week: the writer's notes, then what they finished, by
 * board. It is a copy; nothing on the boards becomes public.
 */
export function weekDraft(workspace: Workspace, week: JournalWeek, title: string) {
  const paragraphs = week.notes
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escape(block)}</p>`);
  const finished = workspace.boards
    .map((board) => ({
      board,
      notes: week.finished.filter((note) => note.boardId === board.id),
    }))
    .filter((group) => group.notes.length)
    .map(
      ({ board, notes }) =>
        `<h3>${escape(board.title)}</h3><ul>${notes.map((note) => `<li><p>${escape(note.title)}</p></li>`).join('')}</ul>`,
    );
  const content = [
    ...paragraphs,
    ...(finished.length ? ['<h2>What I finished</h2>', ...finished] : []),
  ].join('');
  return { title, content: content || '<p></p>' };
}
