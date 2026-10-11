import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '@/hooks/useUI';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
import type { WorkspaceDialog } from '@/context/ui-context';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { boardPath, initiativePath } from '@/lib/app-paths';
import { LabelManager } from './LabelManager';
import { BOARD_TEMPLATES, templateById } from './templates';

/** A new board: a name and the lists to start with, from a blank board or a template. */
function CreateBoardDialog({ onClose }: { onClose: () => void }) {
  const [templateId, setTemplateId] = useState(BOARD_TEMPLATES[0].id);
  const [name, setName] = useState('');
  const actions = useWorkspaceActions(),
    navigate = useNavigate();
  const template = templateById(templateId);
  // An untouched name follows the template, so picking one is enough to create it.
  const title = name.trim() || (template.id === 'blank' ? '' : template.name);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title) return;
    navigate(boardPath({ id: actions.createBoard(title, template.id), title }));
    onClose();
  }
  return (
    <Modal title="Start a board" onClose={onClose} className="board-create">
      <form onSubmit={submit}>
        <fieldset className="board-templates">
          <legend>Start from</legend>
          {BOARD_TEMPLATES.map((option) => (
            <label key={option.id} className={option.id === templateId ? 'is-selected' : ''}>
              <input
                type="radio"
                name="board-template"
                value={option.id}
                checked={option.id === templateId}
                onChange={() => setTemplateId(option.id)}
              />
              <span className="board-template-dot" style={{ background: option.color }} />
              <strong>{option.name}</strong>
              <small>{option.hint}</small>
            </label>
          ))}
        </fieldset>
        <p className="board-template-lists">
          Lists: {template.lists.join(' · ')}. You can rename or add lists later.
        </p>
        <label htmlFor="board-name">Name</label>
        <input
          id="board-name"
          maxLength={150}
          placeholder={template.id === 'blank' ? 'Give it a name…' : template.name}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <div className="modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!title}>
            Create board
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function WorkspaceDialogs() {
  const { dialog, closeDialog } = useUI();
  if (!dialog) return null;
  if (dialog.kind === 'manage-labels') return <LabelManager onClose={closeDialog} />;
  if (dialog.kind === 'create-board') return <CreateBoardDialog onClose={closeDialog} />;
  return <DialogForm key={JSON.stringify(dialog)} request={dialog} onClose={closeDialog} />;
}
function DialogForm({
  request,
  onClose,
}: {
  request: Exclude<WorkspaceDialog, { kind: 'manage-labels' } | { kind: 'create-board' }>;
  onClose: () => void;
}) {
  const [value, setValue] = useState('title' in request ? request.title : '');
  const actions = useWorkspaceActions(),
    { workspace } = useWorkspace(),
    navigate = useNavigate();
  const deleting = request.kind.startsWith('delete'),
    renaming = request.kind.startsWith('rename');
  const kindNoun = request.kind.split('-')[1];
  const noun = kindNoun === 'note' ? 'card' : kindNoun;
  const title = deleting
    ? `Delete ${noun}?`
    : renaming
      ? 'Give it a new name'
      : request.kind === 'create-list'
        ? 'Add a list'
        : 'New card';
  function submit(event: FormEvent, write = true) {
    event.preventDefault();
    if (!value.trim()) return;
    switch (request.kind) {
      case 'create-list':
        actions.createList(request.boardId, value);
        break;
      case 'create-note': {
        const note = actions.createNote(request.boardId, request.listId, value);
        if (write) navigate(initiativePath(note));
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
        navigate(
          boardPath(workspace.boards.find((b) => b.id === request.boardId) ?? workspace.boards[0]),
        );
        break;
      case 'delete-list':
        actions.deleteList(request.boardId, request.listId);
        break;
      case 'delete-board': {
        const next = workspace.boards.find((b) => b.id !== request.boardId);
        if (!next) return;
        actions.deleteBoard(request.boardId);
        navigate(boardPath(next));
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
            {request.kind === 'create-note' ? 'Card name' : 'Name'}
          </label>
          <input
            id="workspace-name"
            autoFocus
            maxLength={150}
            placeholder={
              request.kind === 'create-note' ? 'A plan, a step or a result…' : 'Give it a name…'
            }
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="modal-actions">
            <Button onClick={onClose}>Cancel</Button>
            {request.kind === 'create-note' && (
              <Button onClick={(event) => submit(event, false)} disabled={!value.trim()}>
                Add card
              </Button>
            )}
            <Button type="submit" variant="primary" disabled={!value.trim()}>
              {renaming
                ? 'Save name'
                : request.kind === 'create-note'
                  ? 'Add & open'
                  : `Create ${noun}`}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
