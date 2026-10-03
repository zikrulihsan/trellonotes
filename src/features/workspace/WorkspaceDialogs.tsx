import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '@/hooks/useUI';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
import type { WorkspaceDialog } from '@/context/ui-context';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
export function WorkspaceDialogs() {
  const { dialog, closeDialog } = useUI();
  return dialog ? (
    <DialogForm key={JSON.stringify(dialog)} request={dialog} onClose={closeDialog} />
  ) : null;
}
function DialogForm({ request, onClose }: { request: WorkspaceDialog; onClose: () => void }) {
  const [value, setValue] = useState('title' in request ? request.title : '');
  const actions = useWorkspaceActions(),
    { workspace } = useWorkspace(),
    navigate = useNavigate();
  const deleting = request.kind.startsWith('delete'),
    renaming = request.kind.startsWith('rename');
  const noun = request.kind.split('-')[1];
  const title = deleting
    ? `Delete ${noun}?`
    : renaming
      ? 'Give it a new name'
      : request.kind === 'create-board'
        ? 'A new space for your ideas'
        : request.kind === 'create-list'
          ? 'Add a list'
          : 'Start with an idea';
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) return;
    switch (request.kind) {
      case 'create-board':
        navigate(`/board/${actions.createBoard(value)}`);
        break;
      case 'create-list':
        actions.createList(request.boardId, value);
        break;
      case 'create-note': {
        const note = actions.createNote(request.boardId, request.listId, value);
        navigate(`/card/${note.id}`);
        break;
      }
      case 'rename-board':
        actions.renameBoard(request.boardId, value);
        break;
      case 'rename-list':
        actions.renameList(request.boardId, request.listId, value);
        break;
      default:
        return;
    }
    onClose();
  }
  function remove() {
    switch (request.kind) {
      case 'delete-note':
        actions.deleteNote(request.noteId);
        navigate(`/board/${request.boardId}`);
        break;
      case 'delete-list':
        actions.deleteList(request.boardId, request.listId);
        break;
      case 'delete-board': {
        const next = workspace.boards.find((b) => b.id !== request.boardId);
        if (!next) return;
        actions.deleteBoard(request.boardId);
        navigate(`/board/${next.id}`);
        break;
      }
      default:
        return;
    }
    onClose();
  }
  return (
    <Modal title={title} onClose={onClose}>
      {deleting ? (
        <>
          <p>
            “{value}”{request.kind !== 'delete-note' ? ' and all its cards' : ''} will be
            permanently deleted from this device.
          </p>
          <div className="modal-actions">
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="destructive" onClick={remove}>
              Delete
            </Button>
          </div>
        </>
      ) : (
        <form onSubmit={submit}>
          <label htmlFor="workspace-name">
            {request.kind === 'create-note' ? 'Card title' : 'Name'}
          </label>
          <input
            id="workspace-name"
            autoFocus
            maxLength={150}
            placeholder={
              request.kind === 'create-note' ? 'What’s on your mind?' : 'Give it a name…'
            }
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="modal-actions">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={!value.trim()}>
              {renaming
                ? 'Save name'
                : request.kind === 'create-note'
                  ? 'Create & write'
                  : `Create ${noun}`}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
