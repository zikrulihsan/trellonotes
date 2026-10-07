import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  BetweenHorizontalStart,
  BetweenVerticalStart,
  Bold,
  Code,
  Columns3,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Rows3,
  Strikethrough,
  Table,
  Trash2,
  Underline,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { canUploadMedia as canAddImages } from '@/lib/media';
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
  /** A button that only toggles something on the writing, with no pressed state. */
  const action = (label: string, Icon: typeof Bold, run: () => void) =>
    tool(label, Icon, false, run);
  const chain = () => editor?.chain().focus();
  const inTable = !!editor?.isActive('table');
  return (
    <div className="format-tools" role="toolbar" aria-label="Writing formatting">
      {tool('Bold · ⌘/Ctrl B', Bold, !!editor?.isActive('bold'), () => {
        chain()?.toggleBold().run();
      })}
      {tool('Italic · ⌘/Ctrl I', Italic, !!editor?.isActive('italic'), () => {
        chain()?.toggleItalic().run();
      })}
      {tool('Underline · ⌘/Ctrl U', Underline, !!editor?.isActive('underline'), () => {
        chain()?.toggleUnderline().run();
      })}
      {tool('Strikethrough · ⌘/Ctrl ⇧ S', Strikethrough, !!editor?.isActive('strike'), () => {
        chain()?.toggleStrike().run();
      })}
      {tool('Highlight · ⌘/Ctrl ⇧ H', Highlighter, !!editor?.isActive('highlight'), () => {
        chain()?.toggleHighlight().run();
      })}
      {tool('Code · ⌘/Ctrl E', Code, !!editor?.isActive('code'), () => {
        chain()?.toggleCode().run();
      })}
      <span className="format-divider" />
      {tool(
        'Heading · type # and space',
        Heading1,
        !!editor?.isActive('heading', { level: 1 }),
        () => {
          chain()?.toggleHeading({ level: 1 }).run();
        },
      )}
      {tool(
        'Subheading · type ## and space',
        Heading2,
        !!editor?.isActive('heading', { level: 2 }),
        () => {
          chain()?.toggleHeading({ level: 2 }).run();
        },
      )}
      {tool(
        'Small heading · type ### and space',
        Heading3,
        !!editor?.isActive('heading', { level: 3 }),
        () => {
          chain()?.toggleHeading({ level: 3 }).run();
        },
      )}
      <span className="format-divider" />
      {tool('Bullet list · type - and space', List, !!editor?.isActive('bulletList'), () => {
        chain()?.toggleBulletList().run();
      })}
      {tool(
        'Numbered list · type 1. and space',
        ListOrdered,
        !!editor?.isActive('orderedList'),
        () => {
          chain()?.toggleOrderedList().run();
        },
      )}
      {tool('Checklist · type [ ] and space', ListChecks, !!editor?.isActive('taskList'), () => {
        chain()?.toggleTaskList().run();
      })}
      {tool('Quote · type > and space', Quote, !!editor?.isActive('blockquote'), () => {
        chain()?.toggleBlockquote().run();
      })}
      <span className="format-divider" />
      {tool('Align left · ⌘/Ctrl ⇧ L', AlignLeft, !!editor?.isActive({ textAlign: 'left' }), () => {
        chain()?.setTextAlign('left').run();
      })}
      {tool('Centre · ⌘/Ctrl ⇧ E', AlignCenter, !!editor?.isActive({ textAlign: 'center' }), () => {
        chain()?.setTextAlign('center').run();
      })}
      {tool(
        'Align right · ⌘/Ctrl ⇧ R',
        AlignRight,
        !!editor?.isActive({ textAlign: 'right' }),
        () => {
          chain()?.setTextAlign('right').run();
        },
      )}
      <span className="format-divider" />
      {tool('Table · type /table', Table, inTable, () => {
        chain()?.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      })}
      {inTable && (
        <>
          {action('Add row below', BetweenHorizontalStart, () => {
            chain()?.addRowAfter().run();
          })}
          {action('Add column to the right', BetweenVerticalStart, () => {
            chain()?.addColumnAfter().run();
          })}
          {action('Delete row', Rows3, () => {
            chain()?.deleteRow().run();
          })}
          {action('Delete column', Columns3, () => {
            chain()?.deleteColumn().run();
          })}
          {action('Delete table', Trash2, () => {
            chain()?.deleteTable().run();
          })}
        </>
      )}
      {tool('Add or edit link', Link, !!editor?.isActive('link'), onLink)}
      {canAddImages &&
        action('Add image · paste, drop, or /image', ImagePlus, () => {
          chain()?.pickImage().run();
        })}
    </div>
  );
}
