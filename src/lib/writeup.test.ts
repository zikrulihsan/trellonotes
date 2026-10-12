import { describe, expect, it } from 'vitest';
import { sampleWorkspace } from '@/test/sample-workspace';
import { journalWeek } from '@/features/journal/journal';
import { cardNotes, draftPage, notesText, weekChoices, weekNotes } from './writeup';

const wednesday = new Date(2026, 9, 7, 15).getTime();

describe('write-ups', () => {
  it('turns card notes into lines, keeping checklists and nesting', () => {
    expect(
      notesText(
        '<h2>Plan</h2><p>Rough  idea</p><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>Set up auth</p></li><li data-type="taskItem" data-checked="false"><p>Write tests</p><ul><li><p>edge cases</p></li></ul></li></ul>',
      ),
    ).toBe('# Plan\nRough idea\n[x] Set up auth\n[ ] Write tests\n  - edge cases');
  });
  it('gives a card its board and status', () => {
    const workspace = sampleWorkspace();
    const note = workspace.cards.find((card) => card.id === 'notebook')!;
    const board = workspace.boards.find((board) => board.id === note.boardId)!;
    const list = board.lists.find((list) => list.id === note.listId)!;
    expect(cardNotes(workspace, note).split('\n').slice(0, 2)).toEqual([
      '### Notes from a quiet afternoon',
      `Board: ${board.title} · Status: in "${list.title}"`,
    ]);
  });
  it('sends only the picked parts of a week', () => {
    const workspace = sampleWorkspace();
    workspace.cards = workspace.cards.map((note) => ({ ...note, updatedAt: 1 }));
    workspace.cards.find((note) => note.id === 'slow')!.doneAt = wednesday;
    workspace.cards.find((note) => note.id === 'attention')!.updatedAt = wednesday;
    workspace.todos = [
      {
        id: 't',
        title: 'Errands',
        content: '<ul><li><p>Invoice</p></li></ul>',
        updatedAt: wednesday,
      },
    ];
    workspace.journal = [{ id: '2026-10-05', content: 'Busy week.', updatedAt: 1 }];
    const week = journalWeek(workspace, wednesday);
    expect(weekChoices(week).map((choice) => `${choice.group}: ${choice.id}`)).toEqual([
      'Finished: slow',
      'In progress: attention',
      'To-do lists: t',
    ]);
    const notes = weekNotes(workspace, week, new Set(['slow', 't']));
    expect(notes).toContain('## Finished this week\n\n### A case for taking the slower road');
    expect(notes).toContain('## To-do lists\n\n### Errands\n- Invoice');
    expect(notes).not.toContain('paying attention');
    expect(notes.endsWith('## My notes on the week\n\nBusy week.')).toBe(true);
  });
  it('makes a page from the draft', () => {
    expect(draftPage({ title: ' Shipped ', markdown: '## Done\n\n- One' }, 'Fallback')).toEqual({
      title: 'Shipped',
      content: '<h2>Done</h2><ul><li><p>One</p></li></ul>',
    });
    expect(draftPage({ title: '', markdown: 'Hi' }, 'Fallback').title).toBe('Fallback');
    expect(() => draftPage({}, 'Fallback')).toThrow();
  });
});
