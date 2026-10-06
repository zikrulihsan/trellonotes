import { Extension } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { markdownToHtml } from './markdown';

/**
 * Pasting plain text with more than one line reads it as Markdown, so notes copied from
 * a terminal or a README keep their headings, lists, code and tables.
 * Shift+paste (⌘/Ctrl ⇧ V) keeps the text exactly as it was.
 */
export const MarkdownPaste = Extension.create({
  name: 'markdownPaste',
  addProseMirrorPlugins() {
    const editor = this.editor;
    let shift = false;
    return [
      new Plugin({
        key: new PluginKey('markdownPaste'),
        props: {
          handleDOMEvents: {
            keydown: (_view, event) => {
              shift = event.shiftKey;
              return false;
            },
            keyup: () => {
              shift = false;
              return false;
            },
          },
          handlePaste: (view, event) => {
            const data = event.clipboardData;
            const text = data?.getData('text/plain');
            if (!data || !text || !text.includes('\n') || shift || !view.editable) return false;
            // Rich copies keep their own formatting, except code editors such as VS Code,
            // whose HTML is only coloured lines.
            if (data.getData('text/html') && !data.types.includes('vscode-editor-data'))
              return false;
            if (view.state.selection.$from.parent.type.spec.code) return false;
            return editor.chain().focus().insertContent(markdownToHtml(text)).run();
          },
        },
      }),
    ];
  },
});
