import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { closeApproachRow } from '../test/closeApproachRow';
import { timeStore } from '../time/timeStore';
import { CloseUp } from './CloseUp';
import { distanceTexts } from './approachFormat';

describe('CloseUp', () => {
  const approach = closeApproachRow();

  it('labels the view illustrative, the closest point with CAD distance and the scale', () => {
    timeStore.scrubTo(approach.approachJdTdb);
    const markup = renderToStaticMarkup(<CloseUp approach={approach} />);
    expect(markup).toContain('FOCUS VIEW · EARTH-CENTRED · ILLUSTRATIVE');
    expect(markup).toContain(`>${distanceTexts(approach.distanceAu).lunar}</text>`);
    expect(markup).toContain('1 LD = 384,400 km');
  });

  it('marks the asteroid during the pass', () => {
    timeStore.scrubTo(approach.approachJdTdb);
    expect(renderToStaticMarkup(<CloseUp approach={approach} />)).toContain(
      'class="close-up-marker"',
    );
  });

  it('has no marker outside the trail window', () => {
    timeStore.scrubTo(approach.approachJdTdb - 1000);
    expect(renderToStaticMarkup(<CloseUp approach={approach} />)).not.toContain('close-up-marker');
  });
});
