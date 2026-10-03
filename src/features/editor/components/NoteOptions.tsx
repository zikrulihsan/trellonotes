import { Check, MoreHorizontal, Trash2, X } from 'lucide-react';
import type { Board, Note } from '@/features/workspace/types';
import { useWorkspaceActions } from '@/hooks/useWorkspace';
import { useUI } from '@/hooks/useUI';
import { useDropdown } from '@/hooks/useDropdown';
import { Dropdown } from '@/components/ui/Dropdown';
import { editedLabel, LABEL_COLORS, labelColor } from '@/lib/note-metadata';
export function NoteOptions({ note, board }: { note: Note; board: Board }) {
  const { updateNote, moveNote } = useWorkspaceActions(),
    { openDialog } = useUI(),
    menu = useDropdown();
  return (
    <div className="menu-anchor" data-menu-id={menu.id}>
      <button
        className="icon-button"
        aria-label="Note options"
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
            aria-label="Move note to list"
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
          Card label
          <select
            aria-label="Card label"
            value={note.tag}
            onChange={(event) => updateNote(note.id, { tag: event.target.value })}
          >
            {Array.from(
              new Set([
                note.tag,
                'Free writing',
                'Notes',
                'Personal',
                'Work',
                'Ideas',
                'Essay',
                'Guide',
              ]),
            ).map((tag) => (
              <option key={tag}>{tag}</option>
            ))}
          </select>
        </label>
        <label>
          Label color
          <div className="cover-choices label-choices">
            {LABEL_COLORS.map((color) => {
              const selected =
                note.labelColor === color.id ||
                (!note.labelColor && labelColor(note) === color.value);
              return (
                <button
                  key={color.id}
                  aria-label={`${color.name} label`}
                  aria-pressed={selected}
                  className={`cover-choice ${color.id === 'none' ? 'none' : ''}`}
                  style={{ background: color.value }}
                  onClick={() => updateNote(note.id, { labelColor: color.id })}
                >
                  {selected ? <Check size={15} /> : color.id === 'none' ? <X size={13} /> : null}
                </button>
              );
            })}
          </div>
        </label>
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
          Delete note
        </button>
      </Dropdown>
    </div>
  );
}
