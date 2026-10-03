import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useNavigate } from 'react-router-dom';
import type { Board, Note } from '@/features/workspace/types';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
import { wordCount } from '@/lib/text';
import { EditorToolbar } from './components/EditorToolbar';
import { WritingBar } from './components/WritingBar';
import { LinkDialog } from './components/LinkDialog';
export function WritingEditor({ card, board }: { card: Note; board: Board }) {
  const title = useRef<HTMLTextAreaElement>(null),
    [savedEdit, setSavedEdit] = useState(card.updatedAt),
    [link, setLink] = useState<string | null>(null),
    [calm, setCalm] = useState(false);
  const { updateNote: update } = useWorkspaceActions(),
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
    // Typing keeps these equal; a difference means another device changed this note.
    if (editor && !editor.isDestroyed && editor.getHTML() !== card.content)
      editor.commands.setContent(card.content, { emitUpdate: false });
  }, [editor, card.content]);
  useEffect(() => {
    const timer = setTimeout(() => setSavedEdit(card.updatedAt), 500);
    return () => clearTimeout(timer);
  }, [card.updatedAt]);
  useEffect(() => {
    if (!calm) return;
    let start: { x: number; y: number } | null = null;
    // Ignore tiny movements, such as a hand resting on the trackpad.
    const wake = (event: MouseEvent) => {
      start ??= { x: event.clientX, y: event.clientY };
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) setCalm(false);
    };
    window.addEventListener('mousemove', wake);
    return () => window.removeEventListener('mousemove', wake);
  }, [calm]);
  useEffect(() => {
    const fn = (event: globalThis.KeyboardEvent) => {
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
  // Calm hides the controls while typing; moving the mouse brings them back.
  const calmProps = {
    onKeyDown: (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key.length === 1)
        setCalm(true);
    },
  };
  return (
    <div className={`writing-page ${calm ? 'is-calm' : ''}`}>
      <WritingBar
        note={card}
        board={board}
        onBack={() => navigate(`/board/${board.id}`)}
        saving={saving}
        saveError={saveError}
        syncStatus={syncStatus}
        toolbar={
          <EditorToolbar
            editor={editor}
            onLink={() => setLink(editor?.getAttributes('link').href || '')}
          />
        }
      />
      <article className="paper" {...calmProps}>
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
        <EditorContent editor={editor} />
      </article>
      <div className="writing-meta" aria-live="off">
        {count} {count === 1 ? 'word' : 'words'}
      </div>
      {link !== null && (
        <LinkDialog initialUrl={link} onClose={() => setLink(null)} onApply={applyLink} />
      )}
    </div>
  );
}
