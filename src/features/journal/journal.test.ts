import { describe, expect, it } from 'vitest';
import { sampleWorkspace } from '@/test/sample-workspace';
import { isDoneList, journalWeek, shiftWeek, weekDraft, weekId } from './journal';

const wednesday = new Date(2026, 9, 7, 15).getTime();

describe('work journal', () => {
  it('reads common "done" names unless the writer says otherwise', () => {
    expect(isDoneList({ id: 'a', title: 'Done' })).toBe(true);
    expect(isDoneList({ id: 'a', title: ' selesai ' })).toBe(true);
    expect(isDoneList({ id: 'a', title: 'Doing' })).toBe(false);
    expect(isDoneList({ id: 'a', title: 'Done', done: false })).toBe(false);
    expect(isDoneList({ id: 'a', title: 'Sent to client', done: true })).toBe(true);
  });
  it('names a week by its Monday', () => {
    expect(weekId(wednesday)).toBe('2026-10-05');
    expect(weekId(new Date(2026, 9, 11, 23).getTime())).toBe('2026-10-05');
    expect(weekId(shiftWeek(wednesday, -1))).toBe('2026-09-28');
  });
  it('collects the week: finished, in progress, written, and notes', () => {
    const workspace = sampleWorkspace();
    const old = shiftWeek(wednesday, -2);
    workspace.cards = workspace.cards.map((note) => ({ ...note, updatedAt: old }));
    const slow = workspace.cards.find((note) => note.id === 'slow')!;
    slow.doneAt = wednesday;
    slow.title = 'Ship <the> page';
    workspace.cards.find((note) => note.id === 'attention')!.updatedAt = wednesday;
    workspace.pages = [{ id: 'p', title: 'Launch notes', content: '', updatedAt: wednesday }];
    workspace.journal = [{ id: '2026-10-05', content: 'A good week.\n\nMore soon.', updatedAt: 1 }];
    const week = journalWeek(workspace, wednesday);
    expect(week.finished.map((note) => note.id)).toEqual(['slow']);
    expect(week.progress.map((note) => note.id)).toEqual(['attention']);
    expect(week.pages.map((page) => page.id)).toEqual(['p']);
    expect(week.notes).toBe('A good week.\n\nMore soon.');
    expect(journalWeek(workspace, shiftWeek(wednesday, 1)).finished).toEqual([]);
    expect(weekDraft(workspace, week, 'Week of Oct 5').content).toBe(
      '<p>A good week.</p><p>More soon.</p><h2>What I finished</h2><h3>The writing room</h3><ul><li><p>Ship &lt;the&gt; page</p></li></ul>',
    );
  });
});
