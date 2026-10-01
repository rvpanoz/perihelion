import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { closeApproachRow } from '../test/closeApproachRow';
import { timeStore } from '../time/timeStore';
import { Countdown } from './Countdown';

describe('Countdown', () => {
  const approach = closeApproachRow();

  it('reads the clock and sets the duration in bold', () => {
    timeStore.scrubTo(approach.approachJdTdb - 1.5);
    expect(renderToStaticMarkup(<Countdown approach={approach} />)).toBe(
      '<p class="countdown">Closest approach in <b class="mono">1d 12h 00m</b></p>',
    );
  });

  it('puts "ago" after the duration once the approach has passed', () => {
    timeStore.scrubTo(approach.approachJdTdb + 0.25);
    expect(renderToStaticMarkup(<Countdown approach={approach} />)).toBe(
      '<p class="countdown">Closest approach <b class="mono">0d 06h 00m</b> ago</p>',
    );
  });

  it('has no duration at the moment of closest approach', () => {
    timeStore.scrubTo(approach.approachJdTdb);
    expect(renderToStaticMarkup(<Countdown approach={approach} />)).toBe(
      '<p class="countdown">Closest approach now</p>',
    );
  });
});
