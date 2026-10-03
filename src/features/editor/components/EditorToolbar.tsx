import { Bold, Italic, Heading1, Heading2, List, ListOrdered, Quote, Link } from 'lucide-react';
import type { Editor } from '@tiptap/react';
export function EditorToolbar({ editor, onLink }: { editor: Editor | null; onLink: () => void }) {
  const tool = (
    label: string,
    Icon: typeof Bold,
    active: boolean,
    action: () => void,
    disabled = false,
  ) => (
    <button
      type="button"
      key={label}
      className={`format-button ${active ? 'format-active' : ''}`}
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={action}
    >
      <Icon size={16} />
    </button>
  );
  return (
    <div className="format-tools" role="toolbar" aria-label="Writing formatting">
      {tool('Bold · ⌘/Ctrl B', Bold, !!editor?.isActive('bold'), () => {
        editor?.chain().focus().toggleBold().run();
      })}
      {tool('Italic · ⌘/Ctrl I', Italic, !!editor?.isActive('italic'), () => {
        editor?.chain().focus().toggleItalic().run();
      })}
      <span className="format-divider" />
      {tool(
        'Heading · type # and space',
        Heading1,
        !!editor?.isActive('heading', { level: 1 }),
        () => {
          editor?.chain().focus().toggleHeading({ level: 1 }).run();
        },
      )}
      {tool(
        'Subheading · type ## and space',
        Heading2,
        !!editor?.isActive('heading', { level: 2 }),
        () => {
          editor?.chain().focus().toggleHeading({ level: 2 }).run();
        },
      )}
      <span className="format-divider" />
      {tool('Bullet list · type - and space', List, !!editor?.isActive('bulletList'), () => {
        editor?.chain().focus().toggleBulletList().run();
      })}
      {tool(
        'Numbered list · type 1. and space',
        ListOrdered,
        !!editor?.isActive('orderedList'),
        () => {
          editor?.chain().focus().toggleOrderedList().run();
        },
      )}
      {tool('Quote · type > and space', Quote, !!editor?.isActive('blockquote'), () => {
        editor?.chain().focus().toggleBlockquote().run();
      })}
      {tool('Add or edit link', Link, !!editor?.isActive('link'), onLink)}
    </div>
  );
}
