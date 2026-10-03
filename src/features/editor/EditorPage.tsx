import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { boardPath, findByRef, initiativePath } from '@/lib/app-paths';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
import { Button } from '@/components/ui/Button';
import { WritingSurface } from './WritingSurface';
import { NoteOptions } from './components/NoteOptions';
export default function EditorPage() {
  const { noteRef } = useParams(),
    { workspace } = useWorkspace(),
    { updateNote } = useWorkspaceActions(),
    navigate = useNavigate();
  const note = findByRef(workspace.cards, noteRef),
    board = workspace.boards.find((board) => board.id === note?.boardId);
  const canonical = note && initiativePath(note);
  useEffect(() => {
    // Keep the address bar on the short, current-title link (older links used full ids).
    if (canonical && canonical !== `/initiative/${noteRef}`) navigate(canonical, { replace: true });
  }, [canonical, noteRef, navigate]);
  if (!note || !board)
    return (
      <div className="editor-placeholder">
        <h1>Initiative not found</h1>
        <p>This initiative may have been deleted.</p>
        <Button onClick={() => navigate(boardPath(workspace.boards[0]))}>Open my board</Button>
      </div>
    );
  return (
    <WritingSurface
      key={note.id}
      doc={note}
      onChange={(patch) => updateNote(note.id, patch)}
      backLabel={board.title}
      onBack={() => navigate(boardPath(board))}
      menu={<NoteOptions note={note} board={board} />}
    />
  );
}
