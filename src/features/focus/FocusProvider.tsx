import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { FocusContext, type FocusTimer } from './focus-context';
import {
  advance,
  formatClock,
  isActive,
  isRunning,
  pause,
  readFocus,
  reset,
  sessionsToday,
  setFocusLength,
  start,
  timeLeft,
  type FocusState,
} from './focus-timer';

const STORAGE_KEY = 'folio.focus.v1';

function load(): FocusState {
  try {
    return readFocus(localStorage.getItem(STORAGE_KEY));
  } catch {
    return readFocus(null);
  }
}

/** A soft two-note chime; needs an AudioContext unlocked by an earlier click. */
function chime(audio: AudioContext | null) {
  if (!audio) return;
  const at = audio.currentTime;
  [660, 880].forEach((frequency, i) => {
    const tone = audio.createOscillator(),
      gain = audio.createGain();
    tone.type = 'sine';
    tone.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at + i * 0.22);
    gain.gain.exponentialRampToValueAtTime(0.18, at + i * 0.22 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + i * 0.22 + 0.9);
    tone.connect(gain).connect(audio.destination);
    tone.start(at + i * 0.22);
    tone.stop(at + i * 0.22 + 1);
  });
}

function notify(finished: FocusState['phase']) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (!document.hidden) return;
  new Notification(finished === 'focus' ? 'Focus session done' : 'Break is over', {
    body: finished === 'focus' ? 'Time for a break.' : 'Ready for the next focus session?',
    tag: 'folio-focus',
  });
}

/** The Pomodoro timer lives above the routes, so it keeps running from screen to screen. */
export function FocusProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState(load),
    [now, setNow] = useState(() => Date.now()),
    [panelOpen, setPanelOpen] = useState(false),
    audio = useRef<AudioContext | null>(null),
    stateRef = useRef(state);
  const running = isRunning(state),
    left = timeLeft(state, now);
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The timer still works for this visit.
    }
  }, [state]);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const at = Date.now(),
        current = stateRef.current;
      setNow(at);
      if (current.endsAt === null || current.endsAt > at) return;
      // The phase ran out (perhaps while this tab was closed): ready the next one.
      const next = advance(current, at, true);
      stateRef.current = next;
      setState(next);
      setPanelOpen(true);
      chime(audio.current);
      notify(current.phase);
    };
    const first = setTimeout(tick, 0),
      every = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const title = document.title;
    document.title = `${formatClock(left)} · ${state.phase === 'focus' ? 'Focus' : 'Break'}`;
    return () => {
      document.title = title;
    };
  }, [running, left, state.phase]);

  const value = useMemo<FocusTimer>(
    () => ({
      state,
      left,
      running,
      active: isActive(state),
      today: sessionsToday(state, now),
      panelOpen,
      setPanelOpen(open) {
        setNow(Date.now());
        setPanelOpen(open);
      },
      toggle() {
        const at = Date.now();
        setNow(at);
        if (running) return setState((current) => pause(current, at));
        // Starting is a click, which lets the end-of-session chime play later.
        try {
          audio.current ??= new AudioContext();
          void audio.current.resume();
        } catch {
          // No sound; the notification and panel still announce the end.
        }
        if (typeof Notification !== 'undefined' && Notification.permission === 'default')
          void Notification.requestPermission();
        setState((current) => start(current, at));
      },
      reset: () => setState(reset),
      skip: () => setState((current) => advance(current, Date.now(), false)),
      setLength: (minutes) => setState((current) => setFocusLength(current, minutes)),
    }),
    [state, now, left, running, panelOpen],
  );
  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}
