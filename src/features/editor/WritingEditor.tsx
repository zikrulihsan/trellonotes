import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useNavigate } from 'react-router-dom';
import type { Board, Note } from '@/features/workspace/types';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
import { wordCount } from '@/lib/text';
import { editedLabel } from '@/lib/note-metadata';
import { EditorToolbar } from './components/EditorToolbar';
import { EditorControls } from './components/EditorControls';
import { LinkDialog } from './components/LinkDialog';
export function WritingEditor({ card, board }: { card: Note; board: Board }) {
  const title = useRef<HTMLTextAreaElement>(null),
    [savedEdit, setSavedEdit] = useState(card.updatedAt),
    [link, setLink] = useState<string | null>(null);
  const { updateNote: update, moveNote } = useWorkspaceActions(),
    { saveError, syncStatus } = useWorkspace(),
    navigate = useNavigate();
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
        },
      }),
      Placeholder.configure({ placeholder: 'Let your ideas find their way onto the page…' }),
    ],
    content: card.content,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: 'writing-content',
        'aria-label': 'Note content',
        role: 'textbox',
        'aria-multiline': 'true',
      },
    },
    onUpdate: ({ editor }) => update(card.id, { content: editor.getHTML() }),
  });
  useLayoutEffect(() => {
    if (title.current) {
      title.current.style.height = 'auto';
      title.current.style.height = title.current.scrollHeight + 'px';
    }
  }, [card.title]);
  useEffect(() => {
    const timer = setTimeout(() => setSavedEdit(card.updatedAt), 500);
    return () => clearTimeout(timer);
  }, [card.updatedAt]);
  useEffect(() => {
    const fn = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') event.preventDefault();
      if (event.key === 'Escape') setLink(null);
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);
  const count = wordCount(card.content);
  const saving = savedEdit !== card.updatedAt;
  const applyLink = (url: string) => {
    if (url) editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    else editor?.chain().focus().unsetLink().run();
  };
  return (
    <div className="writing-page">
      <EditorControls
        note={card}
        onBack={() => navigate(`/board/${board.id}`)}
        saving={saving}
        saveError={saveError}
        syncStatus={syncStatus}
      />
      <EditorToolbar
        editor={editor}
        onLink={() => setLink(editor?.getAttributes('link').href || '')}
      />
      <div className="paper">
        <div className="note-context">
          <span className={`tag tag-${card.tag.toLowerCase()}`}>{card.tag}</span>
          <span className="note-context-divider" />
          <select
            aria-label="Move note to list"
            value={card.listId}
            onChange={(e) => moveNote(card.id, e.target.value)}
          >
            {board.lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        </div>
        <textarea
          ref={title}
          className="note-title"
          aria-label="Note title"
          placeholder="Untitled"
          rows={1}
          maxLength={200}
          value={card.title}
          onChange={(e) => update(card.id, { title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              editor?.commands.focus('start');
            }
          }}
        />
        <div className="note-byline">
          <span className="writer-avatar">S</span>
          <span>{editedLabel(card.updatedAt)}</span>
          <span className="byline-dot">·</span>
          <span>{count} words</span>
        </div>
        <EditorContent editor={editor} />
        <div className="paper-footer">
          <span>
            {count} {count === 1 ? 'word' : 'words'}
          </span>
          <span>One idea at a time.</span>
        </div>
      </div>
      {link !== null && (
        <LinkDialog initialUrl={link} onClose={() => setLink(null)} onApply={applyLink} />
      )}
    </div>
  );
}
