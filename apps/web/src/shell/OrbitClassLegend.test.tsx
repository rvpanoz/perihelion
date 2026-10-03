import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SWARM_CLASS_COLORS } from '../scene/swarm/swarmLook';
import { OrbitClassLegend } from './OrbitClassLegend';

const COUNTS = { IEO: 34, ATE: 2_861, APO: 23_910, AMO: 11_607 };
const TOTAL = 38_412;

function legendMarkup(): string {
  return renderToStaticMarkup(<OrbitClassLegend count={TOTAL} orbitClassCounts={COUNTS} />);
}

describe('OrbitClassLegend', () => {
  it('names the classes from the Sun outwards: Atira, Aten, Apollo, Amor', () => {
    const names = [...legendMarkup().matchAll(/class="legend-name">(\w+)</g)].map(
      (match) => match[1],
    );
    expect(names).toEqual(['Atira', 'Aten', 'Apollo', 'Amor']);
  });

  it("colours each class with the swarm's own colour, in the same order", () => {
    const colours = [...legendMarkup().matchAll(/background:(#[0-9a-f]{6})/g)].map(
      (match) => match[1],
    );
    expect(colours).toEqual([...SWARM_CLASS_COLORS]);
  });

  it("shows each class's count, grouped in thousands", () => {
    const counts = [...legendMarkup().matchAll(/class="legend-count mono">([\d,]+)</g)].map(
      (match) => match[1],
    );
    expect(counts).toEqual(['34', '2,861', '23,910', '11,607']);
  });

  it('heads the legend with the catalog count, which the class counts add up to', () => {
    expect(Object.values(COUNTS).reduce((sum, count) => sum + count, 0)).toBe(TOTAL);
    expect(legendMarkup()).toContain('38,412 objects');
  });

  it('is a labelled region with no controls', () => {
    const markup = legendMarkup();
    expect(markup).toMatch(/<section[^>]*aria-labelledby="[^"]+"/);
    expect(markup).not.toMatch(/<(button|input|select)/);
  });
});
