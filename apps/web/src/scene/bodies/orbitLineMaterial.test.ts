import { describe, expect, it } from 'vitest';
import { BODY_APPEARANCE } from './bodyCatalog';
import {
  ORBIT_LINE_LOOK,
  createOrbitLineMaterial,
  writeOrbitLineResolution,
} from './orbitLineMaterial';

describe('createOrbitLineMaterial', () => {
  it('draws the planet’s own colour at the shared width and opacity', () => {
    const material = createOrbitLineMaterial('earthMoonBarycenter');
    expect(`#${material.color.getHexString()}`).toBe(BODY_APPEARANCE.earthMoonBarycenter.color);
    expect(material.linewidth).toBe(ORBIT_LINE_LOOK.widthPx);
    expect(material.opacity).toBe(ORBIT_LINE_LOOK.opacity);
    expect(material.transparent).toBe(true);
  });

  // Without it the shader's smoothed alpha is thrown away and the line is a stair-stepped hairline again.
  it('smooths its own edges', () => {
    expect(createOrbitLineMaterial('earthMoonBarycenter').alphaToCoverage).toBe(true);
  });
});

describe('writeOrbitLineResolution', () => {
  // `linewidth` is in CSS pixels, which the shader can only work out from the canvas size.
  it('takes the canvas size in CSS pixels', () => {
    const material = createOrbitLineMaterial('mars');
    writeOrbitLineResolution(material, { width: 1400, height: 723 });
    expect(material.resolution.toArray()).toEqual([1400, 723]);
  });
});
