import { type CadApproach, type LookedUpOrbit, indexCatalogOrbits } from '@perihelion/data';
import { describe, expect, it, vi } from 'vitest';
import { neoCatalogOf } from '../testing/testCatalog.js';
import { MAX_ORBIT_LOOKUPS, attachOrbits } from './approachOrbitJoin.js';

const LOOKED_UP: LookedUpOrbit = {
  orbit: {
    epochJdTdb: 2461200.5,
    eccentricity: 0.6,
    semiMajorAxisAu: 2.7,
    inclinationDeg: 4,
    longitudeOfAscendingNodeDeg: 12,
    argumentOfPerihelionDeg: 250,
    meanAnomalyDeg: 2,
  },
  orbitClass: 'APO',
};

function approach(designation: string): CadApproach {
  return {
    designation,
    fullName: `(${designation})`,
    orbitId: '3',
    approachJdTdb: 2461315.5,
    approachCalendarTdb: '2026-Oct-01 00:00',
    distanceAu: 0.01,
    distanceMinAu: 0.0099,
    distanceMaxAu: 0.0101,
    relativeVelocityKmPerS: 9,
    infinityVelocityKmPerS: 8.9,
    timeUncertainty: '< 00:01',
    absoluteMagnitude: 26,
    diameterKm: null,
    diameterSigmaKm: null,
  };
}

function joinOf(catalogDesignations: readonly string[], approaches: readonly string[]) {
  const warnings: string[] = [];
  return {
    warnings,
    join: {
      approaches: approaches.map(approach),
      catalogOrbits: indexCatalogOrbits(neoCatalogOf(catalogDesignations)),
      lookUpOrbit: vi.fn<(designation: string) => Promise<LookedUpOrbit | null>>(() =>
        Promise.resolve(LOOKED_UP),
      ),
      logger: { warn: (_details: object, message: string) => void warnings.push(message) },
    },
  };
}

describe('attachOrbits', () => {
  it('takes every orbit and class from the catalog when it has them all, with no lookups', async () => {
    const { join } = joinOf(['2026 SY', '433'], ['433', '2026 SY']);
    const rows = await attachOrbits(join);
    expect(join.lookUpOrbit).not.toHaveBeenCalled();
    expect(rows.map((row) => [row.designation, row.orbitClass])).toEqual([
      ['433', 'AMO'],
      ['2026 SY', 'AMO'],
    ]);
    expect(rows[0]?.orbit).toEqual(join.catalogOrbits.get('433')?.orbit);
  });

  it('looks up the one row the catalog lacks, once', async () => {
    const { join } = joinOf(['433'], ['433', '2026 SA17', '2026 SA17']);
    const rows = await attachOrbits(join);
    expect(join.lookUpOrbit.mock.calls).toEqual([['2026 SA17']]);
    expect(rows[1]).toMatchObject({ designation: '2026 SA17', ...LOOKED_UP });
    expect(rows).toHaveLength(3);
  });

  it('drops a row whose lookup finds no usable orbit, says so, and serves the rest', async () => {
    const { join, warnings } = joinOf(['433'], ['433', '2099 ZZ999']);
    join.lookUpOrbit.mockResolvedValueOnce(null);
    const rows = await attachOrbits(join);
    expect(rows.map((row) => row.designation)).toEqual(['433']);
    expect(warnings).toHaveLength(1);
  });

  it('fails when a lookup fails, so a shorter list is never served silently', async () => {
    const { join } = joinOf([], ['2026 SA17']);
    join.lookUpOrbit.mockRejectedValueOnce(new Error('network is off'));
    await expect(attachOrbits(join)).rejects.toThrow('network is off');
  });

  it(`fails before any lookup when more than ${MAX_ORBIT_LOOKUPS} rows need one`, async () => {
    const misses = Array.from({ length: MAX_ORBIT_LOOKUPS + 1 }, (_, i) => `2026 X${i}`);
    const { join } = joinOf([], misses);
    await expect(attachOrbits(join)).rejects.toThrow();
    expect(join.lookUpOrbit).not.toHaveBeenCalled();
  });
});
