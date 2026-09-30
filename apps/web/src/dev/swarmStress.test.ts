import { describe, expect, it } from 'vitest';
import { buildSwarmAttributes } from '../scene/swarm/swarmAttributes';
import { createSwarmGeometry, createSwarmTrailGeometry } from '../scene/swarm/swarmMesh';
import { J2000_JD_TDB, THREE_NEO_CATALOG } from '../scene/swarm/swarmTestSupport';
import { replicateSwarmAttributes, swarmStressCopiesFromUrl } from './swarmStress';

const MEAN_ANOMALY_COMPONENT = 1;
const MOTION_STRIDE = 3;

function baseAttributes() {
  return buildSwarmAttributes(THREE_NEO_CATALOG, J2000_JD_TDB);
}

describe('swarmStressCopiesFromUrl', () => {
  it.each([
    ['?swarmStress=4', 4],
    ['?focus=earth&swarmStress=2', 2],
    ['', 1],
    ['?swarmStress=abc', 1],
    ['?swarmStress=0', 1],
    ['?swarmStress=99', 8],
  ])('reads %j as %d copies', (search, copies) => {
    expect(swarmStressCopiesFromUrl(search)).toBe(copies);
  });
});

describe('replicateSwarmAttributes', () => {
  it('returns the input for one copy', () => {
    const attributes = baseAttributes();
    expect(replicateSwarmAttributes(attributes, 1)).toBe(attributes);
  });

  it('tiles every array and multiplies the count', () => {
    const attributes = baseAttributes();
    const replicated = replicateSwarmAttributes(attributes, 4);
    expect(replicated.count).toBe(attributes.count * 4);
    expect(replicated.referenceJdTdb).toBe(attributes.referenceJdTdb);
    for (let copy = 0; copy < 4; copy += 1) {
      const offset = copy * attributes.perihelionAxisAu.length;
      const slice = replicated.perihelionAxisAu.subarray(
        offset,
        offset + attributes.perihelionAxisAu.length,
      );
      expect(slice).toEqual(attributes.perihelionAxisAu);
    }
  });

  it("moves copy k's mean anomalies on by 2π·k/N, wrapped into [0, 2π)", () => {
    const attributes = baseAttributes();
    const replicated = replicateSwarmAttributes(attributes, 4);
    for (let index = 0; index < replicated.count; index += 1) {
      const copy = Math.floor(index / attributes.count);
      const original =
        attributes.motion[(index % attributes.count) * MOTION_STRIDE + MEAN_ANOMALY_COMPONENT] ??
        NaN;
      const shifted = replicated.motion[index * MOTION_STRIDE + MEAN_ANOMALY_COMPONENT] ?? NaN;
      const expected = (original + (2 * Math.PI * copy) / 4) % (2 * Math.PI);
      expect(shifted).toBeGreaterThanOrEqual(0);
      expect(shifted).toBeLessThan(2 * Math.PI);
      expect(shifted).toBeCloseTo(expected, 5);
    }
  });

  it('multiplies the points draw count and the trail instance count', () => {
    const attributes = baseAttributes();
    const replicated = replicateSwarmAttributes(attributes, 4);
    expect(createSwarmGeometry(replicated).getAttribute('position').count).toBe(
      attributes.count * 4,
    );
    expect(createSwarmTrailGeometry(replicated).instanceCount).toBe(attributes.count * 4);
  });
});
