import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Button } from '@/components/ui/Button';
import { WritingEditor } from './WritingEditor';
export default function EditorPage() {
  const { noteId } = useParams(),
    { workspace } = useWorkspace(),
    navigate = useNavigate();
  const note = workspace.cards.find((note) => note.id === noteId),
    board = workspace.boards.find((board) => board.id === note?.boardId);
  if (!note || !board)
    return (
      <div className="editor-placeholder">
        <h1>Note not found</h1>
        <p>This note may have been deleted.</p>
        <Button onClick={() => navigate(`/board/${workspace.boards[0].id}`)}>Open my board</Button>
      </div>
    );
  return <WritingEditor key={note.id} card={note} board={board} />;
}
