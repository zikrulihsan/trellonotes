import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/react';
import { writingExtensions } from './extensions';

const render = (html: string) => {
  const editor = new Editor({
    element: document.createElement('div'),
    extensions: writingExtensions(),
    content: html,
  });
  const pre = editor.view.dom.querySelector('pre')!;
  return { editor, pre };
};

describe('code highlighting', () => {
  it('colours a block by its language, and by a guess when it has none', () => {
    const { editor, pre } = render(
      '<pre><code class="language-shell">kubectl apply -f x.yaml # apply it</code></pre>',
    );
    expect(pre.querySelector('.hljs-comment')?.textContent).toBe('# apply it');
    editor.commands.setContent('<pre><code>const answer = 42;</code></pre>');
    expect(editor.view.dom.querySelector('pre .hljs-number')?.textContent).toBe('42');
    editor.destroy();
  });

  it('leaves box-drawing tables uncoloured and keeps the saved HTML plain', () => {
    const table = '┌────┬────┐\n│ if │ 42 │\n└────┴────┘';
    const { editor, pre } = render(`<pre><code class="language-table">${table}</code></pre>`);
    expect(pre.querySelector('[class^="hljs-"]')).toBeNull();
    expect(pre.textContent).toBe(table);
    expect(editor.getHTML()).toBe(`<pre><code class="language-table">${table}</code></pre>`);
    editor.destroy();
  });
});
