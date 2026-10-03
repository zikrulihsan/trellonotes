import { FileText, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Board } from '@/features/workspace/types';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useUI } from '@/hooks/useUI';
import { useDropdown } from '@/hooks/useDropdown';
import { Dropdown } from '@/components/ui/Dropdown';
import { Button } from '@/components/ui/Button';
export function BoardHeader({ board }: { board: Board }) {
  const { workspace } = useWorkspace(),
    { openDialog } = useUI(),
    menu = useDropdown();
  const initiatives = workspace.cards.filter((note) => note.boardId === board.id).length;
  return (
    <section className="board-header">
      <div>
        <div className="eyebrow">INITIATIVE BOARD</div>
        <h1>
          {board.title}
          <span className="title-dot" />
        </h1>
      </div>
      <div className="board-actions">
        <span className="card-total">
          <FileText size={16} />
          {initiatives} {initiatives === 1 ? 'initiative' : 'initiatives'}
        </span>
        <Button
          variant="primary"
          onClick={() =>
            openDialog({ kind: 'create-note', boardId: board.id, listId: board.lists[0].id })
          }
          disabled={!board.lists.length}
        >
          <Plus size={17} />
          New initiative
        </Button>
        <div className="menu-anchor" data-menu-id={menu.id}>
          <button
            className="icon-button"
            aria-label="Board options"
            aria-expanded={menu.open}
            onClick={() => menu.toggle()}
          >
            <MoreHorizontal size={22} />
          </button>
          <Dropdown id={menu.id} open={menu.open}>
            <button
              onClick={() => {
                openDialog({ kind: 'rename-board', boardId: board.id, title: board.title });
                menu.close();
              }}
            >
              <Pencil size={15} />
              Rename board
            </button>
            {workspace.boards.length > 1 && (
              <button
                className="danger"
                onClick={() => {
                  openDialog({ kind: 'delete-board', boardId: board.id, title: board.title });
                  menu.close();
                }}
              >
                <Trash2 size={15} />
                Delete board
              </button>
            )}
          </Dropdown>
        </div>
      </div>
    </section>
  );
}
