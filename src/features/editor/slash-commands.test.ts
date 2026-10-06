import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/react';
import { writingExtensions } from './extensions';
import { findSlashQuery, formatDate, matchSlashCommands } from './slash-commands';
import { slugify } from '@/lib/slug';

let editor: Editor | null = null;
afterEach(() => editor?.destroy());

function typeInto(text: string) {
  editor = new Editor({ extensions: writingExtensions(), content: '<p></p>' });
  editor.commands.insertContent(text);
  return editor;
}
function runSlash(text: string, now: Date) {
  const ed = typeInto(text);
  const query = findSlashQuery(ed)!;
  matchSlashCommands(query.query)[0].run(ed, query, now);
  return ed;
}

describe('slash commands', () => {
  const now = new Date(2026, 9, 4, 14, 30);

  it('finds a command typed after a space or at the start of a line, not inside a word', () => {
    expect(findSlashQuery(typeInto('Status /da'))?.query).toBe('da');
    expect(findSlashQuery(typeInto('/now'))?.query).toBe('now');
    expect(findSlashQuery(typeInto('and/or'))).toBeNull();
  });

  it('matches by id, title and Indonesian keywords', () => {
    expect(matchSlashCommands('date')[0].id).toBe('date');
    expect(matchSlashCommands('tanggal')[0].id).toBe('date');
    expect(matchSlashCommands('laporan').map((c) => c.id)).toEqual(['update', 'weekly']);
  });

  it('turns /todo into a checklist', () => {
    const html = runSlash('/todo', now).getHTML();
    expect(html).toContain('data-type="taskList"');
    expect(html).toContain('data-checked="false"');
  });

  it('inserts a table, a heading and a highlight', () => {
    const table = runSlash('/table', now).getHTML();
    expect(table).toContain('<table');
    expect(table.match(/<tr>/g)).toHaveLength(3);
    expect(table.match(/<th/g)).toHaveLength(3);
    expect(runSlash('/h2', now).getHTML()).toContain('<h2>');
    const ed = runSlash('/highlight', now);
    ed.commands.insertContent('penting');
    expect(ed.getHTML()).toContain('<mark>penting</mark>');
  });

  it('nests a list item with Tab and lifts it back with Shift+Tab', () => {
    const ed = typeInto('');
    ed.commands.setContent('<ul><li><p>a</p></li><li><p>b</p></li></ul>');
    let inB = 0;
    ed.state.doc.descendants((node, pos) => {
      if (node.isText && node.text === 'b') inB = pos + 1;
    });
    ed.commands.setTextSelection(inB);
    const press = (key: string, shiftKey = false) =>
      ed.view.someProp('handleKeyDown', (handle) =>
        handle(ed.view, new KeyboardEvent('keydown', { key, shiftKey })),
      );
    expect(press('Tab')).toBe(true);
    expect(ed.getHTML()).toContain('<ul><li><p>a</p><ul><li><p>b</p></li></ul></li></ul>');
    expect(press('Tab', true)).toBe(true);
    expect(ed.getHTML()).toContain('<ul><li><p>a</p></li><li><p>b</p></li></ul>');
  });

  it('replaces /date with today’s date', () => {
    expect(runSlash('Report /date', now).getText()).toBe(`Report ${formatDate(now)}`);
  });

  it('inserts a progress update and puts the cursor in the first bullet', () => {
    const ed = runSlash('/update', now);
    expect(ed.getHTML()).toContain(`Progress update · ${formatDate(now)}`);
    expect(ed.getHTML()).toContain('<strong>Blockers</strong>');
    ed.commands.insertContent('Shipped labels');
    expect(ed.getHTML()).toContain('<li><p>Shipped labels</p></li>');
    expect(ed.getHTML().indexOf('Shipped labels')).toBeLessThan(
      ed.getHTML().indexOf('In progress'),
    );
  });
});

describe('page links', () => {
  it('makes readable, URL-safe slugs', () => {
    expect(slugify('Catatan Minggu Ini: Rilis 2.0!')).toBe('catatan-minggu-ini-rilis-2-0');
    expect(slugify('Café déjà vu')).toBe('cafe-deja-vu');
    expect(slugify('???')).toBe('');
  });
});
