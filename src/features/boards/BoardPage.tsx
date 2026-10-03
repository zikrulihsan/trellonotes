import { Navigate, useParams } from 'react-router-dom';
import { GripVertical, Plus } from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useUI } from '@/hooks/useUI';
import { boardPath, findByRef } from '@/lib/app-paths';
import { BoardDragProvider } from './BoardDragProvider';
import { BoardHeader } from './components/BoardHeader';
import { BoardColumn } from './components/BoardColumn';
export function BoardPage() {
  const { boardRef } = useParams(),
    { workspace } = useWorkspace(),
    { openDialog } = useUI();
  const board = findByRef(workspace.boards, boardRef);
  if (!board) return <Navigate to={boardPath(workspace.boards[0])} replace />;
  // Keep the address bar on the short, current-title link.
  if (boardPath(board) !== `/board/${boardRef}`) return <Navigate to={boardPath(board)} replace />;
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
            Drag initiatives between lists.<span>Click one to write its updates</span>
          </div>
        </div>
      </BoardDragProvider>
    </>
  );
}
