/** A Pomodoro cycle: four focus sessions with short breaks between, then a long break. */
export type FocusPhase = 'focus' | 'short' | 'long';

export interface FocusState {
  phase: FocusPhase;
  /** When the running phase ends (ms since epoch); null while stopped or paused. */
  endsAt: number | null;
  /** Milliseconds left while stopped or paused. */
  remaining: number;
  /** Focus sessions finished in the current cycle (0–3). */
  round: number;
  focusMinutes: number;
  /** Focus sessions finished today, on this device. */
  today: { day: string; count: number };
}

export const FOCUS_LENGTHS = [15, 25, 50] as const;
export const ROUNDS = 4;
const MINUTE = 60_000;

/** Breaks scale with the focus length: 25 min of focus earns 5 min, every fourth earns 15. */
export function phaseMinutes(phase: FocusPhase, focusMinutes: number): number {
  const short = Math.round(focusMinutes / 5);
  return phase === 'focus' ? focusMinutes : phase === 'short' ? short : short * 3;
}

const dayKey = (now: number) => new Date(now).toDateString();

export function initialFocus(focusMinutes = 25, now = Date.now()): FocusState {
  return {
    phase: 'focus',
    endsAt: null,
    remaining: focusMinutes * MINUTE,
    round: 0,
    focusMinutes,
    today: { day: dayKey(now), count: 0 },
  };
}

export const isRunning = (state: FocusState) => state.endsAt !== null;

/** Whether the timer has been started and not reset, i.e. worth showing outside its panel. */
export const isActive = (state: FocusState) =>
  isRunning(state) || state.remaining !== phaseMinutes(state.phase, state.focusMinutes) * MINUTE;

export function timeLeft(state: FocusState, now: number): number {
  return state.endsAt === null ? state.remaining : Math.max(0, state.endsAt - now);
}

export function start(state: FocusState, now: number): FocusState {
  return isRunning(state) ? state : { ...state, endsAt: now + state.remaining };
}

export function pause(state: FocusState, now: number): FocusState {
  return isRunning(state) ? { ...state, endsAt: null, remaining: timeLeft(state, now) } : state;
}

/** Back to the start of the current phase. */
export function reset(state: FocusState): FocusState {
  return {
    ...state,
    endsAt: null,
    remaining: phaseMinutes(state.phase, state.focusMinutes) * MINUTE,
  };
}

/**
 * Ends the current phase and readies the next one without starting it. A focus session
 * only counts when it ran to the end (`completed`), not when it was skipped.
 */
export function advance(state: FocusState, now: number, completed: boolean): FocusState {
  let { phase, round } = state;
  let today = state.today.day === dayKey(now) ? state.today : { day: dayKey(now), count: 0 };
  if (phase === 'focus') {
    round += 1;
    if (completed) today = { ...today, count: today.count + 1 };
    phase = round >= ROUNDS ? 'long' : 'short';
  } else {
    if (phase === 'long') round = 0;
    phase = 'focus';
  }
  return reset({ ...state, phase, round, today });
}

/** A new focus length applies right away when the timer is not mid-session. */
export function setFocusLength(state: FocusState, focusMinutes: number): FocusState {
  const next = { ...state, focusMinutes };
  return isActive(state) ? next : reset(next);
}

/** Sessions finished today, ignoring a count left over from an earlier day. */
export const sessionsToday = (state: FocusState, now: number) =>
  state.today.day === dayKey(now) ? state.today.count : 0;

export function formatClock(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Restores a saved timer, or starts fresh when the saved value is missing or malformed. */
export function readFocus(raw: string | null): FocusState {
  try {
    const value = raw ? (JSON.parse(raw) as Partial<FocusState>) : null;
    if (
      value &&
      (value.phase === 'focus' || value.phase === 'short' || value.phase === 'long') &&
      (value.endsAt === null || typeof value.endsAt === 'number') &&
      typeof value.remaining === 'number' &&
      typeof value.round === 'number' &&
      typeof value.focusMinutes === 'number' &&
      typeof value.today?.day === 'string' &&
      typeof value.today.count === 'number'
    )
      return value as FocusState;
  } catch {
    // Fall through to a fresh timer.
  }
  return initialFocus();
}
