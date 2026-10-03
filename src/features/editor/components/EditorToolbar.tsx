import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link,
  Minus,
  Undo2,
  Redo2,
  Pilcrow,
} from 'lucide-react';
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
      <Icon size={17} />
    </button>
  );
  return (
    <div className="format-bar" role="toolbar" aria-label="Writing formatting">
      <div className="format-tools">
        {tool('Paragraph', Pilcrow, !editor?.isActive('heading'), () => {
          editor?.chain().focus().setParagraph().run();
        })}
        <span className="format-divider" />
        {tool('Bold · ⌘/Ctrl B', Bold, !!editor?.isActive('bold'), () => {
          editor?.chain().focus().toggleBold().run();
        })}
        {tool('Italic · ⌘/Ctrl I', Italic, !!editor?.isActive('italic'), () => {
          editor?.chain().focus().toggleItalic().run();
        })}
        {tool('Underline · ⌘/Ctrl U', Underline, !!editor?.isActive('underline'), () => {
          editor?.chain().focus().toggleUnderline().run();
        })}
        <span className="format-divider" />
        {tool('Large heading', Heading1, !!editor?.isActive('heading', { level: 1 }), () => {
          editor?.chain().focus().toggleHeading({ level: 1 }).run();
        })}
        {tool('Small heading', Heading2, !!editor?.isActive('heading', { level: 2 }), () => {
          editor?.chain().focus().toggleHeading({ level: 2 }).run();
        })}
        <span className="format-divider" />
        {tool('Bullet list', List, !!editor?.isActive('bulletList'), () => {
          editor?.chain().focus().toggleBulletList().run();
        })}
        {tool('Numbered list', ListOrdered, !!editor?.isActive('orderedList'), () => {
          editor?.chain().focus().toggleOrderedList().run();
        })}
        {tool('Quote', Quote, !!editor?.isActive('blockquote'), () => {
          editor?.chain().focus().toggleBlockquote().run();
        })}
        {tool('Add or edit link', Link, !!editor?.isActive('link'), onLink)}
        {tool('Divider', Minus, false, () => {
          editor?.chain().focus().setHorizontalRule().run();
        })}
        <span className="format-divider" />
        {tool(
          'Undo',
          Undo2,
          false,
          () => {
            editor?.chain().focus().undo().run();
          },
          !editor?.can().undo(),
        )}
        {tool(
          'Redo',
          Redo2,
          false,
          () => {
            editor?.chain().focus().redo().run();
          },
          !editor?.can().redo(),
        )}
      </div>
    </div>
  );
}
