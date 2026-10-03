import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
import { Button } from '@/components/ui/Button';
import { WritingSurface } from './WritingSurface';
import { NoteOptions } from './components/NoteOptions';
export default function EditorPage() {
  const { noteId } = useParams(),
    { workspace } = useWorkspace(),
    { updateNote } = useWorkspaceActions(),
    navigate = useNavigate();
  const note = workspace.cards.find((note) => note.id === noteId),
    board = workspace.boards.find((board) => board.id === note?.boardId);
  if (!note || !board)
    return (
      <div className="editor-placeholder">
        <h1>Initiative not found</h1>
        <p>This initiative may have been deleted.</p>
        <Button onClick={() => navigate(`/board/${workspace.boards[0].id}`)}>Open my board</Button>
      </div>
    );
  return (
    <WritingSurface
      key={note.id}
      doc={note}
      onChange={(patch) => updateNote(note.id, patch)}
      backLabel={board.title}
      onBack={() => navigate(`/board/${board.id}`)}
      menu={<NoteOptions note={note} board={board} />}
    />
  );
}
