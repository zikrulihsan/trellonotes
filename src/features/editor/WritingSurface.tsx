import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { plainText, wordCount } from '@/lib/text';
import { writingExtensions } from './extensions';
import { EditorToolbar } from './components/EditorToolbar';
import { WritingBar } from './components/WritingBar';
import { LinkDialog } from './components/LinkDialog';
import { SlashMenu } from './components/SlashMenu';

export interface WritingDoc {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

/** The distraction-free page used to write board notes, Pages and free writing. */
export function WritingSurface({
  doc,
  onChange,
  backLabel,
  onBack,
  actions,
  menu,
  untitled = false,
  placeholder = 'Write freely, or type / for dates and templates…',
}: {
  doc: WritingDoc;
  onChange: (patch: { title?: string; content?: string }) => void;
  backLabel: string;
  onBack: () => void;
  /** Extra controls before the menu, such as a publish button. */
  actions?: ReactNode;
  menu: ReactNode;
  /** Free writing has no title; the text starts right away. */
  untitled?: boolean;
  placeholder?: string;
}) {
  const title = useRef<HTMLTextAreaElement>(null),
    slashKeys = useRef<(event: globalThis.KeyboardEvent) => boolean>(() => false),
    [savedEdit, setSavedEdit] = useState(doc.updatedAt),
    [link, setLink] = useState<string | null>(null),
    [calm, setCalm] = useState(false);
  const { saveError, syncStatus } = useWorkspace();
  const changeRef = useRef(onChange);
  useLayoutEffect(() => {
    changeRef.current = onChange;
  });
  const editor = useEditor({
    extensions: writingExtensions(placeholder),
    content: doc.content,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: 'writing-content',
        'aria-label': 'Content',
        role: 'textbox',
        'aria-multiline': 'true',
      },
      handleKeyDown: (_view, event) => slashKeys.current(event),
    },
    onUpdate: ({ editor }) => changeRef.current({ content: editor.getHTML() }),
    // Free writing and fresh templates (such as an empty checklist) start in the text,
    // once the editor is on the page (focusing waits a frame by itself).
    onMount: ({ editor }) => {
      if (untitled || ((doc.title || doc.content) && !plainText(doc.content)))
        focusFirstBlank(editor);
    },
  });
  useLayoutEffect(() => {
    // Open at the top, not at the previous screen's scroll position, and start a
    // brand-new page or note at its title.
    window.scrollTo(0, 0);
    if (!untitled && !doc.title && !doc.content) title.current?.focus();
    // Runs once per document; the surface is keyed by document id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLayoutEffect(() => {
    if (title.current) {
      title.current.style.height = 'auto';
      title.current.style.height = title.current.scrollHeight + 'px';
    }
  }, [doc.title]);
  useEffect(() => {
    // Typing keeps these equal; a difference means another device changed this text.
    if (editor && !editor.isDestroyed && editor.getHTML() !== doc.content)
      editor.commands.setContent(doc.content, { emitUpdate: false });
  }, [editor, doc.content]);
  useEffect(() => {
    const timer = setTimeout(() => setSavedEdit(doc.updatedAt), 500);
    return () => clearTimeout(timer);
  }, [doc.updatedAt]);
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
  const count = wordCount(doc.content);
  const saving = savedEdit !== doc.updatedAt;
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
    <div className={`writing-page ${calm ? 'is-calm' : ''} ${untitled ? 'is-untitled' : ''}`}>
      <WritingBar
        backLabel={backLabel}
        onBack={onBack}
        saving={saving}
        saveError={saveError}
        syncStatus={syncStatus}
        toolbar={
          <EditorToolbar
            editor={editor}
            onLink={() => setLink(editor?.getAttributes('link').href || '')}
          />
        }
      >
        {actions}
        {menu}
      </WritingBar>
      <article className="paper" {...calmProps}>
        {!untitled && (
          <textarea
            ref={title}
            className="note-title"
            aria-label="Title"
            placeholder="Untitled"
            rows={1}
            maxLength={200}
            value={doc.title}
            onChange={(e) => onChange({ title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                editor?.commands.focus('start');
              }
            }}
          />
        )}
        <EditorContent editor={editor} />
      </article>
      <SlashMenu editor={editor} keysRef={slashKeys} />
      <div className="writing-meta" aria-live="off">
        {count} {count === 1 ? 'word' : 'words'}
      </div>
      {link !== null && (
        <LinkDialog initialUrl={link} onClose={() => setLink(null)} onApply={applyLink} />
      )}
    </div>
  );
}

/** Lands in a template's first empty item, not the blank line the editor keeps after lists. */
function focusFirstBlank(editor: Editor) {
  if (editor.isDestroyed) return;
  let target: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (target !== null) return false;
    if ((node.type.name === 'taskItem' || node.type.name === 'listItem') && !node.textContent)
      target = pos + 2;
  });
  if (target === null) editor.commands.focus('end');
  else editor.chain().focus().setTextSelection(target).run();
}
