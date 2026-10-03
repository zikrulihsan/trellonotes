import { MoreHorizontal, Tags, Trash2 } from 'lucide-react';
import type { Board, Note } from '@/features/workspace/types';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
import { useUI } from '@/hooks/useUI';
import { useDropdown } from '@/hooks/useDropdown';
import { Dropdown } from '@/components/ui/Dropdown';
import { editedLabel, labelColorValue, noteLabel } from '@/lib/note-metadata';
export function NoteOptions({ note, board }: { note: Note; board: Board }) {
  const { updateNote, moveNote } = useWorkspaceActions(),
    { workspace } = useWorkspace(),
    label = noteLabel(workspace, note),
    { openDialog } = useUI(),
    menu = useDropdown();
  return (
    <div className="menu-anchor" data-menu-id={menu.id}>
      <button
        className="icon-button"
        aria-label="Initiative options"
        aria-expanded={menu.open}
        onClick={() => menu.toggle()}
      >
        <MoreHorizontal size={19} />
      </button>
      <Dropdown id={menu.id} open={menu.open} className="note-options">
        <p className="note-options-meta">{editedLabel(note.updatedAt)}</p>
        <label>
          List
          <select
            aria-label="Move initiative to list"
            value={note.listId}
            onChange={(event) => moveNote(note.id, event.target.value)}
          >
            {board.lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Label
          {label && (
            <span className="label-dot" style={{ background: labelColorValue(label.color) }} />
          )}
          <select
            aria-label="Initiative label"
            value={note.labelId ?? ''}
            onChange={(event) => updateNote(note.id, { labelId: event.target.value || undefined })}
          >
            <option value="">No label</option>
            {workspace.labels?.map((label) => (
              <option key={label.id} value={label.id}>
                {label.name}
              </option>
            ))}
          </select>
        </label>
        <div className="menu-actions">
          <button
            onClick={() => {
              openDialog({ kind: 'manage-labels' });
              menu.close();
            }}
          >
            <Tags size={15} />
            Manage labels
          </button>
          <button
            className="danger"
            onClick={() => {
              openDialog({
                kind: 'delete-note',
                noteId: note.id,
                boardId: note.boardId,
                title: note.title || 'Untitled',
              });
              menu.close();
            }}
          >
            <Trash2 size={15} />
            Delete initiative
          </button>
        </div>
      </Dropdown>
    </div>
  );
}
