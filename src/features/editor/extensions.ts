import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { TableKit } from '@tiptap/extension-table';
import { MarkdownPaste } from './markdown-paste';
import { CodeHighlight } from './code-highlight';

/** The rich-text features shared by the writing editor and the public reader. */
export function writingExtensions(placeholder?: string) {
  return [
    StarterKit.configure({
      codeBlock: false,
      link: {
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      },
    }),
    // Checklists: type "[ ] " to start one, or use the toolbar or /todo.
    // Tab nests the item under the one above it, Shift+Tab lifts it back out.
    TaskList,
    TaskItem.configure({ nested: true }),
    // Marker pen: ⌘/Ctrl ⇧ H, the toolbar, /highlight, or ==text== when pasting.
    Highlight,
    // Left, centre and right for paragraphs and headings.
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    // Editable tables, with draggable column edges.
    TableKit.configure({ table: { resizable: true } }),
    // Code blocks coloured by language: type ``` (or ```ts) and space, or use /code.
    CodeHighlight,
    // Multi-line plain text pastes as Markdown: lists, code, tables and links.
    MarkdownPaste,
    ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
  ];
}
