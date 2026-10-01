import type { CloseApproach } from '@perihelion/data';
import { useTimeReadout } from '../time/useTimeReadout';
import { countdownParts } from './approachCardModel';

export interface CountdownProps {
  approach: CloseApproach;
}

/** The only part of the card that changes with the clock, so the only part that re-renders at the readout's 4 Hz. */
export function Countdown({ approach }: CountdownProps) {
  const { jdTdb } = useTimeReadout();
  const { before, duration, after } = countdownParts(jdTdb - approach.approachJdTdb);
  return (
    <p className="countdown">
      {before}
      {duration && (
        <>
          {' '}
          <b className="mono">{duration}</b>
        </>
      )}
      {after && ` ${after}`}
    </p>
  );
}
