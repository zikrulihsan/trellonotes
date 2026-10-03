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
