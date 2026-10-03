import { useNavigate } from 'react-router-dom';
import { FileText, MoreHorizontal, Trash2 } from 'lucide-react';
import type { Board, Note } from '@/features/workspace/types';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
import { useUI } from '@/hooks/useUI';
import { useDropdown } from '@/hooks/useDropdown';
import { Dropdown } from '@/components/ui/Dropdown';
import { wordCount } from '@/lib/text';
import { editedLabel, labelColorValue, noteLabel } from '@/lib/note-metadata';
import { useBoardDrag } from '../useBoardDrag';
export function NoteCard({ note, board }: { note: Note; board: Board }) {
  const navigate = useNavigate(),
    { moveNote } = useWorkspaceActions(),
    label = noteLabel(useWorkspace().workspace, note),
    { openDialog } = useUI(),
    menu = useDropdown(),
    drag = useBoardDrag();
  return (
    <article
      className={`note-card ${drag.dragId === note.id ? 'dragging' : ''}`}
      draggable
      onDragStart={(event) => {
        menu.close();
        drag.setDragId(note.id);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', note.id);
      }}
      onDragEnd={drag.cancel}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        drag.finishDrop(note.listId, note.id);
      }}
    >
      <button
        className="card-open"
        onClick={() => navigate(`/card/${note.id}`)}
        aria-label={`Open ${note.title || 'Untitled'}`}
      >
        <div className="card-body">
          {label && (
            <span
              className="card-label-strip"
              style={{ background: labelColorValue(label.color) }}
              title={label.name}
            >
              <span className="sr-only">{label.name}</span>
            </span>
          )}
          <h3>{note.title || 'Untitled'}</h3>
          <div className="card-meta">
            <span>
              <FileText size={14} />
              {wordCount(note.content)} words
            </span>
            <span title={new Date(note.updatedAt).toLocaleString()}>
              {editedLabel(note.updatedAt)}
            </span>
          </div>
        </div>
      </button>
      <div className="card-menu" data-menu-id={menu.id}>
        <button
          className="icon-button"
          aria-label={`Options for ${note.title || 'Untitled'}`}
          aria-expanded={menu.open}
          onClick={menu.toggle}
        >
          <MoreHorizontal size={16} />
        </button>
        <Dropdown id={menu.id} open={menu.open} position={menu.position} className="card-dropdown">
          <label>
            Move to
            <select
              aria-label="Move initiative to list"
              value={note.listId}
              onChange={(event) => {
                moveNote(note.id, event.target.value);
                menu.close();
              }}
            >
              {board.lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.title}
                </option>
              ))}
            </select>
          </label>
          <button
            className="danger"
            onClick={() => {
              openDialog({
                kind: 'delete-note',
                boardId: board.id,
                noteId: note.id,
                title: note.title || 'Untitled',
              });
              menu.close();
            }}
          >
            <Trash2 size={15} />
            Delete initiative
          </button>
        </Dropdown>
      </div>
    </article>
  );
}
