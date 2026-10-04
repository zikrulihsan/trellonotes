import { createContext, useContext } from 'react';
import type { FocusState } from './focus-timer';

export interface FocusTimer {
  state: FocusState;
  /** Milliseconds left in the current phase, updated every second while running. */
  left: number;
  running: boolean;
  /** Started and not reset: shown in the bars outside the panel. */
  active: boolean;
  /** Focus sessions finished today. */
  today: number;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  toggle: () => void;
  reset: () => void;
  skip: () => void;
  setLength: (minutes: number) => void;
  setRounds: (rounds: number) => void;
}

export const FocusContext = createContext<FocusTimer | null>(null);

export function useFocus(): FocusTimer {
  const value = useContext(FocusContext);
  if (!value) throw new Error('useFocus must be used inside FocusProvider');
  return value;
}
