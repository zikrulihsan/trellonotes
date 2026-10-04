import { Timer } from 'lucide-react';
import { useFocus } from './focus-context';
import { formatClock } from './focus-timer';

/** The time left, shown in the top bars while a session is under way. */
export function FocusPill() {
  const { state, left, running, active, panelOpen, setPanelOpen } = useFocus();
  if (!active) return null;
  return (
    <button
      className={`focus-pill is-${state.phase} ${running ? '' : 'is-paused'}`}
      onClick={() => setPanelOpen(!panelOpen)}
      aria-expanded={panelOpen}
      title={running ? 'Focus timer' : 'Focus timer · paused'}
    >
      <Timer size={14} />
      <span>{formatClock(left)}</span>
    </button>
  );
}
