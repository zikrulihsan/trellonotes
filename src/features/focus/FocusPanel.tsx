import { Pause, Play, RotateCcw, SkipForward, Timer, X } from 'lucide-react';
import { useFocus } from './focus-context';
import { FOCUS_LENGTHS, ROUNDS, formatClock, phaseMinutes } from './focus-timer';

const PHASE_LABEL = { focus: 'Focus', short: 'Short break', long: 'Long break' } as const;

/** The Pomodoro timer card, floating in the corner of every screen. */
export function FocusPanel() {
  const {
    state,
    left,
    running,
    active,
    today: done,
    panelOpen,
    setPanelOpen,
    toggle,
    reset,
    skip,
    setLength,
  } = useFocus();
  if (!panelOpen) return null;
  const total = phaseMinutes(state.phase, state.focusMinutes) * 60_000;
  const progress = Math.min(1, Math.max(0, 1 - left / total));
  const radius = 62,
    circumference = 2 * Math.PI * radius;
  const startLabel = active ? 'Resume' : state.phase === 'focus' ? 'Start focus' : 'Start break';
  return (
    <section className={`focus-panel is-${state.phase}`} aria-label="Focus timer">
      <header className="focus-panel-head">
        <span className="focus-phase">
          <Timer size={15} />
          {PHASE_LABEL[state.phase]}
          {state.phase === 'focus' && (
            <span className="focus-round">
              {Math.min(state.round + 1, ROUNDS)} of {ROUNDS}
            </span>
          )}
        </span>
        <button
          className="icon-button"
          aria-label="Hide focus timer"
          title={running ? 'Hide (the timer keeps running)' : 'Hide'}
          onClick={() => setPanelOpen(false)}
        >
          <X size={16} />
        </button>
      </header>
      <div className="focus-dial">
        <svg viewBox="0 0 140 140" aria-hidden="true">
          <circle className="focus-track" cx="70" cy="70" r={radius} />
          <circle
            className="focus-progress"
            cx="70"
            cy="70"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
          />
        </svg>
        <span className="focus-clock" role="timer" aria-live="off">
          {formatClock(left)}
        </span>
      </div>
      <div className="focus-controls">
        <button
          className="focus-side"
          onClick={reset}
          disabled={!active}
          aria-label="Restart this session"
          title="Restart this session"
        >
          <RotateCcw size={16} />
        </button>
        <button className="focus-main" onClick={toggle}>
          {running ? <Pause size={16} /> : <Play size={16} />}
          {running ? 'Pause' : startLabel}
        </button>
        <button
          className="focus-side"
          onClick={skip}
          aria-label={state.phase === 'focus' ? 'Skip to break' : 'Skip break'}
          title={state.phase === 'focus' ? 'Skip to break' : 'Skip break'}
        >
          <SkipForward size={16} />
        </button>
      </div>
      <div className="focus-lengths" role="group" aria-label="Focus length">
        {FOCUS_LENGTHS.map((minutes) => (
          <button
            key={minutes}
            aria-pressed={state.focusMinutes === minutes}
            onClick={() => setLength(minutes)}
          >
            {minutes} min
          </button>
        ))}
      </div>
      <p className="focus-today">
        {done
          ? `${done} focus ${done === 1 ? 'session' : 'sessions'} today`
          : 'No focus sessions yet today'}
      </p>
    </section>
  );
}
