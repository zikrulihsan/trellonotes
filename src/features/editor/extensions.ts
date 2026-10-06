import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { MarkdownPaste } from './markdown-paste';

/** The rich-text features shared by the writing editor and the public reader. */
export function writingExtensions(placeholder?: string) {
  return [
    StarterKit.configure({
      link: {
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      },
    }),
    // Checklists: type "[ ] " to start one, or use the toolbar or /todo.
    TaskList,
    TaskItem.configure({ nested: true }),
    // Multi-line plain text pastes as Markdown: lists, code, tables and links.
    MarkdownPaste,
    ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
  ];
}
