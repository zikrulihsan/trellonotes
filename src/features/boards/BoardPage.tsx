import { Navigate, useParams } from 'react-router-dom';
import { GripVertical, Plus } from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useUI } from '@/hooks/useUI';
import { BoardDragProvider } from './BoardDragProvider';
import { BoardHeader } from './components/BoardHeader';
import { BoardColumn } from './components/BoardColumn';
export function BoardPage() {
  const { boardId } = useParams(),
    { workspace } = useWorkspace(),
    { openDialog } = useUI();
  const board = workspace.boards.find((board) => board.id === boardId);
  if (!board) return <Navigate to={`/board/${workspace.boards[0].id}`} replace />;
  return (
    <>
      <BoardHeader board={board} />
      <BoardDragProvider>
        <div className="board-canvas">
          <div className="columns">
            {board.lists.map((list) => (
              <BoardColumn
                key={list.id}
                board={board}
                list={list}
                notes={workspace.cards.filter(
                  (note) => note.boardId === board.id && note.listId === list.id,
                )}
              />
            ))}
            <button
              className="add-list"
              onClick={() => openDialog({ kind: 'create-list', boardId: board.id })}
            >
              <Plus size={17} />
              Add a list
            </button>
          </div>
          <div className="board-footnote">
            <GripVertical size={14} />
            Drag cards between lists.<span>Click a card to write freely</span>
          </div>
        </div>
      </BoardDragProvider>
    </>
  );
}
