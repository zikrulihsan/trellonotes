import { describe, expect, it } from 'vitest';
import { addNoteToWorkspace, noteFromText, parseBotMessage, telegramStartLink } from './bot';
import type { Workspace } from '@/features/workspace/types';

const workspace: Workspace = {
  boards: [
    { id: 'b1', title: 'Work', description: '', color: '', lists: [] },
    {
      id: 'b2',
      title: 'Life',
      description: '',
      color: '',
      lists: [
        { id: 'l1', title: 'Today' },
        { id: 'l2', title: 'Later' },
      ],
    },
  ],
  cards: [],
};

describe('parseBotMessage', () => {
  it('reads commands, with or without the bot name and argument', () => {
    expect(parseBotMessage('/start abc123')).toEqual({ kind: 'start', code: 'abc123' });
    expect(parseBotMessage('/start@FolioBot')).toEqual({ kind: 'start', code: null });
    expect(parseBotMessage('/STOP')).toEqual({ kind: 'stop' });
    expect(parseBotMessage('/nope')).toEqual({ kind: 'unknown-command' });
  });
  it('treats other text as a note and ignores blank messages', () => {
    expect(parseBotMessage('  Buy milk ')).toEqual({
      kind: 'note',
      title: 'Buy milk',
      content: '',
    });
    expect(parseBotMessage('   ')).toBeNull();
  });
});

describe('noteFromText', () => {
  it('uses the first line as the title and escapes the rest into paragraphs', () => {
    expect(noteFromText('Meeting\nwith <Ana>\nat 3\n\nbring notes')).toEqual({
      title: 'Meeting',
      content: '<p>with &lt;Ana&gt;<br>at 3</p><p>bring notes</p>',
    });
  });
  it('shortens a very long first line and keeps it whole in the body', () => {
    const long = 'x'.repeat(250);
    const note = noteFromText(long);
    expect(note.title).toHaveLength(200);
    expect(note.content).toBe(`<p>${long}</p>`);
  });
});

describe('addNoteToWorkspace', () => {
  it('falls back to the first board that has a list', () => {
    const added = addNoteToWorkspace(workspace, { title: 'Run', content: '' }, null);
    expect(added?.list.id).toBe('l1');
    expect(added?.workspace.cards).toMatchObject([{ boardId: 'b2', listId: 'l1', title: 'Run' }]);
  });
  it('uses the chosen list while it exists', () => {
    const added = addNoteToWorkspace(
      workspace,
      { title: 'Read', content: '<p>a</p>' },
      { boardId: 'b2', listId: 'l2' },
    );
    expect(added?.workspace.cards[0]).toMatchObject({ listId: 'l2', content: '<p>a</p>' });
  });
  it('rejects data that is not a workspace', () => {
    expect(addNoteToWorkspace({ boards: 'no' }, { title: 'x', content: '' }, null)).toBeNull();
  });
});

it('builds a deep link that starts the bot with the code', () => {
  expect(telegramStartLink('@FolioBot', 'abc')).toBe('https://t.me/FolioBot?start=abc');
});
