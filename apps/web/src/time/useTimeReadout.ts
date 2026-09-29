import { useEffect, useState } from 'react';
import type { TimeState } from './timeController';
import { timeStore } from './timeStore';

/** 4 Hz is enough for a date readout; the scene itself never waits on React. */
const READOUT_INTERVAL_MS = 250;

export function useTimeReadout(): TimeState {
  const [readout, setReadout] = useState<TimeState>(() => ({ ...timeStore.state }));
  useEffect(() => {
    const refresh = () => setReadout({ ...timeStore.state });
    const unsubscribe = timeStore.subscribe(refresh);
    const interval = window.setInterval(refresh, READOUT_INTERVAL_MS);
    return () => {
      unsubscribe();
      window.clearInterval(interval);
    };
  }, []);
  return readout;
}
