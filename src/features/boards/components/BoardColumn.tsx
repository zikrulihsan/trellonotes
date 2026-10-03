import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Board, BoardList, Note } from '@/features/workspace/types';
import { useUI } from '@/hooks/useUI';
import { useDropdown } from '@/hooks/useDropdown';
import { Dropdown } from '@/components/ui/Dropdown';
import { useBoardDrag } from '../useBoardDrag';
import { NoteCard } from './NoteCard';
export function BoardColumn({
  board,
  list,
  notes,
}: {
  board: Board;
  list: BoardList;
  notes: Note[];
}) {
  const { openDialog } = useUI(),
    menu = useDropdown(),
    drag = useBoardDrag();
  return (
    <section
      className={`column ${drag.dropListId === list.id ? 'drop-active' : ''}`}
      onWheel={(event) => {
        const horizontalDelta = event.shiftKey && event.deltaX === 0 ? event.deltaY : event.deltaX;
        if (
          !horizontalDelta ||
          (!event.shiftKey && Math.abs(horizontalDelta) < Math.abs(event.deltaY))
        ) {
          return;
        }

        const boardCanvas = event.currentTarget.closest('.board-canvas');
        if (!(boardCanvas instanceof HTMLElement)) return;

        event.preventDefault();
        boardCanvas.scrollLeft += horizontalDelta;
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (drag.dragId) drag.setDropListId(list.id);
      }}
      onDrop={(event) => {
        event.preventDefault();
        drag.finishDrop(list.id);
      }}
    >
      <header className="column-header">
        <div>
          <h2>{list.title}</h2>
          <span className="count">{notes.length}</span>
        </div>
        <div className="menu-anchor" data-menu-id={menu.id}>
          <button
            className="icon-button"
            aria-label={`${list.title} list options`}
            aria-expanded={menu.open}
            onClick={() => menu.toggle()}
          >
            <MoreHorizontal size={18} />
          </button>
          <Dropdown id={menu.id} open={menu.open}>
            <button
              onClick={() => {
                openDialog({
                  kind: 'rename-list',
                  boardId: board.id,
                  listId: list.id,
                  title: list.title,
                });
                menu.close();
              }}
            >
              <Pencil size={15} />
              Rename list
            </button>
            <button
              className="danger"
              onClick={() => {
                openDialog({
                  kind: 'delete-list',
                  boardId: board.id,
                  listId: list.id,
                  title: list.title,
                });
                menu.close();
              }}
            >
              <Trash2 size={15} />
              Delete list
            </button>
          </Dropdown>
        </div>
      </header>
      <div className="card-stack">
        {notes.map((note) => (
          <NoteCard key={note.id} note={note} board={board} />
        ))}
      </div>
      <button
        className="add-card"
        onClick={() => openDialog({ kind: 'create-note', boardId: board.id, listId: list.id })}
      >
        <Plus size={17} />
        Add a card
      </button>
    </section>
  );
}
