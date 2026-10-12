import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  FileText,
  Lock,
  NotebookPen,
  PenLine,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
import { Button } from '@/components/ui/Button';
import { initiativePath, pagePath } from '@/lib/app-paths';
import { supabase } from '@/lib/supabase/client';
import type { Board, Note } from '@/features/workspace/types';
import { journalWeek, shiftWeek, weekDraft, weekId } from './journal';
import { WeekWriteup } from './WeekWriteup';

const day = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

/** "Oct 5 – 11", the days of the week starting at `start`. */
function weekRange(start: number, end: number) {
  const last = new Date(end - 1);
  const first = new Date(start);
  const tail = first.getMonth() === last.getMonth() ? String(last.getDate()) : day.format(last);
  return `${day.format(first)} – ${tail}`;
}

/**
 * The work journal: what got finished each week, what moved, what got written, and the
 * writer's own notes. It remembers so the writer doesn't have to, and turns a week into a
 * private draft page when it is worth telling.
 */
export function JournalPage() {
  const { workspace } = useWorkspace(),
    { createPage, updateJournal } = useWorkspaceActions(),
    navigate = useNavigate(),
    [offset, setOffset] = useState(0),
    [now] = useState(() => Date.now()),
    [writing, setWriting] = useState(false);
  const week = journalWeek(workspace, shiftWeek(now, offset));
  const thisWeek = week.id === weekId(now);
  const range = weekRange(week.start, week.end);
  const boards = workspace.boards
    .map((board) => ({
      board,
      notes: week.finished.filter((note) => note.boardId === board.id),
    }))
    .filter((group) => group.notes.length);
  const boardOf = (note: Note) => workspace.boards.find((board) => board.id === note.boardId);
  const empty = !week.finished.length && !week.progress.length && !week.pages.length;
  const title = `${thisWeek ? 'This week' : `Week of ${day.format(week.start)}`}: what I worked on`;
  const draft = () => {
    navigate(pagePath({ id: createPage(weekDraft(workspace, week, title)), title }));
  };
  return (
    <div className="pages-view journal">
      <section className="board-header">
        <div>
          <div className="eyebrow">WORK JOURNAL</div>
          <h1>{thisWeek ? 'This week' : offset === -1 ? 'Last week' : `Week of ${range}`}</h1>
          <p>
            What you finished, what moved and what you wrote, gathered from your boards. Nothing
            here is public.
          </p>
        </div>
        <div className="board-actions">
          {supabase && (
            <Button
              onClick={() => setWriting(!writing)}
              disabled={empty && !week.todos.length && !week.notes.trim()}
              aria-expanded={writing}
            >
              <Sparkles size={17} />
              Write it up
            </Button>
          )}
          <Button variant="primary" onClick={draft} disabled={empty && !week.notes.trim()}>
            <PenLine size={17} />
            Draft a page from this week
          </Button>
        </div>
      </section>

      <div className="journal-body">
        {writing && (
          <WeekWriteup key={week.id} week={week} title={title} onClose={() => setWriting(false)} />
        )}
        <nav className="journal-weeks" aria-label="Weeks">
          <button
            className="icon-button"
            aria-label="Previous week"
            onClick={() => setOffset(offset - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <span>{range}</span>
          <button
            className="icon-button"
            aria-label="Next week"
            onClick={() => setOffset(offset + 1)}
            disabled={thisWeek}
          >
            <ChevronRight size={18} />
          </button>
          {!thisWeek && (
            <button className="journal-today" onClick={() => setOffset(0)}>
              This week
            </button>
          )}
        </nav>

        <div className="journal-stats" aria-label="This week in numbers">
          <span>
            <strong>{week.finished.length}</strong> finished
          </span>
          <span>
            <strong>{week.progress.length}</strong> in progress
          </span>
          <span>
            <strong>{week.pages.length}</strong> written
          </span>
        </div>

        <section className="journal-section" aria-labelledby="journal-finished">
          <h2 id="journal-finished">
            <CircleCheck size={18} /> Finished
          </h2>
          {boards.length ? (
            boards.map(({ board, notes }) => (
              <div className="journal-board" key={board.id}>
                <BoardName board={board} />
                <ul>
                  {notes.map((note) => (
                    <li key={note.id}>
                      <button onClick={() => navigate(initiativePath(note))}>{note.title}</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p className="journal-empty">
              Nothing finished {thisWeek ? 'yet this week' : 'that week'}. Move a card to a done
              list, such as Done, and it shows up here. Any list can count as done from its menu.
            </p>
          )}
        </section>

        {week.progress.length > 0 && (
          <section className="journal-section" aria-labelledby="journal-progress">
            <h2 id="journal-progress">
              <TrendingUp size={18} /> In progress
            </h2>
            <ul className="journal-list">
              {week.progress.map((note) => {
                const board = boardOf(note);
                return (
                  <li key={note.id}>
                    <button onClick={() => navigate(initiativePath(note))}>
                      {board && <span className="board-dot" style={{ background: board.color }} />}
                      {note.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {week.pages.length > 0 && (
          <section className="journal-section" aria-labelledby="journal-pages">
            <h2 id="journal-pages">
              <FileText size={18} /> Written
            </h2>
            <ul className="journal-list">
              {week.pages.map((page) => (
                <li key={page.id}>
                  <button onClick={() => navigate(pagePath(page))}>
                    {page.title || 'Untitled page'}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="journal-section" aria-labelledby="journal-notes">
          <h2 id="journal-notes">
            <NotebookPen size={18} /> Notes on the week
          </h2>
          <textarea
            key={week.id}
            className="journal-notes"
            aria-labelledby="journal-notes"
            placeholder="What went well, what you learned, what is next…"
            defaultValue={week.notes}
            onChange={(event) => updateJournal(week.id, event.target.value)}
            rows={5}
          />
          <p className="journal-private">
            <Lock size={13} /> Private. Drafting a page makes a copy you can edit before you publish
            anything.
          </p>
        </section>
      </div>
    </div>
  );
}

function BoardName({ board }: { board: Board }) {
  return (
    <span className="journal-board-name">
      <span className="board-dot" style={{ background: board.color }} />
      {board.title}
    </span>
  );
}
