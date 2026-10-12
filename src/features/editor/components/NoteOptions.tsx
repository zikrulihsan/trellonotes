import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Sparkles, Tags, Trash2 } from 'lucide-react';
import type { Board, Note } from '@/features/workspace/types';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
import { useUI } from '@/hooks/useUI';
import { useDropdown } from '@/hooks/useDropdown';
import { Dropdown } from '@/components/ui/Dropdown';
import { editedLabel, labelColorValue, noteLabel } from '@/lib/note-metadata';
import { supabase } from '@/lib/supabase/client';
import { pagePath } from '@/lib/app-paths';
import { wordCount } from '@/lib/text';
import { cardNotes, writeUp } from '@/lib/writeup';
export function NoteOptions({ note, board }: { note: Note; board: Board }) {
  const { updateNote, moveNote, createPage } = useWorkspaceActions(),
    { workspace } = useWorkspace(),
    label = noteLabel(workspace, note),
    { openDialog } = useUI(),
    menu = useDropdown(),
    navigate = useNavigate(),
    [writing, setWriting] = useState<{ busy?: boolean; error?: string }>({});
  /** Drafts a private page about this card with Gemini, from its notes. */
  async function writeItUp() {
    if (!supabase) return;
    setWriting({ busy: true });
    try {
      const page = await writeUp(supabase, 'card', cardNotes(workspace, note), note.title);
      menu.close();
      navigate(pagePath({ id: createPage(page), title: page.title }));
    } catch (reason) {
      setWriting({
        error: reason instanceof Error ? reason.message : 'Could not write the draft.',
      });
    }
  }
  return (
    <div className="menu-anchor" data-menu-id={menu.id}>
      <button
        className="icon-button"
        aria-label="Card options"
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
            aria-label="Move card to list"
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
            aria-label="Card label"
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
          {supabase && (
            <button
              onClick={writeItUp}
              disabled={writing.busy || !wordCount(note.content)}
              title={
                wordCount(note.content)
                  ? 'Gemini drafts a private page about this work from the card’s notes'
                  : 'Write some notes on this card first'
              }
            >
              <Sparkles size={15} />
              {writing.busy ? 'Writing it up…' : 'Write it up'}
            </button>
          )}
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
            Delete card
          </button>
        </div>
      </Dropdown>
      {writing.error && (
        <p className="publish-error" role="alert">
          {writing.error}
        </p>
      )}
    </div>
  );
}
