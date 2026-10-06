import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/react';
import { Slice } from '@tiptap/pm/model';
import { writingExtensions } from './extensions';
import { isCommandLine, markdownToHtml, renderInline } from './markdown';

// Notes copied from a terminal: the first line lost its indent, lines wrapped at the
// terminal's width, and commands came without fences.
const TERMINAL_NOTE = `1. Review dan merge PR #42 ke develop
  - https://github.com/example/repo/pull/42
  - Opsional: perbarui baris checklist di deskripsi PR.

  2. Yang otomatis terjadi saat merge:

  ┌──────────────┬──────────────────┐
  │   Service    │      Hasil       │
  ├──────────────┼──────────────────┤
  │ Translate    │ ❌ tidak otomatis │
  └──────────────┴──────────────────┘

  3. Yang harus dilakukan manual:
  - Apply ingress dev. CI hanya restart deployment:
  kubectl apply -f k8s/embedding-4b/ingress-dev.yaml
  kubectl apply -f k8s/translate-v2/ingress-dev.yaml
    Sebelum apply, cek dulu dengan kubectl diff -f <file>. Perbedaannya seharusnya
    hanya tambahan && !PathPrefix(...).
  - Translate: jalankan build-translate-image.yml secara
    manual, lalu deploy image-nya.

  4. Verifikasi di dev:

  for h in embedding.dev.hukum.io translate.dev.hukum.io; do
    echo "$h health=$(curl -s -o /dev/null -w '%{http_code}' https://$h/health) metrics=$(curl -s
  -o /dev/null -w '%{http_code}' https://$h/metrics)"
  done
  # b. token embedding naik setelah ada request
  kubectl -n nomos exec deploy/embedding-4b-serve -- curl -s localhost:9464/metrics | grep
  vllm:prompt_tokens
  Setelah itu, import docs/dashboards/serving-capacity.json ke Grafana.

  5. Prod: rilis lewat tag embedding-v*, lalu apply
  k8s/embedding-4b/ingress.yaml (sekarang
  masih 200).`;

const parse = (text: string) =>
  new DOMParser().parseFromString(markdownToHtml(text), 'text/html').body;

describe('markdownToHtml', () => {
  it('reads a note copied from a terminal', () => {
    const body = parse(TERMINAL_NOTE);
    const top = [...body.children].map((el) => el.tagName);
    expect(top).toEqual(['OL', 'PRE', 'OL', 'PRE', 'P', 'OL']);

    const [first, second, third] = body.querySelectorAll(':scope > ol');
    expect(first.querySelectorAll('li li a')[0].getAttribute('href')).toBe(
      'https://github.com/example/repo/pull/42',
    );
    expect(second.getAttribute('start')).toBe('3');
    expect(third.getAttribute('start')).toBe('5');

    // The table keeps its spacing, line for line.
    const table = body.querySelectorAll('pre')[0].textContent!;
    expect(table.split('\n')[1]).toBe('│   Service    │      Hasil       │');

    // Bullets right under "3." sit inside it, and the commands inside the first bullet.
    const bullets = second.querySelectorAll(':scope > li:first-child > ul > li');
    expect(bullets).toHaveLength(2);
    expect(bullets[0].querySelector('pre')!.textContent).toBe(
      'kubectl apply -f k8s/embedding-4b/ingress-dev.yaml\n' +
        'kubectl apply -f k8s/translate-v2/ingress-dev.yaml',
    );
    expect(bullets[0].querySelectorAll('p')[1].innerHTML).toBe(
      // A long line was wrapped by the terminal, so it joins the next one.
      'Sebelum apply, cek dulu dengan kubectl diff -f &lt;file&gt;. Perbedaannya seharusnya ' +
        'hanya tambahan &amp;&amp; !PathPrefix(...).',
    );
    expect(second.querySelectorAll(':scope > li')).toHaveLength(2);

    // The loop, its wrapped lines and the comments stay one shell block.
    const shell = body.querySelectorAll(':scope > pre')[1];
    expect(shell.querySelector('code')!.className).toBe('language-shell');
    expect(shell.textContent!.split('\n')).toHaveLength(7);
    expect(shell.textContent).toContain('| grep\nvllm:prompt_tokens');
    expect(body.querySelector(':scope > p')!.textContent).toMatch(/^Setelah itu/);

    expect(third.querySelector('p')!.innerHTML).toBe(
      'Prod: rilis lewat tag embedding-v*, lalu apply<br>k8s/embedding-4b/ingress.yaml (sekarang<br>masih 200).',
    );
  });

  it('reads Markdown headings, fences, quotes, checklists and rules', () => {
    const html = markdownToHtml(
      '# Plan\n\nSome **bold** and `code`.\n\n```ts\nconst a = 1;\n  indented();\n```\n\n> quoted\n\n- [x] done\n- [ ] next\n\n---',
    );
    expect(html).toBe(
      '<h1>Plan</h1><p>Some <strong>bold</strong> and <code>code</code>.</p>' +
        '<pre><code class="language-ts">const a = 1;\n  indented();</code></pre>' +
        '<blockquote><p>quoted</p></blockquote>' +
        '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>done</p></li>' +
        '<li data-type="taskItem" data-checked="false"><p>next</p></li></ul><hr>',
    );
  });

  it('keeps short lines on their own line', () => {
    expect(markdownToHtml('Jl. Merdeka 1\nJakarta\n\nNext')).toBe(
      '<p>Jl. Merdeka 1<br>Jakarta</p><p>Next</p>',
    );
  });

  it('nests lists by indentation', () => {
    expect(markdownToHtml('- a\n  - b\n    1. c\n- d')).toBe(
      '<ul><li><p>a</p><ul><li><p>b</p><ol><li><p>c</p></li></ol></li></ul></li><li><p>d</p></li></ul>',
    );
  });

  it('reads a Markdown pipe table as a real table, with its column alignment', () => {
    expect(markdownToHtml('| a | b |\n|---|:---:|\n| 1 | 2 |\n| 3 |')).toBe(
      '<table><tr><th><p>a</p></th><th><p style="text-align: center">b</p></th></tr>' +
        '<tr><td><p>1</p></td><td><p style="text-align: center">2</p></td></tr>' +
        '<tr><td><p>3</p></td><td><p style="text-align: center"></p></td></tr></table>',
    );
  });

  it('keeps a table without a |---| row, and box drawing, aligned in a code block', () => {
    expect(markdownToHtml('| a | b |\n| 1 | 2 |')).toBe(
      '<pre><code class="language-table">| a | b |\n| 1 | 2 |</code></pre>',
    );
  });
});

describe('renderInline', () => {
  it('formats links, code and emphasis, and escapes the rest', () => {
    expect(renderInline('See [docs](https://a.io/x) or https://b.io/y.')).toBe(
      'See <a href="https://a.io/x">docs</a> or <a href="https://b.io/y">https://b.io/y</a>.',
    );
    expect(renderInline('run `a <b> && c` *now* ~~old~~')).toBe(
      'run <code>a &lt;b&gt; &amp;&amp; c</code> <em>now</em> <s>old</s>',
    );
    // Globs and snake_case are not formatting.
    expect(renderInline('serve_common/** changed, 2 * 3 * 4')).toBe(
      'serve_common/** changed, 2 * 3 * 4',
    );
    expect(renderInline('(see https://c.io/z)')).toBe(
      '(see <a href="https://c.io/z">https://c.io/z</a>)',
    );
    expect(renderInline('[x](javascript:alert(1))')).toBe('[x](javascript:alert(1))');
    expect(renderInline('keep ==this bit== in mind')).toBe('keep <mark>this bit</mark> in mind');
  });
});

describe('isCommandLine', () => {
  it('spots shell commands but not prose', () => {
    expect(isCommandLine('kubectl apply -f x.yaml')).toBe(true);
    expect(isCommandLine('$ npm test')).toBe(true);
    expect(isCommandLine('for h in a b; do')).toBe(true);
    expect(isCommandLine('Make sure the build passes')).toBe(false);
    expect(isCommandLine('done with the review today')).toBe(true);
  });
});

describe('pasting into the editor', () => {
  const paste = (editor: Editor, types: Record<string, string>, shift = false) => {
    if (shift) editor.view.dom.dispatchEvent(new KeyboardEvent('keydown', { shiftKey: true }));
    const event = {
      clipboardData: { types: Object.keys(types), getData: (type: string) => types[type] ?? '' },
    } as unknown as ClipboardEvent;
    return editor.view.someProp('handlePaste', (handle) => handle(editor.view, event, Slice.empty));
  };

  it('turns multi-line plain text into formatted writing', () => {
    const editor = new Editor({ extensions: writingExtensions() });
    expect(paste(editor, { 'text/plain': TERMINAL_NOTE })).toBe(true);
    const html = editor.getHTML();
    expect(html).toContain('<ol start="3">');
    expect(html).toContain('<pre><code class="language-shell">for h in');
    expect(html).toContain('│   Service    │      Hasil       │');
    expect(html).toContain(
      '<a target="_blank" rel="noopener noreferrer" href="https://github.com/example/repo/pull/42">',
    );
    editor.destroy();
  });

  it('pastes a Markdown table as a table that can be edited', () => {
    const editor = new Editor({ extensions: writingExtensions() });
    expect(
      paste(editor, { 'text/plain': '| Service | Hasil |\n|---|---|\n| Translate | manual |' }),
    ).toBe(true);
    const html = editor.getHTML();
    expect(html).toContain('<table');
    expect(html).toContain('<th');
    expect(html).toContain('Translate');
    editor.destroy();
  });

  it('leaves single lines, rich copies, code blocks and shift-paste to the editor', () => {
    const editor = new Editor({ extensions: writingExtensions() });
    expect(paste(editor, { 'text/plain': 'one line' })).toBeFalsy();
    expect(paste(editor, { 'text/plain': 'a\nb', 'text/html': '<p>a</p><p>b</p>' })).toBeFalsy();
    expect(paste(editor, { 'text/plain': 'a\nb' }, true)).toBeFalsy();
    editor.commands.setContent('<pre><code>x</code></pre>');
    editor.commands.setTextSelection(2);
    editor.view.dom.dispatchEvent(new KeyboardEvent('keyup'));
    expect(paste(editor, { 'text/plain': 'a\nb' })).toBeFalsy();
    editor.destroy();
  });
});
