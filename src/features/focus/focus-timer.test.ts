import { describe, expect, it } from 'vitest';
import {
  advance,
  formatClock,
  initialFocus,
  isActive,
  pause,
  readFocus,
  reset,
  setFocusLength,
  start,
  timeLeft,
} from './focus-timer';

const MIN = 60_000;
const now = new Date(2026, 9, 4, 9, 0).getTime();

describe('focus timer', () => {
  it('runs, pauses and resumes from where it stopped', () => {
    let state = start(initialFocus(25, now), now);
    expect(timeLeft(state, now + 10 * MIN)).toBe(15 * MIN);
    state = pause(state, now + 10 * MIN);
    expect(timeLeft(state, now + 60 * MIN)).toBe(15 * MIN);
    state = start(state, now + 60 * MIN);
    expect(timeLeft(state, now + 65 * MIN)).toBe(10 * MIN);
  });

  it('cycles four focus sessions with short breaks, then a long break', () => {
    let state = initialFocus(25, now);
    const phases: string[] = [];
    for (let i = 0; i < 8; i++) {
      state = advance(state, now, true);
      phases.push(`${state.phase}:${timeLeft(state, now) / MIN}`);
    }
    expect(phases).toEqual([
      'short:5',
      'focus:25',
      'short:5',
      'focus:25',
      'short:5',
      'focus:25',
      'long:15',
      'focus:25',
    ]);
    expect(state.round).toBe(0);
    expect(state.today.count).toBe(4);
  });

  it('does not count a skipped focus session, and starts each day at zero', () => {
    const skipped = advance(initialFocus(25, now), now, false);
    expect(skipped.today.count).toBe(0);
    const yesterday = { ...initialFocus(25, now - 24 * 60 * MIN), today: { day: 'x', count: 7 } };
    expect(advance(yesterday, now, true).today.count).toBe(1);
  });

  it('changes length right away only when the timer is untouched', () => {
    expect(timeLeft(setFocusLength(initialFocus(25, now), 50), now)).toBe(50 * MIN);
    const midway = pause(start(initialFocus(25, now), now), now + MIN);
    const changed = setFocusLength(midway, 50);
    expect(timeLeft(changed, now)).toBe(24 * MIN);
    expect(timeLeft(reset(changed), now)).toBe(50 * MIN);
  });

  it('knows when it is in use', () => {
    const fresh = initialFocus(25, now);
    expect(isActive(fresh)).toBe(false);
    expect(isActive(start(fresh, now))).toBe(true);
    expect(isActive(pause(start(fresh, now), now + 1000))).toBe(true);
  });

  it('formats the clock and survives a bad saved value', () => {
    expect(formatClock(25 * MIN)).toBe('25:00');
    expect(formatClock(61_500)).toBe('1:02');
    expect(readFocus('{oops').phase).toBe('focus');
    expect(readFocus(JSON.stringify({ phase: 'nap' })).remaining).toBe(25 * MIN);
  });
});
