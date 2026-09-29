import { PLANETS } from '@perihelion/orbit';
import { describe, expect, it } from 'vitest';
import { BODY_APPEARANCE, BODY_IDS, radiusAu } from './bodyCatalog';

describe('body catalog', () => {
  it('lists the Sun and the eight engine planets', () => {
    expect(BODY_IDS).toEqual(['sun', ...PLANETS]);
  });

  it('labels the Earth–Moon barycentre as Earth', () => {
    expect(BODY_APPEARANCE.earthMoonBarycenter.label).toBe('Earth');
  });

  it('converts IAU mean radii to AU', () => {
    expect(radiusAu('earthMoonBarycenter')).toBeCloseTo(4.2588e-5, 8);
    expect(radiusAu('sun')).toBeCloseTo(4.6505e-3, 7);
  });
});
